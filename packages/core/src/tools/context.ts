import type { ImapPool } from "../imap/pool.js";
import type { StorageAdapter } from "../storage/interface.js";

export interface ToolContext {
  userId: string;
  storage: StorageAdapter;
  imapPool?: ImapPool;
  /** Base URL of the server API — present only in server mode */
  setupBaseUrl?: string;
}
