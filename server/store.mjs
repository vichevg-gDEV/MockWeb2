import fsp from 'node:fs/promises';
import path from 'node:path';

/**
 * Tiny JSON-file database.
 *
 * - All reads come from memory.
 * - Every change goes through transaction(): the change is applied synchronously (so two
 *   customers can never buy the last item at the same time), written to disk atomically
 *   (temp file + rename, previous copy kept as store.json.bak) and rolled back if the
 *   write fails.
 */
/** The virtual 'any' option is handled in code and never stored. */
export const seedStylists = (seed) => structuredClone(seed.stylists.filter((x) => x.id !== 'any'));

export async function openStore({ dataDir, seed }) {
  await fsp.mkdir(dataDir, { recursive: true, mode: 0o700 });
  const file = path.join(dataDir, 'store.json');

  let state = null;
  try {
    state = JSON.parse(await fsp.readFile(file, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw new Error(
        `Cannot read ${file} (${err.message}). Fix or restore it from store.json.bak, ` +
          `refusing to start with an empty database.`
      );
    }
  }
  // Stores written before stylists became editable get the default team.
  if (state && !Array.isArray(state.catalog.stylists)) {
    state.catalog.stylists = seedStylists(seed);
    await writeToDisk();
  }
  if (!state) {
    state = {
      version: 1,
      catalog: {
        products: structuredClone(seed.products),
        priceList: structuredClone(seed.priceList),
        salonServices: structuredClone(seed.salonServices),
        stylists: seedStylists(seed)
      },
      orders: [],
      bookings: [],
      counters: { order: 1000, booking: 1000 },
      updatedAt: new Date().toISOString()
    };
    await writeToDisk();
  }

  async function writeToDisk() {
    const tmp = file + '.tmp';
    const handle = await fsp.open(tmp, 'w', 0o600);
    try {
      await handle.writeFile(JSON.stringify(state));
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      await fsp.copyFile(file, file + '.bak');
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    await fsp.rename(tmp, file);
  }

  let queue = Promise.resolve();

  /** Run fn(state) synchronously, then persist. Throwing inside fn (or a failed write) rolls back. */
  function transaction(fn) {
    const run = async () => {
      const snapshot = structuredClone(state);
      try {
        const result = fn(state);
        state.updatedAt = new Date().toISOString();
        await writeToDisk();
        return result;
      } catch (err) {
        state = snapshot;
        throw err;
      }
    };
    const result = queue.then(run, run);
    queue = result.catch(() => {});
    return result;
  }

  return {
    get state() {
      return state;
    },
    transaction,
    /** Resolves when every queued write has finished (used on shutdown). */
    flush: () => queue
  };
}
