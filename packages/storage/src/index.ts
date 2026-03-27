/**
 * Storage factory.
 *
 * Selects the backend at startup via the STORAGE_BACKEND env variable:
 *   - "file"     (default) — JSON file via lowdb, good for solo/dev use
 *   - "postgres"           — PostgreSQL via Drizzle ORM (ADR-002)
 */

import { FileStorageAdapter } from "./file.js";
import type { StorageAdapter } from "./interface.js";
import { PostgresStorageAdapter } from "./postgres.js";

// Re-export crypto helpers so consumers only need to import from @mailmcp/storage
export { decrypt, decrypt as decryptToString, encrypt, initEncryptionKey } from "@mailmcp/crypto";

export type { CreateAccountInput, EmailAccount, StorageAdapter, User } from "./interface.js";
export { runMigrations } from "./migrate.js";
export { PostgresStorageAdapter } from "./postgres.js";

export function createStorage(): StorageAdapter {
  const backend = process.env.STORAGE_BACKEND ?? "file";

  switch (backend) {
    case "file": {
      const dbPath = process.env.DB_PATH ?? "data/db.json";
      return new FileStorageAdapter(dbPath);
    }
    case "postgres": {
      const url = process.env.DATABASE_URL ?? "postgresql://localhost:5432/mailmcp";
      return new PostgresStorageAdapter(url);
    }
    default:
      throw new Error(`Unknown STORAGE_BACKEND="${backend}". Valid values: "file", "postgres".`);
  }
}
