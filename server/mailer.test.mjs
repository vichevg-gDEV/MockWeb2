import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import tls from 'node:tls';
import { spawnSync } from 'node:child_process';
import { createMailer, buildBookingEmail } from './mailer.mjs';

const cleanups = [];
after(async () => {
  for (const fn of cleanups) await fn();
});

// Self-signed certificate for the STARTTLS test (skipped when openssl is missing).
let certs = null;
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vip-cert-'));
  const r = spawnSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost',
    '-keyout', path.join(dir, 'k.pem'), '-out', path.join(dir, 'c.pem')
  ]);
  if (r.status === 0) certs = { key: fs.readFileSync(path.join(dir, 'k.pem')), cert: fs.readFileSync(path.join(dir, 'c.pem')) };
}

/** A tiny scripted SMTP server that records what the client sent. */
async function fakeSmtp({ starttls = false, authFail = false, hang = false, authLogin = false } = {}) {
  const seen = { commands: [], data: null };
  const server = net.createServer((raw) => serve(raw, false));
  function serve(sock, secure, greet = true) {
    if (hang) return; // never answer
    if (greet) sock.write('220 fake ESMTP\r\n');
    let buf = '';
    let inData = false;
    let loginStep = 0;
    sock.on('error', () => {});
    sock.on('data', (chunk) => {
      buf += chunk.toString('latin1');
      for (;;) {
        if (inData) {
          const end = buf.indexOf('\r\n.\r\n');
          if (end < 0) return;
          seen.data = buf.slice(0, end);
          buf = buf.slice(end + 5);
          inData = false;
          sock.write('250 queued\r\n');
          continue;
        }
        const eol = buf.indexOf('\r\n');
        if (eol < 0) return;
        const line = buf.slice(0, eol);
        buf = buf.slice(eol + 2);
        seen.commands.push(line);
        const up = line.toUpperCase();
        if (loginStep === 1) { loginStep = 2; sock.write('334 UGFzc3dvcmQ6\r\n'); continue; }
        if (loginStep === 2) { loginStep = 0; sock.write(authFail ? '535 5.7.8 bad credentials\r\n' : '235 ok\r\n'); continue; }
        if (up.startsWith('EHLO')) {
          sock.write(`250-fake\r\n${starttls && !secure ? '250-STARTTLS\r\n' : ''}250 AUTH ${authLogin ? 'LOGIN' : 'PLAIN LOGIN'}\r\n`);
        } else if (up === 'STARTTLS') {
          sock.write('220 go ahead\r\n');
          sock.removeAllListeners('data');
          serve(new tls.TLSSocket(sock, { isServer: true, ...certs }), true, false);
          return;
        } else if (up.startsWith('AUTH PLAIN')) {
          sock.write(authFail ? '535 5.7.8 bad credentials\r\n' : '235 ok\r\n');
        } else if (up === 'AUTH LOGIN') {
          loginStep = 1;
          sock.write('334 VXNlcm5hbWU6\r\n');
        } else if (up.startsWith('MAIL FROM') || up.startsWith('RCPT TO')) {
          sock.write('250 ok\r\n');
        } else if (up === 'DATA') {
          inData = true;
          sock.write('354 end with dot\r\n');
        } else if (up === 'QUIT') {
          sock.end('221 bye\r\n');
        } else {
          sock.write('500 what\r\n');
        }
      }
    });
  }
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  cleanups.push(() => new Promise((resolve) => server.close(resolve)));
  return { port: server.address().port, seen };
}

const mailerFor = (port, extra = {}, opts = { timeoutMs: 2000 }) =>
  createMailer(
    {
      smtp: {
        host: '127.0.0.1', port, user: 'salon@example.com', pass: 'app pass word1234', from: 'VIP Beauty House <salon@example.com>',
        secure: false, insecure: true, rejectUnauthorized: false, ...extra
      }
    },
    () => {},
    opts
  );

const decodeBody = (data) => {
  const body = data.slice(data.indexOf('\r\n\r\n') + 4);
  // Mail travels with CRLF line ends; compare with plain \n.
  return Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8').replace(/\r\n/g, '\n');
};

describe('mailer', () => {
  test('delivers a UTF-8 message with AUTH PLAIN', async () => {
    const f = await fakeSmtp();
    const mailer = mailerFor(f.port);
    await mailer.send({ to: 'mila@example.com', subject: 'Потвърдена резервация', text: 'Услуга: Балеаж\nЧас: 11:00' });
    assert.ok(f.seen.commands.some((c) => c === 'MAIL FROM:<salon@example.com>'));
    assert.ok(f.seen.commands.includes('RCPT TO:<mila@example.com>'));
    const plain = f.seen.commands.find((c) => c.startsWith('AUTH PLAIN '));
    // the spaces in a Google app password are dropped
    assert.equal(Buffer.from(plain.slice(11), 'base64').toString(), '\0salon@example.com\0apppassword1234');
    assert.match(f.seen.data, /^Subject: =\?UTF-8\?B\?/m);
    assert.match(f.seen.data, /^To: mila@example\.com$/m);
    assert.equal(decodeBody(f.seen.data), 'Услуга: Балеаж\nЧас: 11:00');
  });

  test('falls back to AUTH LOGIN', async () => {
    const f = await fakeSmtp({ authLogin: true });
    await mailerFor(f.port).send({ to: 'a@example.com', subject: 's', text: 't' });
    assert.ok(f.seen.commands.includes('AUTH LOGIN'));
    assert.equal(Buffer.from(f.seen.commands[f.seen.commands.indexOf('AUTH LOGIN') + 1], 'base64').toString(), 'salon@example.com');
  });

  test('upgrades with STARTTLS before sending the password', { skip: !certs }, async () => {
    const f = await fakeSmtp({ starttls: true });
    await mailerFor(f.port, { insecure: false }).send({ to: 'a@example.com', subject: 's', text: 'secret body' });
    const starttlsAt = f.seen.commands.indexOf('STARTTLS');
    const authAt = f.seen.commands.findIndex((c) => c.startsWith('AUTH'));
    assert.ok(starttlsAt >= 0 && authAt > starttlsAt, 'AUTH only after STARTTLS');
    assert.equal(decodeBody(f.seen.data), 'secret body');
  });

  test('refuses to send the password without encryption', async () => {
    const f = await fakeSmtp();
    await assert.rejects(mailerFor(f.port, { insecure: false }).send({ to: 'a@example.com', subject: 's', text: 't' }), /шифр/i);
    assert.ok(!f.seen.commands.some((c) => c.startsWith('AUTH')));
  });

  test('a body containing the SMTP end marker arrives intact', async () => {
    const f = await fakeSmtp();
    const text = 'before\r\n.\r\nQUIT\r\nMAIL FROM:<evil@example.com>\r\nafter';
    await mailerFor(f.port).send({ to: 'a@example.com', subject: 's', text });
    assert.equal(decodeBody(f.seen.data), text.replace(/\r\n/g, '\n'));
    assert.ok(!f.seen.commands.includes('MAIL FROM:<evil@example.com>'));
  });

  test('header injection through recipient or subject is impossible', async () => {
    const f = await fakeSmtp();
    const mailer = mailerFor(f.port);
    await assert.rejects(mailer.send({ to: 'a@example.com\r\nRCPT TO:<evil@example.com>', subject: 's', text: 't' }));
    await assert.rejects(mailer.send({ to: 'a@example.com>\r\nBcc: evil@example.com', subject: 's', text: 't' }));
    await mailer.send({ to: 'ok@example.com', subject: 'Hi\r\nBcc: evil@example.com', text: 't' });
    assert.ok(!/^Bcc:/im.test(f.seen.data));
    assert.ok(!f.seen.commands.some((c) => c.includes('evil@example.com')));
  });

  test('a rejected login gives a short error without the password', async () => {
    const f = await fakeSmtp({ authFail: true });
    await assert.rejects(
      mailerFor(f.port).send({ to: 'a@example.com', subject: 's', text: 't' }),
      (err) => /535/.test(err.message) && !err.message.includes('apppassword') && !err.message.includes('app pass')
    );
  });

  test('a server that never answers fails within the timeout', async () => {
    const f = await fakeSmtp({ hang: true });
    const started = Date.now();
    await assert.rejects(mailerFor(f.port, {}, { timeoutMs: 300 }).send({ to: 'a@example.com', subject: 's', text: 't' }));
    assert.ok(Date.now() - started < 2000);
  });

  test('a refused connection fails with a short error', async () => {
    await assert.rejects(mailerFor(1).send({ to: 'a@example.com', subject: 's', text: 't' }));
  });

  test('is disabled without host, user or password', () => {
    assert.equal(mailerFor(25, { host: '' }).enabled, false);
    assert.equal(mailerFor(25, { user: '' }).enabled, false);
    assert.equal(mailerFor(25, { pass: '' }).enabled, false);
    assert.equal(mailerFor(25).enabled, true);
  });
});

describe('confirmation email text', () => {
  test('lists date, time, service, stylist, address and phone', () => {
    const { subject, text } = buildBookingEmail(
      { name: 'Мила Иванова', service: 'Балеаж', stylistName: 'Силвия Георгиева', date: '2026-11-03', time: '11:00' },
      { salonAddress: 'бул. Княз Борис I 48, Варна', salonPhone: '+359 88 888 9999' }
    );
    assert.match(subject, /резервация/i);
    for (const part of ['Мила Иванова', 'Балеаж', 'Силвия Георгиева', '03.11.2026', '11:00', 'бул. Княз Борис I 48, Варна', '+359 88 888 9999']) {
      assert.ok(text.includes(part), `contains ${part}`);
    }
  });
});
