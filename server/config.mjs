import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Minimal .env reader (no dependency). Existing environment variables win over the file.
 */
export function loadEnvFile(file = path.join(projectRoot, '.env')) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return;
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && value !== '' && value !== undefined ? n : fallback;
};

export function loadConfig(env = process.env, overrides = {}) {
  const config = {
    port: num(env.PORT, 8080),
    host: env.HOST || '127.0.0.1',
    dataDir: path.resolve(env.DATA_DIR || path.join(projectRoot, 'data')),
    distDir: path.resolve(env.DIST_DIR || path.join(projectRoot, 'dist')),
    // Set TRUST_PROXY=1 when running behind nginx/Caddy so rate limits use the real visitor IP.
    trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true',
    // Extra origins allowed to call the admin API (normally none: same-origin only).
    allowedOrigins: (env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    // Only used the very first time, to create the admin passcode. See README.
    initialAdminPassword: env.ADMIN_PASSWORD || '',
    telegramToken: env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: env.TELEGRAM_CHAT_ID || '',
    webhookUrl: env.NOTIFY_WEBHOOK_URL || '',
    // Booking confirmation emails. Without host, user and password they are switched off.
    smtp: {
      host: env.SMTP_HOST || '',
      port: num(env.SMTP_PORT, 587),
      user: env.SMTP_USER || '',
      pass: env.SMTP_PASS || '',
      from: env.SMTP_FROM || '',
      secure: num(env.SMTP_PORT, 587) === 465
    },
    salonAddress: env.SALON_ADDRESS ?? 'бул. „Княз Борис I“ 48, Варна',
    salonPhone: env.SALON_PHONE ?? '+359 88 888 9999',
    shippingFee: num(env.SHIPPING_FEE, 7),
    freeShippingOver: num(env.FREE_SHIPPING_OVER, 150),
    timezone: env.SALON_TIMEZONE || 'Europe/Sofia',
    // Bookings are only accepted inside these hours (HH:MM).
    bookingOpen: env.BOOKING_OPEN || '10:00',
    bookingClose: env.BOOKING_CLOSE || '19:00',
    // Public form submissions allowed per visitor IP per window.
    publicLimit: { max: num(env.PUBLIC_RATE_MAX, 10), windowMs: 10 * 60 * 1000 },
    // Failed admin logins allowed per IP, and in total, per window.
    loginLimit: { maxPerIp: 5, maxTotal: 30, windowMs: 15 * 60 * 1000 },
    sessionHours: num(env.SESSION_HOURS, 12),
    silent: false
  };
  return { ...config, ...overrides };
}
