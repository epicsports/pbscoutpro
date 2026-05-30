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
  try { await idbPut(`catalog:${kind}`, { version, ts: Date.now(), docs }); } catch { /* non-fatal */ }
}
