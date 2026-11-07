const DATABASE_NAME = "grantly_document_vault";
const DATABASE_VERSION = 1;
const STORE_NAME = "files";

function openDatabase(): Promise<IDBDatabase> {
  if (!("indexedDB" in window)) {
    return Promise.reject(
      new Error("IndexedDB is unavailable in this browser."),
    );
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open document storage."));
    request.onblocked = () =>
      reject(new Error("Document storage is blocked by another tab."));
  });
}

async function runRequest<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    let result: T;
    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Document storage request failed."));
    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(
        transaction.error ?? new Error("Document storage transaction failed."),
      );
    };
    transaction.onabort = () => {
      database.close();
      reject(
        transaction.error ?? new Error("Document storage transaction aborted."),
      );
    };
  });
}

export const documentStorage = {
  get(id: string): Promise<Blob | undefined> {
    return runRequest("readonly", (store) => store.get(id));
  },

  put(id: string, file: Blob): Promise<IDBValidKey> {
    return runRequest("readwrite", (store) => store.put(file, id));
  },

  delete(id: string): Promise<undefined> {
    return runRequest("readwrite", (store) => store.delete(id));
  },
};
