import type { ImapFlow } from "imapflow";

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface MailboxInfo {
  name: string;
  delimiter: string;
  flags: string[];
}

export interface EmailSummary {
  uid: number;
  subject: string;
  from: string;
  date: Date;
  read: boolean;
  flagged: boolean;
  bodyText?: string;
}

export interface AttachmentInfo {
  filename: string;
  contentType: string;
  size: number;
}

export interface EmailMessage extends EmailSummary {
  body: string;
  html?: string;
  attachments: AttachmentInfo[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function envelopeFrom(
  envelope:
    | {
        from?: { name?: string; address?: string }[];
      }
    | undefined,
): string {
  if (!envelope?.from?.length) return "";
  const addr = envelope.from[0];
  if (addr.name) return `${addr.name} <${addr.address ?? ""}>`;
  return addr.address ?? "";
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * List all mailbox folders.
 */
export async function listFolders(client: ImapFlow): Promise<MailboxInfo[]> {
  const folders = await client.list();
  return folders.map((f) => ({
    name: f.path,
    delimiter: f.delimiter ?? "/",
    flags: Array.from(f.flags ?? []),
  }));
}

export interface ListEmailsOptions {
  page: number;
  limit: number;
  returnBody?: boolean;
}

/**
 * List emails in a mailbox with pagination.
 */
export async function listEmails(
  client: ImapFlow,
  mailbox: string,
  opts: ListEmailsOptions,
): Promise<EmailSummary[]> {
  const { page, limit, returnBody = false } = opts;

  try {
    await client.mailboxOpen(mailbox);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to open mailbox "${mailbox}": ${msg}`);
  }

  const fetchQuery = {
    uid: true,
    flags: true,
    envelope: true,
    ...(returnBody ? { bodyParts: ["1"] as string[] } : {}),
  };

  const start = (page - 1) * limit + 1;
  const end = page * limit;
  const range = `${start}:${end}`;

  const results: EmailSummary[] = [];

  try {
    for await (const msg of client.fetch(range, fetchQuery)) {
      const envelope = msg.envelope;
      const bodyText = returnBody ? msg.bodyParts?.get("1")?.toString("utf-8") : undefined;

      results.push({
        uid: msg.uid,
        subject: envelope?.subject ?? "(no subject)",
        from: envelopeFrom(envelope),
        date: envelope?.date instanceof Date ? envelope.date : new Date(envelope?.date ?? 0),
        read: msg.flags?.has("\\Seen") ?? false,
        flagged: msg.flags?.has("\\Flagged") ?? false,
        ...(bodyText !== undefined ? { bodyText } : {}),
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch emails: ${msg}`);
  }

  return results;
}

/**
 * Fetch a single email by UID, including body and attachments.
 */
export async function getEmail(
  client: ImapFlow,
  mailbox: string,
  uid: number,
): Promise<EmailMessage | null> {
  await client.mailboxOpen(mailbox);

  const msg = await client.fetchOne(
    `${uid}`,
    {
      uid: true,
      flags: true,
      envelope: true,
      bodyParts: ["1", "2"] as unknown as string[],
      bodyStructure: true,
    },
    { uid: true },
  );

  if (!msg) return null;

  const envelope = msg.envelope;
  const bodyBuf = msg.bodyParts?.get("1");
  const htmlBuf = msg.bodyParts?.get("2");

  const attachments: AttachmentInfo[] = [];
  if (msg.bodyStructure) {
    const parts =
      (
        msg.bodyStructure as {
          childNodes?: {
            type: string;
            disposition?: { value: string };
            parameters?: Record<string, string>;
            size?: number;
          }[];
        }
      ).childNodes ?? [];
    for (const part of parts) {
      if (part.disposition?.value?.toLowerCase() === "attachment") {
        attachments.push({
          filename: part.parameters?.name ?? "attachment",
          contentType: part.type ?? "application/octet-stream",
          size: part.size ?? 0,
        });
      }
    }
  }

  return {
    uid: msg.uid,
    subject: envelope?.subject ?? "(no subject)",
    from: envelopeFrom(envelope),
    date: envelope?.date instanceof Date ? envelope.date : new Date(envelope?.date ?? 0),
    read: msg.flags?.has("\\Seen") ?? false,
    flagged: msg.flags?.has("\\Flagged") ?? false,
    body: bodyBuf?.toString("utf-8") ?? "",
    html: htmlBuf?.toString("utf-8"),
    attachments,
  };
}

/**
 * Search emails in a mailbox using a text query (searches subject and body).
 */
export async function searchEmails(
  client: ImapFlow,
  mailbox: string,
  query: string,
): Promise<EmailSummary[]> {
  await client.mailboxOpen(mailbox);

  const uids = await client.search({ text: query }, { uid: true });
  if (!uids || uids.length === 0) return [];

  const results: EmailSummary[] = [];
  for await (const msg of client.fetch(
    uids,
    { uid: true, flags: true, envelope: true },
    { uid: true },
  )) {
    const envelope = msg.envelope;
    results.push({
      uid: msg.uid,
      subject: envelope?.subject ?? "(no subject)",
      from: envelopeFrom(envelope),
      date: envelope?.date instanceof Date ? envelope.date : new Date(envelope?.date ?? 0),
      read: msg.flags?.has("\\Seen") ?? false,
      flagged: msg.flags?.has("\\Flagged") ?? false,
    });
  }

  return results;
}

/**
 * Move a message from one mailbox to another by UID.
 */
export async function moveEmail(
  client: ImapFlow,
  uid: number,
  from: string,
  to: string,
): Promise<void> {
  await client.mailboxOpen(from);
  await client.messageMove(`${uid}`, to, { uid: true });
}

/**
 * Permanently delete a message by UID.
 */
export async function deleteEmail(client: ImapFlow, uid: number, mailbox: string): Promise<void> {
  await client.mailboxOpen(mailbox);
  await client.messageDelete(`${uid}`, { uid: true });
}

/**
 * Set read / flagged status on a message by UID.
 */
export async function markEmail(
  client: ImapFlow,
  uid: number,
  mailbox: string,
  flags: { read?: boolean; flagged?: boolean },
): Promise<void> {
  await client.mailboxOpen(mailbox);

  if (flags.read !== undefined) {
    if (flags.read) {
      await client.messageFlagsAdd(`${uid}`, ["\\Seen"], { uid: true });
    } else {
      await client.messageFlagsRemove(`${uid}`, ["\\Seen"], { uid: true });
    }
  }

  if (flags.flagged !== undefined) {
    if (flags.flagged) {
      await client.messageFlagsAdd(`${uid}`, ["\\Flagged"], { uid: true });
    } else {
      await client.messageFlagsRemove(`${uid}`, ["\\Flagged"], { uid: true });
    }
  }
}
