import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { createAuth, createLimiter, checkPasscodeStrength } from './auth.mjs';
import { openStore, seedStylists } from './store.mjs';
import { createNotifier, formatOrder, formatBooking } from './notify.mjs';
import {
  HttpError,
  BOOKING_STATUSES,
  ORDER_STATUSES,
  materializeImage,
  parseBookingInput,
  parseOrderInput,
  parsePriceList,
  parseStylists,
  parseProductInput,
  parseSalonServices
} from './validate.mjs';

const seed = JSON.parse(fs.readFileSync(new URL('./seed.json', import.meta.url), 'utf8'));

const SESSION_COOKIE = 'vip_admin';
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin'
};
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json'
};

const round2 = (n) => Math.round(n * 100) / 100;
const newId = (prefix) => `${prefix}-${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;

export async function createApp(config) {
  const say = (...args) => {
    if (!config.silent) console.log(...args);
  };
  const log = (...args) => say(new Date().toISOString(), ...args);

  const store = await openStore({ dataDir: config.dataDir, seed });
  const auth = await createAuth({
    dataDir: config.dataDir,
    initialPassword: config.initialAdminPassword,
    sessionHours: config.sessionHours,
    log: say
  });
  const notifier = createNotifier(config, log);
  const uploadsDir = path.join(config.dataDir, 'uploads');
  const distDir = path.resolve(config.distDir);

  const publicLimiter = createLimiter(config.publicLimit);
  const loginIpLimiter = createLimiter({
    max: config.loginLimit.maxPerIp,
    windowMs: config.loginLimit.windowMs
  });
  const loginAllLimiter = createLimiter({
    max: config.loginLimit.maxTotal,
    windowMs: config.loginLimit.windowMs
  });

  // ------------------------------------------------------------------ helpers

  function clientIp(req) {
    if (config.trustProxy) {
      const parts = String(req.headers['x-forwarded-for'] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      // The proxy appends the address it saw, so the last entry is the one we can trust.
      if (parts.length) return parts[parts.length - 1];
    }
    return req.socket.remoteAddress || 'unknown';
  }

  const isHttps = (req) =>
    Boolean(req.socket.encrypted) ||
    String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';

  function send(res, status, data, extraHeaders = {}) {
    const body = JSON.stringify(data);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
      'Cache-Control': 'no-store',
      ...SECURITY_HEADERS,
      ...extraHeaders
    });
    res.end(body);
  }

  function readJson(req, limit) {
    return new Promise((resolve, reject) => {
      const type = String(req.headers['content-type'] || '').toLowerCase();
      if (!type.startsWith('application/json')) {
        reject(new HttpError(415, 'unsupported_media_type', 'Очаква се JSON.'));
        return;
      }
      let size = 0;
      let tooBig = false;
      const chunks = [];
      req.on('data', (chunk) => {
        if (tooBig) return;
        size += chunk.length;
        if (size > limit) {
          tooBig = true;
          reject(new HttpError(413, 'too_large', 'Заявката е твърде голяма.'));
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => {
        if (tooBig) return;
        if (chunks.length === 0) return resolve({});
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch {
          reject(new HttpError(400, 'bad_json', 'Невалиден JSON.'));
        }
      });
      req.on('error', reject);
    });
  }

  /** Browsers always send Origin on cross-site writes; only our own site (or listed origins) may write. */
  function checkOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return;
    let originHost;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new HttpError(403, 'bad_origin', 'Невалиден произход на заявката.');
    }
    const hosts = [req.headers.host];
    if (config.trustProxy && req.headers['x-forwarded-host']) {
      hosts.push(String(req.headers['x-forwarded-host']).split(',')[0].trim());
    }
    if (hosts.includes(originHost) || config.allowedOrigins.includes(origin)) return;
    throw new HttpError(
      403,
      'bad_origin',
      'Заявката е отхвърлена (различен адрес на сайта). Ако сървърът е зад прокси, препратете оригиналния Host хедър.'
    );
  }

  function limitPublic(req) {
    const key = clientIp(req);
    const state = publicLimiter.peek(key);
    if (!state.allowed) {
      throw new HttpError(429, 'rate_limited', 'Твърде много заявки. Опитайте отново след малко.', {
        retryAfterSec: state.retryAfterSec
      });
    }
    publicLimiter.record(key);
  }

  function sessionCookie(req, token, maxAgeSec) {
    const parts = [
      `${SESSION_COOKIE}=${token}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Strict',
      `Max-Age=${maxAgeSec}`
    ];
    if (isHttps(req)) parts.push('Secure');
    return parts.join('; ');
  }

  function readCookie(req, name) {
    for (const part of String(req.headers.cookie || '').split(';')) {
      const eq = part.indexOf('=');
      if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
    }
    return '';
  }

  const isAdmin = (req) => auth.checkToken(readCookie(req, SESSION_COOKIE));

  function requireAdmin(req) {
    if (!isAdmin(req)) throw new HttpError(401, 'unauthorized', 'Необходим е вход в административния панел.');
  }

  function checkLoginAllowed(req) {
    for (const [limiter, key] of [
      [loginIpLimiter, clientIp(req)],
      [loginAllLimiter, '*']
    ]) {
      const state = limiter.peek(key);
      if (!state.allowed) {
        throw new HttpError(
          429,
          'too_many_attempts',
          `Твърде много неуспешни опити. Опитайте отново след ${Math.ceil(state.retryAfterSec / 60)} мин.`,
          { retryAfterSec: state.retryAfterSec }
        );
      }
    }
  }

  const recordLoginFailure = (req) => {
    loginIpLimiter.record(clientIp(req));
    loginAllLimiter.record('*');
  };

  const catalogResponse = () => ({ catalog: store.state.catalog });
  const decodeId = (raw) => {
    try {
      return decodeURIComponent(raw);
    } catch {
      throw new HttpError(400, 'invalid_input', 'Невалиден идентификатор.');
    }
  };

  // ------------------------------------------------------------------ public API

  async function createOrder(req, res) {
    limitPublic(req);
    const input = parseOrderInput(await readJson(req, 32 * 1024), config);

    const order = await store.transaction((state) => {
      const lines = [];
      const problems = [];
      for (const [productId, quantity] of input.wanted) {
        const product = state.catalog.products.find((p) => p.id === productId);
        if (!product) {
          problems.push({ productId, title: null, available: 0 });
        } else if (product.stock < quantity) {
          problems.push({ productId, title: product.title, available: product.stock });
        } else {
          lines.push({ product, quantity });
        }
      }
      if (problems.length) {
        throw new HttpError(
          409,
          'insufficient_stock',
          'Някои артикули вече не са налични в избраното количество.',
          { problems }
        );
      }

      let subtotal = 0;
      const items = lines.map(({ product, quantity }) => {
        product.stock -= quantity;
        subtotal += product.price * quantity;
        return { productId: product.id, title: product.title, price: product.price, quantity };
      });
      subtotal = round2(subtotal);
      const shipping = subtotal >= config.freeShippingOver ? 0 : config.shippingFee;

      state.counters.order += 1;
      const created = {
        id: `VIP-ORD-${state.counters.order}`,
        createdAt: new Date().toISOString(),
        status: 'new',
        customer: input.customer,
        courier: input.courier,
        paymentMethod: input.paymentMethod,
        items,
        subtotal,
        shipping,
        total: round2(subtotal + shipping),
        restocked: false
      };
      state.orders.push(created);
      return created;
    });

    send(res, 201, {
      order: {
        id: order.id,
        total: order.total,
        subtotal: order.subtotal,
        shipping: order.shipping,
        courier: order.courier,
        name: order.customer.name,
        phone: order.customer.phone
      }
    });
    log(`Order ${order.id} created (${order.total} lv.)`);
    void notifier.notify(formatOrder(order));
  }

  async function createBooking(req, res) {
    limitPublic(req);
    const input = parseBookingInput(await readJson(req, 16 * 1024), seed.stylists, config);

    const booking = await store.transaction((state) => {
      if (input.stylistId !== 'any') {
        const clash = state.bookings.find(
          (b) =>
            b.status !== 'cancelled' &&
            b.stylistId === input.stylistId &&
            b.date === input.date &&
            b.time === input.time
        );
        if (clash) {
          throw new HttpError(
            409,
            'slot_taken',
            'Този час при избрания стилист вече е зает. Моля, изберете друг час или стилист.'
          );
        }
      }
      state.counters.booking += 1;
      const created = {
        id: `VIP-RES-${state.counters.booking}`,
        createdAt: new Date().toISOString(),
        status: 'new',
        service: input.service,
        stylistId: input.stylistId,
        stylistName: input.stylistName,
        date: input.date,
        time: input.time,
        name: input.name,
        phone: input.phone,
        notes: input.notes
      };
      state.bookings.push(created);
      return created;
    });

    send(res, 201, {
      booking: {
        id: booking.id,
        date: booking.date,
        time: booking.time,
        service: booking.service,
        stylistName: booking.stylistName,
        name: booking.name,
        phone: booking.phone
      }
    });
    log(`Booking ${booking.id} created`);
    void notifier.notify(formatBooking(booking));
  }

  // ------------------------------------------------------------------ admin API

  async function adminLogin(req, res) {
    checkLoginAllowed(req);
    const body = await readJson(req, 2048);
    if (!(await auth.verify(body && body.pin))) {
      recordLoginFailure(req);
      log(`Failed admin login from ${clientIp(req)}`);
      throw new HttpError(401, 'invalid_pin', 'Грешен код. Опитайте отново.');
    }
    loginIpLimiter.clear(clientIp(req));
    send(res, 200, { authenticated: true }, {
      'Set-Cookie': sessionCookie(req, auth.issueToken(), config.sessionHours * 3600)
    });
    log('Admin logged in');
  }

  async function adminChangePin(req, res) {
    checkLoginAllowed(req);
    const body = await readJson(req, 2048);
    if (!(await auth.verify(body && body.currentPin))) {
      recordLoginFailure(req);
      throw new HttpError(401, 'invalid_pin', 'Текущият код е грешен.');
    }
    const problem = checkPasscodeStrength(body.newPin);
    if (problem) throw new HttpError(400, 'weak_pin', problem);
    await auth.change(body.newPin);
    log('Admin passcode changed');
    send(res, 200, { ok: true }, {
      'Set-Cookie': sessionCookie(req, auth.issueToken(), config.sessionHours * 3600)
    });
  }

  async function handleAdmin(req, res, pathname) {
    const method = req.method;
    let m;

    if (pathname === '/api/admin/logout' && method === 'POST') {
      return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
    }
    if (pathname === '/api/admin/pin' && method === 'POST') return adminChangePin(req, res);

    if (pathname === '/api/admin/inbox' && method === 'GET') {
      const { orders, bookings } = store.state;
      return send(res, 200, {
        orders: [...orders].reverse().slice(0, 1000),
        bookings: [...bookings].reverse().slice(0, 1000)
      });
    }

    if ((m = /^\/api\/admin\/orders\/([^/]+)$/.exec(pathname))) {
      const id = decodeId(m[1]);
      if (method === 'PATCH') {
        const body = await readJson(req, 2048);
        if (!ORDER_STATUSES.includes(body.status)) throw new HttpError(400, 'invalid_input', 'Невалиден статус.');
        const order = await store.transaction((state) => {
          const found = state.orders.find((o) => o.id === id);
          if (!found) throw new HttpError(404, 'not_found', 'Поръчката не е намерена.');
          if (found.status === 'cancelled' && body.status !== 'cancelled') {
            throw new HttpError(409, 'cancelled_is_final', 'Отказана поръчка не може да бъде възстановена.');
          }
          if (body.status === 'cancelled' && !found.restocked) {
            for (const item of found.items) {
              const product = state.catalog.products.find((p) => p.id === item.productId);
              if (product) product.stock += item.quantity; // put the goods back on the shelf
            }
            found.restocked = true;
          }
          found.status = body.status;
          found.updatedAt = new Date().toISOString();
          return found;
        });
        return send(res, 200, { order, ...catalogResponse() });
      }
      if (method === 'DELETE') {
        await store.transaction((state) => {
          const index = state.orders.findIndex((o) => o.id === id);
          if (index < 0) throw new HttpError(404, 'not_found', 'Поръчката не е намерена.');
          if (!['completed', 'cancelled'].includes(state.orders[index].status)) {
            throw new HttpError(409, 'not_finished', 'Могат да се изтриват само приключени или отказани поръчки.');
          }
          state.orders.splice(index, 1);
        });
        return send(res, 200, { ok: true });
      }
    }

    if ((m = /^\/api\/admin\/bookings\/([^/]+)$/.exec(pathname))) {
      const id = decodeId(m[1]);
      if (method === 'PATCH') {
        const body = await readJson(req, 2048);
        if (!BOOKING_STATUSES.includes(body.status)) throw new HttpError(400, 'invalid_input', 'Невалиден статус.');
        const booking = await store.transaction((state) => {
          const found = state.bookings.find((b) => b.id === id);
          if (!found) throw new HttpError(404, 'not_found', 'Резервацията не е намерена.');
          found.status = body.status;
          found.updatedAt = new Date().toISOString();
          return found;
        });
        return send(res, 200, { booking });
      }
      if (method === 'DELETE') {
        await store.transaction((state) => {
          const index = state.bookings.findIndex((b) => b.id === id);
          if (index < 0) throw new HttpError(404, 'not_found', 'Резервацията не е намерена.');
          if (!['done', 'cancelled', 'no_show'].includes(state.bookings[index].status)) {
            throw new HttpError(409, 'not_finished', 'Могат да се изтриват само приключени или отказани резервации.');
          }
          state.bookings.splice(index, 1);
        });
        return send(res, 200, { ok: true });
      }
    }

    if (pathname === '/api/admin/products' && method === 'POST') {
      const body = await readJson(req, 12 * 1024 * 1024);
      const product = await materializeImage(parseProductInput(body), uploadsDir);
      product.id = newId('prod');
      await store.transaction((state) => {
        state.catalog.products.unshift(product);
      });
      return send(res, 201, catalogResponse());
    }

    if ((m = /^\/api\/admin\/products\/([^/]+)\/stock$/.exec(pathname)) && method === 'PATCH') {
      const id = decodeId(m[1]);
      const { stock } = await readJson(req, 1024);
      if (!Number.isInteger(stock) || stock < 0 || stock > 100_000) {
        throw new HttpError(400, 'invalid_input', 'Невалидна наличност.');
      }
      await store.transaction((state) => {
        const product = state.catalog.products.find((p) => p.id === id);
        if (!product) throw new HttpError(404, 'not_found', 'Продуктът не е намерен.');
        product.stock = stock;
      });
      return send(res, 200, catalogResponse());
    }

    if ((m = /^\/api\/admin\/products\/([^/]+)$/.exec(pathname))) {
      const id = decodeId(m[1]);
      if (method === 'PUT') {
        const body = await readJson(req, 12 * 1024 * 1024);
        const product = await materializeImage(parseProductInput({ ...body, id }), uploadsDir);
        await store.transaction((state) => {
          const index = state.catalog.products.findIndex((p) => p.id === id);
          if (index < 0) throw new HttpError(404, 'not_found', 'Продуктът не е намерен.');
          state.catalog.products[index] = product;
        });
        return send(res, 200, catalogResponse());
      }
      if (method === 'DELETE') {
        await store.transaction((state) => {
          const index = state.catalog.products.findIndex((p) => p.id === id);
          if (index < 0) throw new HttpError(404, 'not_found', 'Продуктът не е намерен.');
          state.catalog.products.splice(index, 1);
        });
        return send(res, 200, catalogResponse());
      }
    }

    if (pathname === '/api/admin/pricelist' && method === 'PUT') {
      const body = await readJson(req, 512 * 1024);
      const items = parsePriceList(body.items);
      await store.transaction((state) => {
        state.catalog.priceList = items;
      });
      return send(res, 200, catalogResponse());
    }

    if (pathname === '/api/admin/services' && method === 'PUT') {
      const body = await readJson(req, 512 * 1024);
      const items = parseSalonServices(body.items);
      await store.transaction((state) => {
        state.catalog.salonServices = items;
      });
      return send(res, 200, catalogResponse());
    }

    if (pathname === '/api/admin/stylists' && method === 'PUT') {
      const body = await readJson(req, 64 * 1024);
      const items = parseStylists(body.items);
      await store.transaction((state) => {
        state.catalog.stylists = items;
      });
      return send(res, 200, catalogResponse());
    }

    if (pathname === '/api/admin/catalog/import' && method === 'POST') {
      const body = await readJson(req, 40 * 1024 * 1024);
      const next = {};
      if (body.products !== undefined) {
        if (!Array.isArray(body.products) || body.products.length > 500) {
          throw new HttpError(400, 'invalid_input', 'Невалиден списък с продукти.');
        }
        const seen = new Set();
        next.products = [];
        for (const raw of body.products) {
          const product = await materializeImage(parseProductInput(raw), uploadsDir);
          if (!product.id || seen.has(product.id)) product.id = newId('prod');
          seen.add(product.id);
          next.products.push(product);
        }
      }
      if (body.priceList !== undefined) next.priceList = parsePriceList(body.priceList);
      if (body.salonServices !== undefined) next.salonServices = parseSalonServices(body.salonServices);
      if (body.stylists !== undefined) next.stylists = parseStylists(body.stylists);
      if (Object.keys(next).length === 0) throw new HttpError(400, 'invalid_input', 'Файлът не съдържа данни за импорт.');
      await store.transaction((state) => {
        Object.assign(state.catalog, next);
      });
      return send(res, 200, catalogResponse());
    }

    if (pathname === '/api/admin/catalog/reset' && method === 'POST') {
      await store.transaction((state) => {
        state.catalog = {
          products: structuredClone(seed.products),
          priceList: structuredClone(seed.priceList),
          salonServices: structuredClone(seed.salonServices),
          stylists: seedStylists(seed)
        };
      });
      return send(res, 200, catalogResponse());
    }

    throw new HttpError(404, 'not_found', 'Не е намерено.');
  }

  async function handleApi(req, res, url) {
    const { pathname } = url;
    const method = req.method;
    if (method !== 'GET' && method !== 'HEAD') checkOrigin(req);

    if (pathname === '/api/health' && method === 'GET') return send(res, 200, { ok: true });

    if (pathname === '/api/catalog' && method === 'GET') {
      return send(res, 200, { ...store.state.catalog, updatedAt: store.state.updatedAt });
    }
    if (pathname === '/api/orders' && method === 'POST') return createOrder(req, res);
    if (pathname === '/api/bookings' && method === 'POST') return createBooking(req, res);

    if (pathname === '/api/admin/login' && method === 'POST') return adminLogin(req, res);
    if (pathname === '/api/admin/session' && method === 'GET') {
      return send(res, 200, { authenticated: isAdmin(req) });
    }
    if (pathname.startsWith('/api/admin/')) {
      requireAdmin(req);
      return handleAdmin(req, res, pathname);
    }
    throw new HttpError(404, 'not_found', 'Не е намерено.');
  }

  // ------------------------------------------------------------------ static files

  const gzipCache = new Map();

  async function serveFile(req, res, filePath, { immutable = false } = {}) {
    let stat;
    try {
      stat = await fsp.stat(filePath);
    } catch {
      return false;
    }
    if (!stat.isFile()) return false;

    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
    const headers = {
      'Content-Type': type,
      ETag: etag,
      'Last-Modified': stat.mtime.toUTCString(),
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      ...SECURITY_HEADERS
    };
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers);
      res.end();
      return true;
    }

    const compressible = /^(text\/|application\/(json|xml)|image\/svg)/.test(type);
    if (compressible) headers.Vary = 'Accept-Encoding';
    const wantsGzip =
      compressible &&
      /\bgzip\b/.test(String(req.headers['accept-encoding'] || '')) &&
      stat.size > 1024 &&
      stat.size < 5 * 1024 * 1024;

    if (wantsGzip) {
      let entry = gzipCache.get(filePath);
      if (!entry || entry.etag !== etag) {
        entry = { etag, body: zlib.gzipSync(await fsp.readFile(filePath)) };
        gzipCache.set(filePath, entry);
      }
      headers['Content-Encoding'] = 'gzip';
      headers['Content-Length'] = entry.body.length;
      res.writeHead(200, headers);
      res.end(req.method === 'HEAD' ? undefined : entry.body);
      return true;
    }

    headers['Content-Length'] = stat.size;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') res.end();
    else fs.createReadStream(filePath).pipe(res);
    return true;
  }

  async function serveStatic(req, res, pathname) {
    let rel;
    try {
      rel = decodeURIComponent(pathname);
    } catch {
      throw new HttpError(400, 'invalid_input', 'Невалиден адрес.');
    }
    // No hidden files (.env, .htaccess ...) and no NUL bytes.
    if (rel.includes('\0') || rel.split('/').some((seg) => seg.startsWith('.'))) {
      throw new HttpError(404, 'not_found', 'Не е намерено.');
    }
    const target = path.resolve(distDir, '.' + rel);
    if (target !== distDir && !target.startsWith(distDir + path.sep)) {
      throw new HttpError(404, 'not_found', 'Не е намерено.');
    }
    const file = rel.endsWith('/') ? path.join(target, 'index.html') : target;
    if (await serveFile(req, res, file, { immutable: rel.startsWith('/assets/') })) return;

    // Single-page app: unknown paths without a file extension get the app shell.
    if (!path.extname(rel) && (await serveFile(req, res, path.join(distDir, 'index.html')))) return;

    if (!fs.existsSync(path.join(distDir, 'index.html'))) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
      res.end('The website has not been built yet. Run "npm run build" and restart the server.');
      return;
    }
    throw new HttpError(404, 'not_found', 'Не е намерено.');
  }

  // ------------------------------------------------------------------ server

  const server = http.createServer(async (req, res) => {
    try {
      let url;
      try {
        url = new URL(req.url, 'http://localhost');
      } catch {
        throw new HttpError(400, 'invalid_input', 'Невалиден адрес.');
      }
      if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        throw new HttpError(405, 'method_not_allowed', 'Методът не е позволен.');
      }
      const upload = /^\/uploads\/([a-f0-9]{24}\.(?:jpg|png|webp))$/.exec(url.pathname);
      if (upload) {
        if (await serveFile(req, res, path.join(uploadsDir, upload[1]), { immutable: true })) return;
        throw new HttpError(404, 'not_found', 'Не е намерено.');
      }
      return await serveStatic(req, res, url.pathname);
    } catch (err) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      if (err instanceof HttpError) {
        const headers = err.extra.retryAfterSec ? { 'Retry-After': String(err.extra.retryAfterSec) } : {};
        send(res, err.status, { error: err.code, message: err.message, ...err.extra }, headers);
        return;
      }
      log('Unhandled error:', err);
      send(res, 500, { error: 'server_error', message: 'Вътрешна грешка на сървъра.' });
    }
  });
  server.requestTimeout = 120_000;
  server.headersTimeout = 20_000;

  return {
    server,
    store,
    auth,
    config,
    notifier,
    listen: (port = config.port, host = config.host) =>
      new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          server.off('error', reject);
          resolve(server.address());
        });
      }),
    async close() {
      await new Promise((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections?.();
      });
      await store.flush();
    }
  };
}
