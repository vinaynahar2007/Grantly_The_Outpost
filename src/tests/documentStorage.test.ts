import { afterEach, describe, expect, it, vi } from "vitest";
import { documentStorage } from "@/services/documentStorage";

function createIndexedDbStub() {
  const files = new Map<string, Blob>();
  type FakeRequest = {
    result?: unknown;
    error?: Error;
    onsuccess: ((event: Event) => void) | null;
    onerror: ((event: Event) => void) | null;
  };
  type FakeTransaction = {
    oncomplete: (() => void) | null;
    onerror: (() => void) | null;
    onabort: (() => void) | null;
    error: Error | null;
    objectStore: () => {
      get: (key: string) => FakeRequest;
      put: (value: Blob, key: string) => FakeRequest;
      delete: (key: string) => FakeRequest;
    };
  };
  let activeTransaction: FakeTransaction | undefined;
  const database = {
    objectStoreNames: { contains: () => true },
    close: vi.fn(),
    transaction: () => {
      const transaction: FakeTransaction = {
        oncomplete: null,
        onerror: null,
        onabort: null,
        error: null,
        objectStore: () => ({
          get: (key: string) => request(() => files.get(key)),
          put: (value: Blob, key: string) =>
            request(() => {
              files.set(key, value);
              return key;
            }),
          delete: (key: string) =>
            request(() => {
              files.delete(key);
              return undefined;
            }),
        }),
      };
      activeTransaction = transaction;
      return transaction;
    },
  };
  const request = <T>(operation: () => T) => {
    const result: FakeRequest = { onsuccess: null, onerror: null };
    queueMicrotask(() => {
      result.result = operation();
      result.onsuccess?.(new Event("success"));
      activeTransaction?.oncomplete?.();
    });
    return result as { result?: T; onsuccess: ((event: Event) => void) | null; onerror: ((event: Event) => void) | null };
  };
  return {
    files,
    open: () => {
      const result: {
        result?: typeof database;
        onupgradeneeded: (() => void) | null;
        onsuccess: (() => void) | null;
        onerror: (() => void) | null;
        onblocked: (() => void) | null;
        error?: Error;
      } = {
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        onblocked: null,
      };
      queueMicrotask(() => {
        result.result = database;
        result.onsuccess?.();
      });
      return result;
    },
  };
}

const originalDescriptor = Object.getOwnPropertyDescriptor(
  window,
  "indexedDB",
);

afterEach(() => {
  if (originalDescriptor) {
    Object.defineProperty(window, "indexedDB", originalDescriptor);
  } else {
    Reflect.deleteProperty(window, "indexedDB");
  }
});

describe("IndexedDB document storage", () => {
  it("persists, retrieves, and deletes file blobs", async () => {
    const database = createIndexedDbStub();
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: {
        open: () => database.open(),
      },
    });
    const file = new Blob(["document bytes"], { type: "application/pdf" });

    await documentStorage.put("doc-1", file);
    expect(await documentStorage.get("doc-1")).toBe(file);
    expect(database.files.get("doc-1")).toBe(file);
    await documentStorage.delete("doc-1");
    expect(await documentStorage.get("doc-1")).toBeUndefined();
  });
});
