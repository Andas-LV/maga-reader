const DB_NAME = "ege-viewer";
const DB_VERSION = 1;

let _db: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!_db) {
    _db = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("settings"))
          db.createObjectStore("settings");
        if (!db.objectStoreNames.contains("viewed"))
          db.createObjectStore("viewed");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        _db = null;
        reject(req.error);
      };
    });
  }
  return _db;
}

function run<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return getDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

// ─── Folder handle ────────────────────────────────────────────────────────────

export function saveFolderHandle(
  handle: FileSystemDirectoryHandle,
): Promise<IDBValidKey> {
  return run("settings", "readwrite", (s) => s.put(handle, "folder"));
}

export function loadFolderHandle(): Promise<
  FileSystemDirectoryHandle | undefined
> {
  return run("settings", "readonly", (s) => s.get("folder"));
}

export function clearFolderHandle(): Promise<undefined> {
  return run("settings", "readwrite", (s) => s.delete("folder"));
}

// ─── Viewed paths ─────────────────────────────────────────────────────────────

export function markViewed(path: string): Promise<IDBValidKey> {
  return run("viewed", "readwrite", (s) => s.put(Date.now(), path));
}

export function loadViewedPaths(): Promise<string[]> {
  return run<IDBValidKey[]>("viewed", "readonly", (s) =>
    s.getAllKeys(),
  ).then((keys) => keys as string[]);
}
