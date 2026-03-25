/**
 * Layer 1 — MIME parsing
 *
 * Responsibility: decode the raw MIME message (quoted-printable, base64,
 * multipart) and expose a typed ParsedMail object.
 * No HTML cleaning or Markdown conversion happens here.
 */

import { simpleParser } from "mailparser";

export interface Attachment {
  filename: string;
  contentType: string;
  size: number;
}

export interface ParsedMail {
  subject: string;
  from: string;
  date: Date;
  /** Decoded HTML part, if present. */
  html: string | null;
  /** Decoded text/plain part, if present. */
  text: string | null;
  attachments: Attachment[];
}

export async function parseMime(rawMime: string): Promise<ParsedMail> {
  const parsed = await simpleParser(rawMime);

  return {
    subject: parsed.subject ?? "",
    from: parsed.from?.text ?? "",
    date: parsed.date ?? new Date(0),
    html: parsed.html !== false && parsed.html ? parsed.html : null,
    text: parsed.text ?? null,
    attachments: (parsed.attachments ?? []).map((a) => ({
      filename: a.filename ?? "unnamed",
      contentType: a.contentType,
      size: a.size,
    })),
  };
}
