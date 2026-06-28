/// <reference path="types.ts" />

/**
 * IndexedDB-backed store for the single auto-saved session ("작업 이어하기").
 * Degrades gracefully to an in-memory value when IndexedDB is missing or broken,
 * so the app keeps working even if the database is unavailable (CLAUDE.md §6).
 */
namespace App.DB {
  const DB_NAME = "claude_md_generator";
  const DB_VERSION = 1;
  const STORE_SESSION = "session";
  const SESSION_KEY = "current";

  let dbHandle: IDBDatabase | null = null;
  let useMemory = false;

  // In-memory fallback storage.
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

  function wrap<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /** Persist the in-progress session so work can be resumed (CLAUDE.md §6). */
  export async function saveSession(rec: App.WorkRecord): Promise<void> {
    if (useMemory) {
      memSession = rec;
      return;
    }
    try {
      const db = dbHandle as IDBDatabase;
      await wrap(db.transaction(STORE_SESSION, "readwrite").objectStore(STORE_SESSION).put(rec, SESSION_KEY));
    } catch {
      memSession = rec;
    }
  }

  export async function loadSession(): Promise<App.WorkRecord | null> {
    if (useMemory) {
      return memSession;
    }
    try {
      const db = dbHandle as IDBDatabase;
      const r = await wrap<App.WorkRecord | undefined>(
        db.transaction(STORE_SESSION, "readonly").objectStore(STORE_SESSION).get(SESSION_KEY)
      );
      return r ?? null;
    } catch {
      return memSession;
    }
  }
}
