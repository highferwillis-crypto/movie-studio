const DB_NAME = "movie-studio";
const DB_VERSION = 2;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

let opening: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (opening) return opening;
  opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects", { keyPath: "id" });
      if (!db.objectStoreNames.contains("folders")) {
        const store = db.createObjectStore("folders", { keyPath: "id" });
        store.createIndex("byProject", "projectId");
      }
      if (!db.objectStoreNames.contains("assets")) {
        const store = db.createObjectStore("assets", { keyPath: "id" });
        store.createIndex("byProject", "projectId");
      }
      if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
      if (!db.objectStoreNames.contains("chats")) {
        const store = db.createObjectStore("chats", { keyPath: "id" });
        store.createIndex("byScope", "scope");
      }
      if (!db.objectStoreNames.contains("reels")) {
        const store = db.createObjectStore("reels", { keyPath: "id" });
        store.createIndex("byProject", "projectId");
      }
      if (!db.objectStoreNames.contains("cuts")) {
        const store = db.createObjectStore("cuts", { keyPath: "id" });
        store.createIndex("byProject", "projectId");
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        opening = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      opening = null;
      reject(request.error);
    };
  });
  return opening;
}

export async function dbAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  const tx = db.transaction(storeName, "readonly");
  const rows = await requestToPromise(tx.objectStore(storeName).getAll() as IDBRequest<T[]>);
  return rows;
}

export async function dbPut(storeName: string, value: unknown): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).put(value);
  await transactionDone(tx);
}

export async function dbDel(storeName: string, id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).delete(id);
  await transactionDone(tx);
}

export async function dbPutBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("blobs", "readwrite");
  tx.objectStore("blobs").put(blob, id);
  await transactionDone(tx);
}

export async function dbGetBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  const tx = db.transaction("blobs", "readonly");
  const blob = await requestToPromise(tx.objectStore("blobs").get(id) as IDBRequest<Blob | undefined>);
  return blob ?? null;
}

export async function dbDelBlob(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("blobs", "readwrite");
  tx.objectStore("blobs").delete(id);
  await transactionDone(tx);
}

export function uid(): string {
  return crypto.randomUUID();
}
