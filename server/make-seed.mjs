// Regenerates server/seed.json from src/data/salonData.ts.
// Run with: npm run seed   (needs Node 22.6+ for TypeScript type stripping)
//
// seed.json is the catalog the server starts with the very first time it runs
// (and what "Reset to defaults" in the admin panel restores).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(here, '..', 'src', 'data', 'salonData.ts');

// salonData.ts only imports *types*; strip that line so Node can load the file as-is.
const code = fs
  .readFileSync(source, 'utf8')
  .replace(/^import\s+\{[^}]*\}\s+from\s+'\.\.\/types';?\s*$/m, '');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vip-seed-'));
const tmpFile = path.join(tmpDir, 'salonData.mts');
fs.writeFileSync(tmpFile, code);

try {
  const mod = await import(pathToFileURL(tmpFile).href);
  const seed = {
    products: mod.PRODUCTS,
    priceList: mod.PRICE_LIST,
    salonServices: mod.SALON_SERVICES,
    stylists: mod.STYLISTS
  };
  fs.writeFileSync(path.join(here, 'seed.json'), JSON.stringify(seed, null, 2) + '\n');
  console.log(
    `seed.json written: ${seed.products.length} products, ${seed.priceList.length} price items, ` +
      `${seed.salonServices.length} service cards, ${seed.stylists.length} stylists`
  );
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
