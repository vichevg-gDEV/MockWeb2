import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);

export const MIN_PASSCODE_LENGTH = 8;
const MAX_PASSCODE_LENGTH = 128;

// No 0/O/1/I/L so a printed passcode can be typed without guessing.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31 symbols

export function generatePasscode(length = 12) {
  let out = '';
  while (out.length < length) {
    for (const byte of crypto.randomBytes(length * 2)) {
      if (byte < 248 && out.length < length) out += ALPHABET[byte % ALPHABET.length]; // 248 = 8 * 31, no modulo bias
    }
  }
  return out;
}

export async function hashPasscode(passcode) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(passcode, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPasscode(passcode, stored) {
  const [scheme, saltHex, keyHex] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scrypt(String(passcode), Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

export function checkPasscodeStrength(passcode) {
  if (typeof passcode !== 'string') return 'Невалиден код.';
  if (passcode.length < MIN_PASSCODE_LENGTH) {
    return `Кодът трябва да е поне ${MIN_PASSCODE_LENGTH} символа.`;
  }
  if (passcode.length > MAX_PASSCODE_LENGTH) return 'Кодът е твърде дълъг.';
  if (/^(.)\1+$/.test(passcode)) return 'Кодът не може да се състои от един и същ символ.';
  return null;
}

const b64u = (buf) => Buffer.from(buf).toString('base64url');

/**
 * Admin passcode + signed session cookies.
 * Files (inside the data folder, never committed): admin.json (salted hash) and secret.key.
 */
export async function createAuth({ dataDir, initialPassword, sessionHours, log }) {
  await fsp.mkdir(dataDir, { recursive: true, mode: 0o700 });
  const adminFile = path.join(dataDir, 'admin.json');
  const secretFile = path.join(dataDir, 'secret.key');

  let secret;
  try {
    secret = Buffer.from((await fsp.readFile(secretFile, 'utf8')).trim(), 'hex');
    if (secret.length !== 32) throw new Error('bad length');
  } catch {
    secret = crypto.randomBytes(32);
    await fsp.writeFile(secretFile, secret.toString('hex'), { mode: 0o600 });
  }

  let admin = null;
  try {
    admin = JSON.parse(await fsp.readFile(adminFile, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  async function save() {
    const tmp = adminFile + '.tmp';
    await fsp.writeFile(tmp, JSON.stringify(admin), { mode: 0o600 });
    await fsp.rename(tmp, adminFile);
  }

  if (!admin) {
    let passcode = initialPassword;
    let generated = false;
    if (passcode && checkPasscodeStrength(passcode)) {
      log(`ADMIN_PASSWORD ignored: ${checkPasscodeStrength(passcode)} A random one is created instead.`);
      passcode = '';
    }
    if (!passcode) {
      passcode = generatePasscode(12);
      generated = true;
    }
    admin = { hash: await hashPasscode(passcode), epoch: 1, updatedAt: new Date().toISOString() };
    await save();
    if (generated) {
      log('==============================================================');
      log(' ADMIN PASSCODE (shown only once, write it down):');
      log(`   ${passcode}`);
      log(' Change it any time in the admin panel (Settings) or with');
      log(' `npm run set-pin`.');
      log('==============================================================');
    } else {
      log('Admin passcode created from ADMIN_PASSWORD. You can remove it from .env now.');
    }
  }

  const sign = (data) => crypto.createHmac('sha256', secret).update(data).digest();

  return {
    verify: (passcode) =>
      typeof passcode === 'string' && passcode.length <= MAX_PASSCODE_LENGTH
        ? verifyPasscode(passcode, admin.hash)
        : Promise.resolve(false),

    /** Replace the passcode and invalidate every existing session. */
    async change(newPasscode) {
      admin = {
        hash: await hashPasscode(newPasscode),
        epoch: admin.epoch + 1,
        updatedAt: new Date().toISOString()
      };
      await save();
    },

    issueToken() {
      const payload = b64u(
        JSON.stringify({ e: admin.epoch, x: Math.floor(Date.now() / 1000) + sessionHours * 3600 })
      );
      return `${payload}.${b64u(sign(payload))}`;
    },

    checkToken(token) {
      if (typeof token !== 'string') return false;
      const [payload, mac] = token.split('.');
      if (!payload || !mac) return false;
      const expected = sign(payload);
      let given;
      try {
        given = Buffer.from(mac, 'base64url');
      } catch {
        return false;
      }
      if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return false;
      try {
        const { e, x } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        return e === admin.epoch && typeof x === 'number' && x > Date.now() / 1000;
      } catch {
        return false;
      }
    }
  };
}

/** Sliding-window counter kept in memory (resets on restart, which is fine for this use). */
export function createLimiter({ max, windowMs }) {
  const hits = new Map();
  const prune = (list, now) => {
    while (list.length && list[0] <= now - windowMs) list.shift();
    return list;
  };
  return {
    /** Is another attempt allowed for this key right now? */
    peek(key, now = Date.now()) {
      const list = prune(hits.get(key) || [], now);
      if (list.length === 0) hits.delete(key);
      else hits.set(key, list);
      return list.length < max
        ? { allowed: true, retryAfterSec: 0 }
        : { allowed: false, retryAfterSec: Math.ceil((list[0] + windowMs - now) / 1000) };
    },
    record(key, now = Date.now()) {
      const list = prune(hits.get(key) || [], now);
      list.push(now);
      hits.set(key, list);
      if (hits.size > 5000) {
        for (const [k, l] of hits) if (prune(l, now).length === 0) hits.delete(k);
      }
    },
    clear(key) {
      hits.delete(key);
    }
  };
}
