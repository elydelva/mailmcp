/**
 * Storage factory.
 *
 * Selects the backend at startup via the STORAGE_BACKEND env variable:
 *   - "file"     (default) — JSON file via lowdb, good for solo/dev use
 *   - "postgres"           — PostgreSQL via Bun.sql (ADR-002)
 */

import { FileStorageAdapter } from "./file.js";
import type { StorageAdapter } from "./interface.js";

export type { CreateAccountInput, EmailAccount, StorageAdapter, User } from "./interface.js";

export function createStorage(): StorageAdapter {
  const backend = process.env.STORAGE_BACKEND ?? "file";

  switch (backend) {
    case "file": {
      const dbPath = process.env.DB_PATH ?? "data/db.json";
      return new FileStorageAdapter(dbPath);
    }
    case "postgres":
      throw new Error(
        'postgres storage backend not yet implemented (see ADR-002). Set STORAGE_BACKEND="file" to use the file backend.',
      );
    default:
      throw new Error(`Unknown STORAGE_BACKEND="${backend}". Valid values: "file", "postgres".`);
  }
}
