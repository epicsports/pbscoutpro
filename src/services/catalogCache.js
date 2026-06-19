/**
 * IndexedDB cache for the near-static reference catalog (players / teams).
 *
 * The catalog is ~3,242 players + ~298 teams, mutated only by Jacek's CSV import
 * + occasional admin edits. Streaming it ×2 via full-collection onSnapshot on
 * every cold load cost ~6,484 reads/session. This cache lets the readers gate on
 * a single version marker (`/meta/catalogVersion`) and serve from local storage
 * when unchanged — 0 catalog reads on a steady-state load. localStorage is too
 * small for 3k docs, so IndexedDB.
 *
 * Stored value per kind: { version, ts, docs }. All ops are wrapped/guarded —
 * if IndexedDB is unavailable (private mode, unsupported), load returns null and
 * the reader falls back to a one-shot fetch (correct, just uncached).
 */

const DB_NAME = 'pbscout-catalog';
const STORE = 'kv';
const DB_VER = 1;

let _dbPromise = null;
let _persistRequested = false;

/**
 * Ask the browser to make storage persistent (best-effort, once per session).
 *
 * Without this, the catalog IndexedDB is "best-effort" storage — Safari/iOS ITP
 * evicts it after ~7 days of no visits, so the cold-load (~2,886 reads) repeats
 * on the next visit. `persist()` upgrades the origin to "persistent" so eviction
 * needs explicit user action. The grant is heuristic (engagement / installed
 * PWA) and silent on iOS; a rejection just leaves today's best-effort behaviour,
 * so this is a pure upside with no downside. Fully guarded — absent API / throw
 * is a no-op.
 */
function ensurePersisted() {
  if (_persistRequested) return;
  _persistRequested = true;
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }
  } catch { /* non-fatal */ }
}

function openDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no-indexeddb')); return; }
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch(e => { _dbPromise = null; throw e; });
  return _dbPromise;
}

function idbGet(key) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const rq = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    rq.onsuccess = () => resolve(rq.result ?? null);
    rq.onerror = () => reject(rq.error);
  }));
}

function idbPut(key, val) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const rq = db.transaction(STORE, 'readwrite').objectStore(STORE).put(val, key);
    rq.onsuccess = () => resolve();
    rq.onerror = () => reject(rq.error);
  }));
}

/** Returns { version, ts, docs } or null (cache miss / IndexedDB unavailable). */
export async function loadCatalogCache(kind) {
  try { return await idbGet(`catalog:${kind}`); } catch { return null; }
}

/** Persist the catalog for `kind` under the given version. Non-fatal on failure. */
export async function saveCatalogCache(kind, version, docs) {
  ensurePersisted(); // upgrade to durable storage on first real cache write (iOS ITP)
  try { await idbPut(`catalog:${kind}`, { version, ts: Date.now(), docs }); } catch { /* non-fatal */ }
}
