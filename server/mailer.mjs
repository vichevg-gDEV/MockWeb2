import net from 'node:net';
import tls from 'node:tls';
import os from 'node:os';
import crypto from 'node:crypto';

/**
 * Minimal SMTP sender (no npm packages): STARTTLS or TLS-from-the-start, AUTH PLAIN/LOGIN,
 * one UTF-8 plain-text message per connection. Errors are short Bulgarian sentences that never
 * contain the password. See .env.example for the SMTP_* settings.
 */

// Same strict shape the booking form is validated against: no quotes, brackets or commas.
const ADDRESS_RE = /^[A-Za-z0-9._%+'-]{1,64}@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

const clean = (value) => String(value ?? '').replace(/[\r\n\0]+/g, ' ').trim();
const b64 = (text) => Buffer.from(text, 'utf8').toString('base64');
// shortcut: one encoded-word per header, fine for our short fixed subjects; split it if subjects get long.
const encodeWord = (text) => (/^[\x20-\x7e]*$/.test(text) ? text : `=?UTF-8?B?${b64(text)}?=`);

function parseFrom(from, user) {
  const match = /^\s*(?:"?([^"<]*?)"?\s*)?<([^<>\r\n]+)>\s*$/.exec(clean(from));
  const address = clean(match ? match[2] : from);
  return {
    name: match ? clean(match[1]) : '',
    address: ADDRESS_RE.test(address) ? address : clean(user)
  };
}

export function createMailer(config, log = () => {}, { timeoutMs = 10_000 } = {}) {
  const smtp = config.smtp || {};
  const enabled = Boolean(smtp.host && smtp.user && smtp.pass);

  async function send({ to, subject, text }) {
    if (!enabled) throw new Error('Имейлите не са настроени.');
    const recipient = clean(to);
    if (!ADDRESS_RE.test(recipient)) throw new Error('Невалиден адрес на получателя.');
    const from = parseFrom(smtp.from, smtp.user);
    const message = buildMessage(from, recipient, subject, text);

    await new Promise((resolve, reject) => {
      const holder = { sock: null };
      const timer = setTimeout(() => {
        holder.sock?.destroy();
        reject(new Error('Времето за изпращане на имейла изтече.'));
      }, timeoutMs);
      deliver(smtp, from.address, recipient, message, holder)
        .then(resolve, reject)
        .finally(() => {
          clearTimeout(timer);
          holder.sock?.destroy();
        });
    }).catch((err) => {
      log(`Email to ${recipient} failed: ${err.message}`);
      throw err;
    });
  }

  return { enabled, send };
}

function buildMessage(from, to, subject, text) {
  const fromName = from.name
    ? /^[\x20-\x7e]*$/.test(from.name)
      ? `"${from.name.replace(/"/g, '')}"`
      : encodeWord(from.name)
    : '';
  const domain = from.address.split('@')[1];
  const body = b64(String(text).replace(/\r?\n/g, '\r\n')).replace(/.{1,76}/g, '$&\r\n');
  return [
    `From: ${fromName ? `${fromName} ` : ''}<${from.address}>`,
    `To: ${to}`,
    `Subject: ${encodeWord(clean(subject))}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    body
  ].join('\r\n');
}

/** Collects server replies (multi-line `250-` replies count as one). */
function makeReader(sock) {
  let buffer = '';
  let current = [];
  const replies = [];
  let waiter = null;
  let failure = null;

  const settle = () => {
    if (!waiter) return;
    if (replies.length) {
      const { resolve } = waiter;
      waiter = null;
      resolve(replies.shift());
    } else if (failure) {
      const { reject } = waiter;
      waiter = null;
      reject(failure);
    }
  };
  sock.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let eol;
    while ((eol = buffer.indexOf('\r\n')) >= 0) {
      const line = buffer.slice(0, eol);
      buffer = buffer.slice(eol + 2);
      current.push(line);
      if (line.length === 3 || line[3] === ' ') {
        replies.push({ code: Number(line.slice(0, 3)), lines: current });
        current = [];
      }
    }
    settle();
  });
  const fail = (err) => {
    failure = failure || err;
    settle();
  };
  sock.on('error', (err) => fail(new Error(`Грешка във връзката с пощенския сървър (${err.code || err.message}).`)));
  sock.on('close', () => fail(new Error('Пощенският сървър прекъсна връзката.')));

  return {
    next: () =>
      new Promise((resolve, reject) => {
        waiter = { resolve, reject };
        settle();
      })
  };
}

function open(smtp, holder) {
  return new Promise((resolve, reject) => {
    const options = { host: smtp.host, port: smtp.port };
    const sock = smtp.secure
      ? tls.connect({ ...options, servername: net.isIP(smtp.host) ? undefined : smtp.host, rejectUnauthorized: smtp.rejectUnauthorized !== false })
      : net.connect(options);
    holder.sock = sock;
    sock.once(smtp.secure ? 'secureConnect' : 'connect', () => resolve(sock));
    sock.once('error', (err) => reject(new Error(`Няма връзка с пощенския сървър (${err.code || err.message}).`)));
  });
}

function expect(reply, codes) {
  if (codes.includes(reply.code)) return reply;
  if (reply.code === 535) {
    throw new Error('Пощенският сървър отказа входа (535). Проверете SMTP_USER и SMTP_PASS.');
  }
  throw new Error(`Пощенският сървър отговори ${reply.code}: ${clean(reply.lines[0]).slice(4, 120)}`);
}

async function deliver(smtp, fromAddress, to, message, holder) {
  let sock = await open(smtp, holder);
  let reader = makeReader(sock);
  const say = (line) => sock.write(`${line}\r\n`);
  const cmd = async (line, codes) => {
    say(line);
    return expect(await reader.next(), codes);
  };
  const helo = `EHLO ${clean(os.hostname()).replace(/[^A-Za-z0-9.-]/g, '') || 'localhost'}`;

  expect(await reader.next(), [220]);
  let ehlo = await cmd(helo, [250]);
  let encrypted = Boolean(smtp.secure);

  if (!encrypted && ehlo.lines.some((l) => /STARTTLS/i.test(l))) {
    await cmd('STARTTLS', [220]);
    const upgraded = tls.connect({
      socket: sock,
      servername: net.isIP(smtp.host) ? undefined : smtp.host,
      rejectUnauthorized: smtp.rejectUnauthorized !== false
    });
    holder.sock = upgraded;
    await new Promise((resolve, reject) => {
      upgraded.once('secureConnect', resolve);
      upgraded.once('error', (err) => reject(new Error(`Неуспешно шифриране на връзката (${err.code || err.message}).`)));
    });
    sock = upgraded;
    reader = makeReader(sock);
    encrypted = true;
    ehlo = await cmd(helo, [250]);
  }
  if (!encrypted && !smtp.insecure) {
    throw new Error('Връзката с пощенския сървър не е шифрована, затова паролата не е изпратена.');
  }

  const mechanisms = (ehlo.lines.find((l) => /^250[- ]AUTH\b/i.test(l)) || '').toUpperCase();
  const password = String(smtp.pass).replace(/\s+/g, ''); // Google shows app passwords in groups of four
  if (!mechanisms || mechanisms.includes('PLAIN')) {
    await cmd(`AUTH PLAIN ${b64(`\0${smtp.user}\0${password}`)}`, [235]);
  } else if (mechanisms.includes('LOGIN')) {
    await cmd('AUTH LOGIN', [334]);
    await cmd(b64(smtp.user), [334]);
    await cmd(b64(password), [235]);
  } else {
    throw new Error('Пощенският сървър не поддържа вход с парола.');
  }

  await cmd(`MAIL FROM:<${fromAddress}>`, [250]);
  await cmd(`RCPT TO:<${to}>`, [250, 251]);
  await cmd('DATA', [354]);
  // Dot-stuffing keeps a line that starts with "." from ending the message early.
  sock.write(`${message.replace(/(^|\r\n)\./g, '$1..')}\r\n.\r\n`);
  expect(await reader.next(), [250]);
  say('QUIT');
}

// ---------------------------------------------------------------- confirmation email

const formatDate = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

export function buildBookingEmail(booking, config) {
  const lines = [
    `Здравейте, ${booking.name}!`,
    '',
    'Вашата резервация е потвърдена.',
    '',
    `Услуга: ${booking.service}`,
    `Стилист: ${booking.stylistName}`,
    `Дата: ${formatDate(booking.date)}`,
    `Час: ${booking.time}`,
    '',
    config.salonAddress ? `Адрес: ${config.salonAddress}` : null,
    config.salonPhone ? `Телефон: ${config.salonPhone}` : null,
    '',
    'Ако трябва да промените или откажете часа, моля обадете ни се.',
    '',
    'До скоро!',
    'VIP Beauty House'
  ];
  return {
    subject: 'Потвърдена резервация – VIP Beauty House',
    text: lines.filter((l) => l !== null).join('\n')
  };
}
