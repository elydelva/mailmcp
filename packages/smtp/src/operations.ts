import type { EmailAccount } from "@mailmcp/storage";
import { createSmtpTransport } from "./client.js";

export interface AttachmentInput {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailInput {
  account: EmailAccount;
  password: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: AttachmentInput[];
}

export interface ReplyEmailInput {
  account: EmailAccount;
  password: string;
  /** Message-ID header of the original email */
  originalMessageId: string;
  /** References header of the original email (chain) */
  originalReferences?: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

export interface ForwardEmailInput {
  account: EmailAccount;
  password: string;
  to: string | string[];
  /** Typically "Fwd: original subject" */
  subject: string;
  /** Body of the original email (plain text) */
  originalText: string;
  /** Optional preamble from the forwarder */
  text?: string;
  html?: string;
}

function fromAddress(account: EmailAccount): string {
  return account.name ? `${account.name} <${account.email}>` : account.email;
}

/**
 * Prefixes each line of the original text with "> " for quoting.
 */
export function quoteText(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

/**
 * Sends a new email.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ messageId: string }> {
  const { account, password, to, subject, text, html, attachments } = input;
  const transporter = createSmtpTransport(account, password);

  const info = await transporter.sendMail({
    from: fromAddress(account),
    to,
    subject,
    text,
    html,
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });

  return { messageId: info.messageId };
}

/**
 * Sends a reply to an existing email, setting In-Reply-To and References headers.
 */
export async function replyEmail(input: ReplyEmailInput): Promise<{ messageId: string }> {
  const { account, password, originalMessageId, originalReferences, to, subject, text, html } =
    input;

  const transporter = createSmtpTransport(account, password);

  // Build the References chain: existing references + the message we're replying to
  const references = originalReferences
    ? `${originalReferences} ${originalMessageId}`
    : originalMessageId;

  const info = await transporter.sendMail({
    from: fromAddress(account),
    to,
    subject,
    text,
    html,
    headers: {
      "In-Reply-To": originalMessageId,
      References: references,
    },
  });

  return { messageId: info.messageId };
}

/**
 * Forwards an email, quoting the original body with "> " per line.
 */
export async function forwardEmail(input: ForwardEmailInput): Promise<{ messageId: string }> {
  const { account, password, to, subject, originalText, text, html } = input;

  const transporter = createSmtpTransport(account, password);

  const quoted = quoteText(originalText);
  const fullText = text ? `${text}\n\n${quoted}` : quoted;

  const info = await transporter.sendMail({
    from: fromAddress(account),
    to,
    subject,
    text: fullText,
    html,
  });

  return { messageId: info.messageId };
}
