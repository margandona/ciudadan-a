/** Wrapper mínimo sobre IndexedDB (cola de sincronización offline). */

const DB_NAME = "pclab-offline";
const DB_VERSION = 1;
const STORE = "queue";

export interface IdbRecord<T> {
  id: string;
  value: T;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function tx(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function idbPut<T>(record: IdbRecord<T>): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = tx(db, "readwrite").put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function idbGetAll<T>(): Promise<IdbRecord<T>[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = tx(db, "readonly").getAll();
    request.onsuccess = () => resolve(request.result as IdbRecord<T>[]);
    request.onerror = () => reject(request.error);
  });
}

export async function idbDelete(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = tx(db, "readwrite").delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
