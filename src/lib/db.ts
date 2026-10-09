import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { MIGRATIONS } from './schema';

/**
 * SQLite runs in memory; the serialized .db file is saved to a storage backend
 * after every write. The backend is swappable: IndexedDB in the browser today,
 * a native file (Capacitor) later, memory in tests.
 */
export interface DbStorage {
  load(): Promise<Uint8Array | null>;
  save(bytes: Uint8Array): Promise<void>;
}

export class Db {
  constructor(
    private sqlite3: any,
    private handle: any,
    private storage: DbStorage
  ) {}

  all<T = Record<string, any>>(sql: string, bind: any[] = []): T[] {
    return this.handle.exec({ sql, bind, rowMode: 'object', returnValue: 'resultRows' }) as T[];
  }

  run(sql: string, bind: any[] = []): number {
    this.handle.exec({ sql, bind });
    return this.handle.selectValue('SELECT last_insert_rowid()') as number;
  }

  /** Runs fn inside a transaction, then persists the file. */
  async tx<T>(fn: () => T): Promise<T> {
    this.handle.exec('BEGIN');
    let result: T;
    try {
      result = fn();
      this.handle.exec('COMMIT');
    } catch (e) {
      this.handle.exec('ROLLBACK');
      throw e;
    }
    await this.persist();
    return result;
  }

  exportBytes(): Uint8Array {
    return this.sqlite3.capi.sqlite3_js_db_export(this.handle);
  }

  async persist(): Promise<void> {
    await this.storage.save(this.exportBytes());
  }

  get schemaVersion(): number {
    return this.handle.selectValue('PRAGMA user_version') as number;
  }

  migrate(): void {
    for (let v = this.schemaVersion; v < MIGRATIONS.length; v++) {
      this.handle.exec('BEGIN');
      this.handle.exec(MIGRATIONS[v]);
      this.handle.exec(`PRAGMA user_version = ${v + 1}`);
      this.handle.exec('COMMIT');
    }
  }
}

export async function openDb(storage: DbStorage): Promise<Db> {
  const sqlite3 = await sqlite3InitModule();
  const handle = new sqlite3.oo1.DB(':memory:', 'c');
  const bytes = await storage.load();
  if (bytes && bytes.length > 0) {
    const p = sqlite3.wasm.allocFromTypedArray(bytes);
    const rc = sqlite3.capi.sqlite3_deserialize(
      handle.pointer!, 'main', p, bytes.length, bytes.length,
      sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE
    );
    if (rc !== 0) throw new Error(`Could not load saved database (code ${rc})`);
  }
  handle.exec('PRAGMA foreign_keys = ON');
  const db = new Db(sqlite3, handle, storage);
  db.migrate();
  return db;
}

export function memoryStorage(): DbStorage {
  let data: Uint8Array | null = null;
  return {
    async load() { return data; },
    async save(b) { data = b.slice(); }
  };
}

const IDB_NAME = 'recipe-app';
const IDB_STORE = 'files';
const IDB_KEY = 'main.db';

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function indexedDbStorage(): DbStorage {
  return {
    async load() {
      const d = await idb();
      return new Promise((resolve, reject) => {
        const r = d.transaction(IDB_STORE).objectStore(IDB_STORE).get(IDB_KEY);
        r.onsuccess = () => resolve((r.result as Uint8Array) ?? null);
        r.onerror = () => reject(r.error);
      });
    },
    async save(bytes) {
      const d = await idb();
      return new Promise<void>((resolve, reject) => {
        const t = d.transaction(IDB_STORE, 'readwrite');
        t.objectStore(IDB_STORE).put(bytes, IDB_KEY);
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
      });
    }
  };
}
