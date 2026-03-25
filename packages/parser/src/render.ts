/**
 * Pipeline entry point — wires the three layers together.
 *
 * Layer 1 (mime)     : MIME decode → ParsedMail
 * Layer 2 (extract)  : HTML → readability-cleaned HTML  (optional, non-blocking)
 * Layer 3 (markdown) : clean HTML → Markdown
 */

import { extractContent } from "./extract.js";
import { toMarkdown } from "./markdown.js";
import { type Attachment, parseMime } from "./mime.js";

export interface RenderedEmail {
  subject: string;
  from: string;
  date: Date;
  /** Primary output: HTML → Readability → Markdown */
  markdown: string;
  /** Decoded text/plain — used when no HTML part is present */
  plainText: string;
  hasHtml: boolean;
  attachments: Attachment[];
}

export async function renderEmail(rawMime: string): Promise<RenderedEmail> {
  const parsed = await parseMime(rawMime);

  let markdown = "";

  if (parsed.html) {
    const { html: cleanHtml } = extractContent(parsed.html);
    markdown = toMarkdown(cleanHtml);
  }

  return {
    subject: parsed.subject,
    from: parsed.from,
    date: parsed.date,
    markdown,
    plainText: parsed.text ?? "",
    hasHtml: parsed.html !== null,
    attachments: parsed.attachments,
  };
}
