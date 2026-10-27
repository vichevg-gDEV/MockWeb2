// Sets a new admin passcode directly on the server (use this if you forgot it).
//   npm run set-pin            -> asks for the new passcode
//   npm run set-pin -- --random -> generates one and prints it
// Restart the server afterwards so the new passcode is used.
import readline from 'node:readline/promises';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, loadEnvFile } from './config.mjs';
import { checkPasscodeStrength, generatePasscode, hashPasscode } from './auth.mjs';

loadEnvFile();
const { dataDir } = loadConfig();
const adminFile = path.join(dataDir, 'admin.json');

let passcode;
if (process.argv.includes('--random')) {
  passcode = generatePasscode(12);
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  passcode = (await rl.question('New admin passcode (min. 8 characters): ')).trim();
  rl.close();
}

const problem = checkPasscodeStrength(passcode);
if (problem) {
  console.error(problem);
  process.exit(1);
}

let epoch = 1;
try {
  epoch = JSON.parse(await fsp.readFile(adminFile, 'utf8')).epoch + 1;
} catch {
  /* first time: no file yet */
}
await fsp.mkdir(dataDir, { recursive: true, mode: 0o700 });
await fsp.writeFile(
  adminFile,
  JSON.stringify({ hash: await hashPasscode(passcode), epoch, updatedAt: new Date().toISOString() }),
  { mode: 0o600 }
);
console.log(process.argv.includes('--random') ? `New admin passcode: ${passcode}` : 'Admin passcode updated.');
console.log('Restart the server for the change to take effect (this also logs out existing admin sessions).');
