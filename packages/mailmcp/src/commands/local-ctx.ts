import { createStorage, initEncryptionKey } from "@mailmcp/storage";
import type { ToolContext } from "@mailmcp/tools";

/** Initialises encryption, storage, and returns a local ToolContext. */
export async function createLocalContext(dataDir: string): Promise<ToolContext> {
  await initEncryptionKey(dataDir);
  process.env.STORAGE_BACKEND = "file";
  process.env.DB_PATH = `${dataDir}/db.json`;
  return { userId: "local", storage: createStorage() };
}
