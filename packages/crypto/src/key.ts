import { randomBytes } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const KEY_FILE = ".encryption_key";

/**
 * Ensures ENCRYPTION_KEY is set before any storage operation.
 *
 * Resolution order:
 *   1. ENCRYPTION_KEY env var (explicit user config)
 *   2. Key file at <dataDir>/.encryption_key (persisted auto-generated key)
 *   3. Generate a new 32-byte key, persist it, and set the env var
 *
 * This means users who never set ENCRYPTION_KEY get a unique per-installation
 * key instead of a shared hardcoded default.
 */
export async function initEncryptionKey(dataDir: string): Promise<void> {
  if (process.env.ENCRYPTION_KEY) return;

  const keyPath = join(dataDir, KEY_FILE);

  const exists = await access(keyPath)
    .then(() => true)
    .catch(() => false);
  if (exists) {
    const key = (await readFile(keyPath, "utf8")).trim();
    if (key.length === 64) {
      process.env.ENCRYPTION_KEY = key;
      return;
    }
  }

  const key = randomBytes(32).toString("hex");
  await writeFile(keyPath, key, "utf8");
  process.env.ENCRYPTION_KEY = key;
}
