/// <reference path="types.ts" />

/**
 * IndexedDB-backed store for saved works plus a single auto-saved session.
 * Degrades gracefully to an in-memory map when IndexedDB is missing or broken,
 * so the app keeps working even if the database is corrupted (CLAUDE.md §6).
 */
namespace App.DB {
  const DB_NAME = "claude_md_generator";
  const DB_VERSION = 1;
  const STORE_WORKS = "works";
  const STORE_SESSION = "session";
  const SESSION_KEY = "current";

  let dbHandle: IDBDatabase | null = null;
  let useMemory = false;

  // In-memory fallback storage.
  const memWorks = new Map<string, App.WorkRecord>();
  let memSession: App.WorkRecord | null = null;

  export function isMemoryMode(): boolean {
    return useMemory;
  }

  /** Open (or create) the database. Resolves even on failure (memory mode). */
  export function open(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof indexedDB === "undefined") {
        useMemory = true;
        resolve();
        return;
      }
      let req: IDBOpenDBRequest;
      try {
        req = indexedDB.open(DB_NAME, DB_VERSION);
      } catch {
        useMemory = true;
        resolve();
        return;
      }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_WORKS)) {
          db.createObjectStore(STORE_WORKS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_SESSION)) {
          db.createObjectStore(STORE_SESSION);
        }
      };
      req.onsuccess = () => {
        dbHandle = req.result;
        resolve();
      };
      req.onerror = () => {
        useMemory = true;
        resolve();
      };
    });
  }

  function tx(store: string, mode: IDBTransactionMode): IDBObjectStore {
    const db = dbHandle as IDBDatabase;
    return db.transaction(store, mode).objectStore(store);
  }

  function wrap<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  export async function saveWork(rec: App.WorkRecord): Promise<void> {
    if (useMemory) {
      memWorks.set(rec.id, rec);
      return;
    }
    try {
      await wrap(tx(STORE_WORKS, "readwrite").put(rec));
    } catch {
      memWorks.set(rec.id, rec);
    }
  }

  export async function listWorks(): Promise<App.WorkRecord[]> {
    if (useMemory) {
      return [...memWorks.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    }
    try {
      const all = await wrap<App.WorkRecord[]>(tx(STORE_WORKS, "readonly").getAll());
      return all.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [...memWorks.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    }
  }

  export async function getWork(id: string): Promise<App.WorkRecord | undefined> {
    if (useMemory) {
      return memWorks.get(id);
    }
    try {
      return await wrap<App.WorkRecord | undefined>(tx(STORE_WORKS, "readonly").get(id));
    } catch {
      return memWorks.get(id);
    }
  }

  export async function deleteWork(id: string): Promise<void> {
    if (useMemory) {
      memWorks.delete(id);
      return;
    }
    try {
      await wrap(tx(STORE_WORKS, "readwrite").delete(id));
    } catch {
      memWorks.delete(id);
    }
  }

  export async function replaceAll(records: App.WorkRecord[]): Promise<void> {
    if (useMemory) {
      records.forEach((r) => memWorks.set(r.id, r));
      return;
    }
    try {
      const store = tx(STORE_WORKS, "readwrite");
      await Promise.all(records.map((r) => wrap(store.put(r))));
    } catch {
      records.forEach((r) => memWorks.set(r.id, r));
    }
  }

  /** Persist the in-progress session so work can be resumed (CLAUDE.md §6). */
  export async function saveSession(rec: App.WorkRecord): Promise<void> {
    if (useMemory) {
      memSession = rec;
      return;
    }
    try {
      await wrap(tx(STORE_SESSION, "readwrite").put(rec, SESSION_KEY));
    } catch {
      memSession = rec;
    }
  }

  export async function loadSession(): Promise<App.WorkRecord | null> {
    if (useMemory) {
      return memSession;
    }
    try {
      const r = await wrap<App.WorkRecord | undefined>(tx(STORE_SESSION, "readonly").get(SESSION_KEY));
      return r ?? null;
    } catch {
      return memSession;
    }
  }
}
