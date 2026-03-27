import type { ImapPool } from "@mailmcp/imap";
import type { StorageAdapter } from "@mailmcp/storage";

export interface ToolContext {
  userId: string;
  storage: StorageAdapter;
  imapPool?: ImapPool;
  /** Base URL of the server API — present only in server mode */
  setupBaseUrl?: string;
}
