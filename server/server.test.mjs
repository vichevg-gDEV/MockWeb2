import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';

const PASSCODE = 'test-passcode-1';
const cleanups = [];
after(async () => {
  for (const fn of cleanups) await fn();
});

async function startApp(overrides = {}, dir = null) {
  const dataDir = dir || fs.mkdtempSync(path.join(os.tmpdir(), 'vip-test-'));
  const config = loadConfig(
    {},
    {
      dataDir,
      distDir: path.join(dataDir, 'dist'),
      initialAdminPassword: PASSCODE,
      silent: true,
      publicLimit: { max: 1000, windowMs: 60_000 },
      ...overrides
    }
  );
  const app = await createApp(config);
  const address = await app.listen(0, '127.0.0.1');
  const base = `http://127.0.0.1:${address.port}`;

  async function req(method, url, body, { cookie, headers = {} } = {}) {
    const res = await fetch(base + url, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not JSON */
    }
    return { status: res.status, json, text, headers: res.headers };
  }

  async function login(pin = PASSCODE) {
    const res = await req('POST', '/api/admin/login', { pin });
    const set = res.headers.getSetCookie()[0] || '';
    return { res, cookie: set.split(';')[0] };
  }

  const handle = { app, base, dataDir, req, login, close: () => app.close() };
  cleanups.push(handle.close);
  return handle;
}

const order = (items, extra = {}) => ({
  name: 'Ана Петрова',
  phone: '+359 888 123 456',
  city: 'Варна',
  address: 'ул. Примерна 1',
  courier: 'econt',
  paymentMethod: 'cod',
  items,
  ...extra
});

const tomorrow = () => new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10);
const booking = (extra = {}) => ({
  service: 'Подстригване',
  stylist: 'silvia',
  date: tomorrow(),
  time: '11:00',
  name: 'Мила Иванова',
  phone: '0888 765 432',
  notes: '',
  agreedToTerms: true,
  ...extra
});

describe('catalog and orders', () => {
  test('serves the seeded catalog', async () => {
    const s = await startApp();
    const r = await s.req('GET', '/api/catalog');
    assert.equal(r.status, 200);
    assert.ok(r.json.products.length > 5);
    assert.ok(r.json.priceList.length > 0);
    assert.ok(r.json.salonServices.length > 0);
  });

  test('order deducts stock, uses server prices and free shipping rule', async () => {
    const s = await startApp();
    const before = (await s.req('GET', '/api/catalog')).json.products.find((p) => p.id === 'prod-1');
    // price in the request is ignored
    const r = await s.req('POST', '/api/orders', order([{ productId: 'prod-1', quantity: 1, price: 1 }]));
    assert.equal(r.status, 201);
    assert.match(r.json.order.id, /^VIP-ORD-\d+$/);
    assert.equal(r.json.order.subtotal, before.price);
    assert.equal(r.json.order.shipping, before.price >= 150 ? 0 : 7);
    const after = (await s.req('GET', '/api/catalog')).json.products.find((p) => p.id === 'prod-1');
    assert.equal(after.stock, before.stock - 1);
  });

  test('two customers cannot buy the same last item (parallel orders)', async () => {
    const s = await startApp();
    const stock = (await s.req('GET', '/api/catalog')).json.products.find((p) => p.id === 'prod-1').stock;
    const results = await Promise.all(
      Array.from({ length: stock + 6 }, () => s.req('POST', '/api/orders', order([{ productId: 'prod-1', quantity: 1 }])))
    );
    assert.equal(results.filter((r) => r.status === 201).length, stock);
    assert.equal(results.filter((r) => r.status === 409).length, 6);
    const after = (await s.req('GET', '/api/catalog')).json.products.find((p) => p.id === 'prod-1');
    assert.equal(after.stock, 0);
  });

  test('insufficient stock returns details and changes nothing', async () => {
    const s = await startApp();
    const catalog = (await s.req('GET', '/api/catalog')).json.products;
    const r = await s.req(
      'POST',
      '/api/orders',
      order([
        { productId: catalog[0].id, quantity: 1 },
        { productId: catalog[1].id, quantity: catalog[1].stock + 1 }
      ])
    );
    assert.equal(r.status, 409);
    assert.equal(r.json.error, 'insufficient_stock');
    assert.equal(r.json.problems[0].productId, catalog[1].id);
    const after = (await s.req('GET', '/api/catalog')).json.products;
    assert.equal(after[0].stock, catalog[0].stock, 'first item must not be deducted');
  });

  test('rejects invalid orders', async () => {
    const s = await startApp();
    const good = [{ productId: 'prod-2', quantity: 1 }];
    const cases = [
      order(good, { phone: 'abc' }),
      order(good, { name: '' }),
      order(good, { courier: 'dhl' }),
      order(good, { paymentMethod: 'card' }),
      order(good, { email: 'not-an-email' }),
      order([]),
      order([{ productId: 'prod-2', quantity: 0 }]),
      order([{ productId: 'prod-2', quantity: 1.5 }]),
      order([{ productId: 'nope', quantity: 1 }]) // unknown product -> 409
    ];
    for (const body of cases) {
      const r = await s.req('POST', '/api/orders', body);
      assert.ok([400, 409].includes(r.status), `expected rejection, got ${r.status} for ${JSON.stringify(body).slice(0, 80)}`);
    }
    const r = await s.req('POST', '/api/orders', 'not json at all', { headers: { 'Content-Type': 'text/plain' } });
    assert.equal(r.status, 415);
  });

  test('public requests are rate limited', async () => {
    const s = await startApp({ publicLimit: { max: 3, windowMs: 60_000 } });
    const statuses = [];
    for (let i = 0; i < 5; i++) statuses.push((await s.req('POST', '/api/orders', order([]))).status);
    assert.deepEqual(statuses.slice(0, 3), [400, 400, 400]);
    assert.deepEqual(statuses.slice(3), [429, 429]);
  });
});

describe('bookings', () => {
  test('creates a booking and blocks the same stylist and slot', async () => {
    const s = await startApp();
    const a = await s.req('POST', '/api/bookings', booking());
    assert.equal(a.status, 201);
    assert.match(a.json.booking.id, /^VIP-RES-\d+$/);
    assert.equal(a.json.booking.stylistName, 'Силвия Георгиева');
    const b = await s.req('POST', '/api/bookings', booking({ name: 'Друга Клиентка' }));
    assert.equal(b.status, 409);
    assert.equal(b.json.error, 'slot_taken');
    const other = await s.req('POST', '/api/bookings', booking({ stylist: 'maria' }));
    assert.equal(other.status, 201);
  });

  test('rejects past dates, bad input and missing consent', async () => {
    const s = await startApp();
    assert.equal((await s.req('POST', '/api/bookings', booking({ date: '2000-01-01' }))).status, 400);
    assert.equal((await s.req('POST', '/api/bookings', booking({ date: '2099-02-31' }))).status, 400);
    assert.equal((await s.req('POST', '/api/bookings', booking({ time: '25:99' }))).status, 400);
    assert.equal((await s.req('POST', '/api/bookings', booking({ time: '22:00' }))).status, 400, 'outside opening hours');
    assert.equal((await s.req('POST', '/api/bookings', booking({ time: '09:30' }))).status, 400, 'before opening');
    assert.equal((await s.req('POST', '/api/bookings', booking({ stylist: 'hacker' }))).status, 400);
    assert.equal((await s.req('POST', '/api/bookings', booking({ agreedToTerms: false }))).status, 400);
    assert.equal((await s.req('POST', '/api/bookings', booking({ service: '' }))).status, 400);
  });
});

describe('admin authentication', () => {
  test('admin endpoints require a login', async () => {
    const s = await startApp();
    for (const [method, url] of [
      ['GET', '/api/admin/inbox'],
      ['POST', '/api/admin/products'],
      ['PUT', '/api/admin/pricelist'],
      ['POST', '/api/admin/catalog/reset'],
      ['PATCH', '/api/admin/orders/VIP-ORD-1001']
    ]) {
      const r = await s.req(method, url, method === 'GET' ? undefined : {});
      assert.equal(r.status, 401, `${method} ${url}`);
    }
    assert.equal((await s.req('GET', '/api/admin/session')).json.authenticated, false);
  });

  test('the old hard-coded PINs do not work', async () => {
    const s = await startApp();
    assert.equal((await s.login('1234')).res.status, 401);
    assert.equal((await s.login('vip2026')).res.status, 401);
    assert.equal((await s.login('vipadmin2026')).res.status, 401);
  });

  test('correct passcode gives an HttpOnly SameSite cookie that works', async () => {
    const s = await startApp();
    const { res, cookie } = await s.login();
    assert.equal(res.status, 200);
    const raw = res.headers.getSetCookie()[0];
    assert.match(raw, /HttpOnly/);
    assert.match(raw, /SameSite=Strict/);
    assert.equal((await s.req('GET', '/api/admin/session', undefined, { cookie })).json.authenticated, true);
    assert.equal((await s.req('GET', '/api/admin/inbox', undefined, { cookie })).status, 200);
    const out = await s.req('POST', '/api/admin/logout', {}, { cookie });
    assert.match(out.headers.getSetCookie()[0], /Max-Age=0/);
  });

  test('cookie is marked Secure behind an HTTPS proxy', async () => {
    const s = await startApp();
    const res = await s.req('POST', '/api/admin/login', { pin: PASSCODE }, { headers: { 'X-Forwarded-Proto': 'https' } });
    assert.match(res.headers.getSetCookie()[0], /Secure/);
  });

  test('forged or tampered cookies are rejected', async () => {
    const s = await startApp();
    const { cookie } = await s.login();
    const tampered = cookie.slice(0, -3) + 'AAA';
    assert.equal((await s.req('GET', '/api/admin/inbox', undefined, { cookie: tampered })).status, 401);
    assert.equal((await s.req('GET', '/api/admin/inbox', undefined, { cookie: 'vip_admin=abc.def' })).status, 401);
  });

  test('too many wrong passcodes locks login (even for the right one)', async () => {
    const s = await startApp();
    for (let i = 0; i < 5; i++) assert.equal((await s.login('wrong-' + i)).res.status, 401);
    const locked = await s.login(PASSCODE);
    assert.equal(locked.res.status, 429);
    assert.ok(Number(locked.res.headers.get('retry-after')) > 0);
  });

  test('changing the passcode logs out old sessions and enforces strength', async () => {
    const s = await startApp();
    const { cookie } = await s.login();
    assert.equal((await s.req('POST', '/api/admin/pin', { currentPin: PASSCODE, newPin: '1234' }, { cookie })).status, 400);
    assert.equal((await s.req('POST', '/api/admin/pin', { currentPin: 'wrong', newPin: 'new-passcode-9' }, { cookie })).status, 401);
    const ok = await s.req('POST', '/api/admin/pin', { currentPin: PASSCODE, newPin: 'new-passcode-9' }, { cookie });
    assert.equal(ok.status, 200);
    assert.equal((await s.req('GET', '/api/admin/inbox', undefined, { cookie })).status, 401, 'old session invalid');
    assert.equal((await s.login(PASSCODE)).res.status, 401);
    assert.equal((await s.login('new-passcode-9')).res.status, 200);
  });

  test('a random passcode is generated when none is configured, and stored only hashed', async () => {
    const s = await startApp({ initialAdminPassword: '' });
    const file = fs.readFileSync(path.join(s.dataDir, 'admin.json'), 'utf8');
    assert.match(file, /"hash":"scrypt\$/);
    assert.ok(!file.includes(PASSCODE));
  });

  test('cross-site writes are refused', async () => {
    const s = await startApp();
    const r = await s.req('POST', '/api/orders', order([{ productId: 'prod-2', quantity: 1 }]), {
      headers: { Origin: 'https://evil.example' }
    });
    assert.equal(r.status, 403);
    const same = await s.req('POST', '/api/orders', order([{ productId: 'prod-2', quantity: 1 }]), {
      headers: { Origin: s.base }
    });
    assert.equal(same.status, 201);
  });
});

describe('admin management', () => {
  test('inbox shows orders and bookings; cancelling an order restocks', async () => {
    const s = await startApp();
    const { cookie } = await s.login();
    const before = (await s.req('GET', '/api/catalog')).json.products.find((p) => p.id === 'prod-2').stock;
    const o = (await s.req('POST', '/api/orders', order([{ productId: 'prod-2', quantity: 2 }]))).json.order;
    await s.req('POST', '/api/bookings', booking());

    const inbox = (await s.req('GET', '/api/admin/inbox', undefined, { cookie })).json;
    assert.equal(inbox.orders[0].id, o.id);
    assert.equal(inbox.orders[0].customer.address, 'ул. Примерна 1');
    assert.equal(inbox.bookings.length, 1);

    const cancel = await s.req('PATCH', `/api/admin/orders/${o.id}`, { status: 'cancelled' }, { cookie });
    assert.equal(cancel.status, 200);
    const stock = cancel.json.catalog.products.find((p) => p.id === 'prod-2').stock;
    assert.equal(stock, before);
    // cancelling twice must not restock twice
    await s.req('PATCH', `/api/admin/orders/${o.id}`, { status: 'cancelled' }, { cookie });
    assert.equal((await s.req('GET', '/api/catalog')).json.products.find((p) => p.id === 'prod-2').stock, before);
    // cancelled is final
    assert.equal((await s.req('PATCH', `/api/admin/orders/${o.id}`, { status: 'new' }, { cookie })).status, 409);
    // invalid status
    assert.equal((await s.req('PATCH', `/api/admin/orders/${o.id}`, { status: 'bogus' }, { cookie })).status, 400);
    // only finished orders can be deleted
    assert.equal((await s.req('DELETE', `/api/admin/orders/${o.id}`, undefined, { cookie })).status, 200);
  });

  test('stock, product create/update/delete are shared with every visitor', async () => {
    const s = await startApp();
    const { cookie } = await s.login();

    const set = await s.req('PATCH', '/api/admin/products/prod-1/stock', { stock: 42 }, { cookie });
    assert.equal(set.status, 200);
    assert.equal((await s.req('GET', '/api/catalog')).json.products.find((p) => p.id === 'prod-1').stock, 42);
    assert.equal((await s.req('PATCH', '/api/admin/products/prod-1/stock', { stock: -1 }, { cookie })).status, 400);

    const created = await s.req(
      'POST',
      '/api/admin/products',
      {
        title: 'Нов продукт',
        category: 'tools',
        categoryLabel: 'Уреди',
        description: 'Тест',
        price: 19.99,
        specs: '1 бр.',
        stock: 5,
        image: './src/assets/images/product_slavic_hair_1790362396264.jpg',
        details: ['a', 'b']
      },
      { cookie }
    );
    assert.equal(created.status, 201);
    const added = created.json.catalog.products[0];
    assert.equal(added.title, 'Нов продукт');
    assert.match(added.id, /^prod-/);

    const upd = await s.req('PUT', `/api/admin/products/${added.id}`, { ...added, title: 'Преименуван', stock: 7 }, { cookie });
    assert.equal(upd.json.catalog.products[0].title, 'Преименуван');
    assert.equal(upd.json.catalog.products[0].stock, 7);

    const del = await s.req('DELETE', `/api/admin/products/${added.id}`, undefined, { cookie });
    assert.ok(!del.json.catalog.products.some((p) => p.id === added.id));

    // invalid product data is rejected
    const bad = await s.req('POST', '/api/admin/products', { title: '', category: 'x', price: -5, stock: 1 }, { cookie });
    assert.equal(bad.status, 400);
  });

  test('uploaded photos are stored as files and served', async () => {
    const s = await startApp();
    const { cookie } = await s.login();
    // 1x1 PNG
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const r = await s.req(
      'POST',
      '/api/admin/products',
      { title: 'Със снимка', category: 'tools', price: 10, stock: 1, image: 'data:image/png;base64,' + png.toString('base64') },
      { cookie }
    );
    assert.equal(r.status, 201);
    const image = r.json.catalog.products[0].image;
    assert.match(image, /^\/uploads\/[a-f0-9]{24}\.png$/);
    const file = await fetch(s.base + image);
    assert.equal(file.status, 200);
    assert.equal(file.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await file.arrayBuffer()), png);

    // not an image -> rejected
    const fake = await s.req(
      'POST',
      '/api/admin/products',
      { title: 'Фалшива', category: 'tools', price: 10, stock: 1, image: 'data:image/png;base64,' + Buffer.from('<script>alert(1)</script>').toString('base64') },
      { cookie }
    );
    assert.equal(fake.status, 400);
    // unsafe image reference -> rejected
    const unsafe = await s.req(
      'POST',
      '/api/admin/products',
      { title: 'Опасна', category: 'tools', price: 10, stock: 1, image: 'javascript:alert(1)' },
      { cookie }
    );
    assert.equal(unsafe.status, 400);
  });

  test('price list, service cards, import and reset', async () => {
    const s = await startApp();
    const { cookie } = await s.login();
    const pl = await s.req('PUT', '/api/admin/pricelist', { items: [{ service: 'Тест услуга', price: '50 лв.', duration: '30 мин.' }] }, { cookie });
    assert.equal(pl.json.catalog.priceList.length, 1);
    assert.ok(pl.json.catalog.priceList[0].id);
    assert.equal((await s.req('PUT', '/api/admin/pricelist', { items: 'nope' }, { cookie })).status, 400);

    const sv = await s.req(
      'PUT',
      '/api/admin/services',
      { items: [{ id: 'srv-x', title: 'Карта', startingPrice: 'От 10 лв.', iconClass: 'fa-scissors', description: 'd', category: 'extensions' }] },
      { cookie }
    );
    assert.equal(sv.json.catalog.salonServices[0].id, 'srv-x');
    assert.equal(
      (await s.req('PUT', '/api/admin/services', { items: [{ title: 'x', startingPrice: '1', iconClass: '"><script>' }] }, { cookie })).status,
      400
    );

    const imp = await s.req(
      'POST',
      '/api/admin/catalog/import',
      { products: [{ id: 'p-a', title: 'A', category: 'tools', price: 1, stock: 2 }, { id: 'p-a', title: 'B', category: 'tools', price: 1, stock: 3 }] },
      { cookie }
    );
    assert.equal(imp.status, 200);
    assert.equal(imp.json.catalog.products.length, 2);
    assert.notEqual(imp.json.catalog.products[0].id, imp.json.catalog.products[1].id, 'duplicate ids are fixed');
    assert.equal((await s.req('POST', '/api/admin/catalog/import', {}, { cookie })).status, 400);

    const reset = await s.req('POST', '/api/admin/catalog/reset', {}, { cookie });
    assert.ok(reset.json.catalog.products.length > 5);
  });
});

describe('persistence', () => {
  test('orders, stock and the admin passcode survive a restart', async () => {
    const a = await startApp();
    await a.req('POST', '/api/orders', order([{ productId: 'prod-1', quantity: 1 }]));
    const stockAfter = (await a.req('GET', '/api/catalog')).json.products.find((p) => p.id === 'prod-1').stock;
    await a.close();

    const b = await startApp({ initialAdminPassword: '' }, a.dataDir);
    assert.equal((await b.req('GET', '/api/catalog')).json.products.find((p) => p.id === 'prod-1').stock, stockAfter);
    const { cookie, res } = await b.login(PASSCODE);
    assert.equal(res.status, 200);
    const inbox = (await b.req('GET', '/api/admin/inbox', undefined, { cookie })).json;
    assert.equal(inbox.orders.length, 1);
    // next order id continues the sequence
    const next = await b.req('POST', '/api/orders', order([{ productId: 'prod-2', quantity: 1 }]));
    assert.equal(next.json.order.id, 'VIP-ORD-1002');
  });

  test('refuses to start on a corrupted database instead of wiping it', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vip-test-'));
    fs.writeFileSync(path.join(dir, 'store.json'), '{ this is not json');
    await assert.rejects(startApp({}, dir), /Cannot read/);
  });
});

describe('notifications', () => {
  test('orders and bookings are pushed to the configured webhook', async () => {
    const received = [];
    const hook = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        received.push(body);
        res.end('ok');
      });
    });
    await new Promise((r) => hook.listen(0, '127.0.0.1', r));
    cleanups.push(() => new Promise((r) => (hook.closeAllConnections(), hook.close(r))));

    const s = await startApp({ webhookUrl: `http://127.0.0.1:${hook.address().port}/topic` });
    await s.req('POST', '/api/orders', order([{ productId: 'prod-2', quantity: 1 }]));
    await s.req('POST', '/api/bookings', booking());
    for (let i = 0; i < 40 && received.length < 2; i++) await new Promise((r) => setTimeout(r, 50));
    assert.equal(received.length, 2);
    assert.match(received[0], /Нова поръчка VIP-ORD-1001/);
    assert.match(received[0], /Ана Петрова/);
    assert.match(received[1], /Нова резервация VIP-RES-1001/);
  });

  test('a broken webhook never blocks the customer', async () => {
    const s = await startApp({ webhookUrl: 'http://127.0.0.1:1/unreachable' });
    const r = await s.req('POST', '/api/orders', order([{ productId: 'prod-2', quantity: 1 }]));
    assert.equal(r.status, 201);
  });
});

describe('static files', () => {
  test('serves the built site, app shell fallback, and blocks traversal and dotfiles', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vip-test-'));
    const dist = path.join(dir, 'dist');
    fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>shell</title>');
    fs.writeFileSync(path.join(dist, 'assets', 'app-123.js'), 'console.log(1);'.repeat(200));
    fs.writeFileSync(path.join(dist, '.env'), 'SECRET=1');
    fs.writeFileSync(path.join(dir, 'secret.txt'), 'top secret');
    const s = await startApp({}, dir);

    const home = await s.req('GET', '/');
    assert.equal(home.status, 200);
    assert.match(home.text, /shell/);
    assert.equal(home.headers.get('cache-control'), 'no-cache');

    const asset = await fetch(s.base + '/assets/app-123.js', { headers: { 'Accept-Encoding': 'gzip' } });
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get('cache-control'), /immutable/);
    assert.equal(asset.headers.get('content-encoding'), 'gzip');
    assert.equal(asset.headers.get('content-type'), 'text/javascript; charset=utf-8');

    assert.match((await s.req('GET', '/some/page')).text, /shell/, 'SPA fallback');
    assert.equal((await s.req('GET', '/missing.js')).status, 404);
    assert.equal((await s.req('GET', '/.env')).status, 404);
    assert.equal((await s.req('GET', '/..%2fsecret.txt')).status, 404);
    assert.equal((await s.req('GET', '/%2e%2e/secret.txt')).status, 404);
    assert.equal((await s.req('GET', '/uploads/../admin.json')).status, 404);
    assert.equal((await s.req('GET', '/uploads/0123456789abcdef01234567.png')).status, 404);
    assert.equal((await s.req('GET', '/api/nothing')).status, 404);
    assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
  });

  test('data files are never exposed', async () => {
    const s = await startApp();
    for (const p of ['/store.json', '/admin.json', '/secret.key', '/data/admin.json']) {
      const r = await s.req('GET', p);
      assert.ok([404, 503].includes(r.status), `${p} -> ${r.status}`);
      assert.ok(!r.text.includes('scrypt'));
    }
  });
});
