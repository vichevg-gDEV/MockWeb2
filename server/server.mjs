// Entry point: `npm start`  (or `node server/server.mjs`)
import { loadConfig, loadEnvFile } from './config.mjs';
import { createApp } from './app.mjs';

loadEnvFile();
const config = loadConfig();

let app;
try {
  app = await createApp(config);
} catch (err) {
  console.error(`\nCould not start the server: ${err.message}\n`);
  process.exit(1);
}

const address = await app.listen();
console.log(`VIP Beauty House server listening on http://${config.host}:${address.port}`);
console.log(`  data folder : ${config.dataDir}`);
console.log(`  website     : ${config.distDir}`);
console.log(
  app.notifier.channels.length
    ? `  notifications: ${app.notifier.channels.join(', ')}`
    : '  notifications: none configured (orders and bookings appear in the admin panel only)'
);

console.log(
  app.mailer.enabled
    ? `  confirmation emails: on (sent from ${config.smtp.from || config.smtp.user})`
    : '  confirmation emails: off (set SMTP_HOST, SMTP_USER and SMTP_PASS in .env to turn them on)'
);

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`\n${signal} received, finishing pending writes...`);
  await app.close();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
