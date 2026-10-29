import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';

export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

const bad = (message, code = 'invalid_input') => new HttpError(400, code, message);

function str(value, field, { min = 0, max = 200, required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw bad(`Липсва поле: ${field}.`);
    return '';
  }
  if (typeof value !== 'string') throw bad(`Невалидна стойност: ${field}.`);
  const trimmed = value.trim();
  if (required && trimmed.length === 0) throw bad(`Липсва поле: ${field}.`);
  if (trimmed.length < min) throw bad(`Полето "${field}" е твърде кратко.`);
  if (trimmed.length > max) throw bad(`Полето "${field}" е твърде дълго.`);
  // eslint-disable-next-line no-control-regex
  return trimmed.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

const PHONE_RE = /^\+?[\d\s()\-./]{6,30}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

// ---------------------------------------------------------------- customer input

export function parseOrderInput(body, config) {
  if (!body || typeof body !== 'object') throw bad('Невалидна поръчка.');
  const customer = {
    name: str(body.name, 'име', { required: true, min: 2, max: 100 }),
    phone: str(body.phone, 'телефон', { required: true, max: 30 }),
    email: str(body.email, 'имейл', { max: 120 }),
    city: str(body.city, 'град', { required: true, max: 80 }),
    address: str(body.address, 'адрес', { required: true, max: 200 }),
    notes: str(body.notes, 'забележка', { max: 500 })
  };
  if (!PHONE_RE.test(customer.phone)) throw bad('Невалиден телефонен номер.');
  if (customer.email && !EMAIL_RE.test(customer.email)) throw bad('Невалиден имейл адрес.');

  const courier = body.courier;
  if (courier !== 'econt' && courier !== 'speedy') throw bad('Изберете куриер.');
  // Online card payments are not implemented: cash on delivery only.
  const paymentMethod = body.paymentMethod === undefined ? 'cod' : body.paymentMethod;
  if (paymentMethod !== 'cod') throw bad('Поддържа се само наложен платеж.');

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) {
    throw bad('Количката е празна.');
  }
  const wanted = new Map();
  for (const item of body.items) {
    const productId = item && item.productId;
    const quantity = item && item.quantity;
    if (typeof productId !== 'string' || productId.length > 80) throw bad('Невалиден продукт.');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw bad('Невалидно количество.');
    wanted.set(productId, (wanted.get(productId) || 0) + quantity);
  }
  return { customer, courier, paymentMethod, wanted };
}

export function parseBookingInput(body, stylists, config) {
  if (!body || typeof body !== 'object') throw bad('Невалидна резервация.');
  if (body.agreedToTerms !== true) throw bad('Необходимо е съгласие с условията.');
  const booking = {
    service: str(body.service, 'услуга', { required: true, max: 150 }),
    stylistId: str(body.stylist || 'any', 'стилист', { max: 40 }) || 'any',
    date: str(body.date, 'дата', { required: true, max: 10 }),
    time: str(body.time, 'час', { required: true, max: 5 }),
    name: str(body.name, 'име', { required: true, min: 2, max: 100 }),
    phone: str(body.phone, 'телефон', { required: true, max: 30 }),
    notes: str(body.notes, 'забележка', { max: 500 })
  };
  if (!PHONE_RE.test(booking.phone)) throw bad('Невалиден телефонен номер.');
  const stylist = stylists.find((s) => s.id === booking.stylistId);
  if (!stylist) throw bad('Непознат стилист.');
  booking.stylistName = stylist.name;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(booking.time)) {
    throw bad('Невалидна дата или час.');
  }
  if (booking.time < config.bookingOpen || booking.time > config.bookingClose) {
    throw bad(`Резервации се приемат между ${config.bookingOpen} и ${config.bookingClose} ч.`);
  }
  const asDate = new Date(booking.date + 'T00:00:00Z');
  if (Number.isNaN(asDate.getTime()) || asDate.toISOString().slice(0, 10) !== booking.date) {
    throw bad('Невалидна дата.');
  }
  const nowLocal = salonNow(config.timezone);
  const stamp = `${booking.date} ${booking.time}`;
  if (stamp < nowLocal.slice(0, 16)) {
    throw bad('Избраният час вече е минал.', 'date_in_past');
  }
  const horizon = new Date(Date.now() + 366 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  if (booking.date > horizon) throw bad('Датата е твърде далеч в бъдещето.');
  return booking;
}

/** "YYYY-MM-DD HH:mm:ss" in the salon's timezone. */
export function salonNow(timezone) {
  return new Date().toLocaleString('sv-SE', { timeZone: timezone });
}

// ---------------------------------------------------------------- admin input

const SAFE_IMAGE_REF = /^(https?:\/\/[^\s"'<>]{1,500}|\.{0,2}\/?[A-Za-z0-9_\-./]{1,300})$/;

export function parseProductInput(raw, { requireId = false } = {}) {
  if (!raw || typeof raw !== 'object') throw bad('Невалиден продукт.');
  const price = Number(raw.price);
  const stock = Number(raw.stock);
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000) throw bad('Невалидна цена.');
  if (!Number.isInteger(stock) || stock < 0 || stock > 100_000) throw bad('Невалидна наличност.');

  const details = Array.isArray(raw.details) ? raw.details : [];
  if (details.length > 20) throw bad('Твърде много детайли.');

  const product = {
    id: str(raw.id, 'id', { required: requireId, max: 80 }),
    title: str(raw.title, 'заглавие', { required: true, max: 150 }),
    category: str(raw.category, 'категория', { required: true, max: 40 }),
    categoryLabel: str(raw.categoryLabel, 'категория (етикет)', { max: 80 }) || 'Салонен продукт',
    description: str(raw.description, 'описание', { max: 2000 }),
    price: Math.round(price * 100) / 100,
    specs: str(raw.specs, 'спецификации', { max: 200 }),
    image: typeof raw.image === 'string' ? raw.image.trim() : '',
    stock,
    details: details.map((d) => str(d, 'детайл', { max: 200 })).filter(Boolean)
  };
  const badge = str(raw.badge, 'бадж', { max: 30 });
  if (badge) product.badge = badge;
  return product;
}

const IMAGE_TYPES = [
  { ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  {
    ext: 'webp',
    test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP'
  }
];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Photos uploaded in the admin panel arrive as data: URLs. Store them as files so they are not
 * sent to every visitor inside the catalog JSON. Other values must be a normal URL or path.
 */
export async function materializeImage(product, uploadsDir) {
  const image = product.image;
  if (!image) return { ...product, image: '' };
  if (image.startsWith('data:')) {
    const match = /^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(image);
    if (!match) throw bad('Неподдържан формат на снимката (JPG, PNG или WebP).');
    const bytes = Buffer.from(match[1].replace(/\s+/g, ''), 'base64');
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) throw bad('Снимката е твърде голяма (макс. 5 MB).');
    const type = IMAGE_TYPES.find((t) => t.test(bytes));
    if (!type) throw bad('Файлът не е валидна снимка.');
    const name = `${crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 24)}.${type.ext}`;
    await fsp.mkdir(uploadsDir, { recursive: true });
    await fsp.writeFile(path.join(uploadsDir, name), bytes, { flag: 'w' });
    return { ...product, image: `/uploads/${name}` };
  }
  if (!SAFE_IMAGE_REF.test(image) || image.includes('..')) throw bad('Невалиден адрес на снимката.');
  return product;
}

export function parsePriceList(raw) {
  if (!Array.isArray(raw) || raw.length > 300) throw bad('Невалиден ценоразпис.');
  return raw.map((item) => {
    if (!item || typeof item !== 'object') throw bad('Невалиден ред в ценоразписа.');
    const out = {
      id: str(item.id, 'id', { max: 80 }) || `price-${crypto.randomBytes(4).toString('hex')}`,
      service: str(item.service, 'услуга', { required: true, max: 150 }),
      duration: str(item.duration, 'продължителност', { max: 40 }),
      price: str(item.price, 'цена', { required: true, max: 40 })
    };
    if (item.highlight === true) out.highlight = true;
    return out;
  });
}

export function parseSalonServices(raw) {
  if (!Array.isArray(raw) || raw.length > 100) throw bad('Невалиден списък с услуги.');
  return raw.map((item) => {
    if (!item || typeof item !== 'object') throw bad('Невалидна услуга.');
    const out = {
      id: str(item.id, 'id', { max: 80 }) || `srv-${crypto.randomBytes(4).toString('hex')}`,
      title: str(item.title, 'заглавие', { required: true, max: 120 }),
      iconClass: str(item.iconClass, 'икона', { max: 60 }) || 'fa-wand-magic',
      description: str(item.description, 'описание', { max: 600 }),
      startingPrice: str(item.startingPrice, 'начална цена', { required: true, max: 40 }),
      category: str(item.category, 'категория', { max: 40 }) || 'extensions'
    };
    if (!/^[a-z0-9 -]+$/.test(out.iconClass)) throw bad('Невалидна икона.');
    const duration = str(item.duration, 'продължителност', { max: 40 });
    if (duration) out.duration = duration;
    return out;
  });
}

export function parseStylists(raw) {
  if (!Array.isArray(raw) || raw.length > 30) throw bad('Невалиден списък със стилисти.');
  const seen = new Set();
  return raw.map((item) => {
    if (!item || typeof item !== 'object') throw bad('Невалиден стилист.');
    let id = str(item.id, 'id', { max: 80 });
    // 'any' is reserved for "first available stylist"; duplicates get a fresh id.
    if (!id || id === 'any' || seen.has(id)) id = `st-${crypto.randomBytes(4).toString('hex')}`;
    seen.add(id);
    return {
      id,
      name: str(item.name, 'име', { required: true, max: 100 }),
      role: str(item.role, 'длъжност', { max: 150 }),
      experience: str(item.experience, 'опит', { max: 150 })
    };
  });
}

export const ORDER_STATUSES = ['new', 'confirmed', 'shipped', 'completed', 'cancelled'];
export const BOOKING_STATUSES = ['new', 'confirmed', 'done', 'no_show', 'cancelled'];
