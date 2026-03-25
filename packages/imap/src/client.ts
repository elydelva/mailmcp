import type { EmailAccount } from "@mailmcp/core";
import { ImapFlow } from "imapflow";

/**
 * Factory to create a configured ImapFlow client for the given account.
 * Does NOT connect — caller must call client.connect() before use.
 */
export function createImapClient(account: EmailAccount, password: string): ImapFlow {
  const timeoutMs = Number(process.env.IMAP_TIMEOUT_MS ?? 30000);

  return new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapSecure,
    connectionTimeout: timeoutMs,
    socketTimeout: timeoutMs,
    auth: {
      user: account.username,
      pass: password,
    },
    logger: false,
    logRaw: false,
  });
}
