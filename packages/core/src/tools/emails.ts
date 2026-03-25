import {
  deleteEmail as imapDeleteEmail,
  getEmail as imapGetEmail,
  listEmails as imapListEmails,
  listFolders as imapListFolders,
  markEmail as imapMarkEmail,
  moveEmail as imapMoveEmail,
  searchEmails as imapSearchEmails,
} from "../imap/operations.js";
import type { ImapPool } from "../imap/pool.js";
import { imapPool } from "../imap/pool.js";
import { decryptToString } from "../password.js";
import type { AttachmentInput } from "../smtp/operations.js";
import {
  forwardEmail as smtpForwardEmail,
  replyEmail as smtpReplyEmail,
  sendEmail as smtpSendEmail,
} from "../smtp/operations.js";
import type { ToolContext } from "./context.js";

// ── Deps injection ───────────────────────────────────────────────────────────

export type EmailDeps = {
  pool?: ImapPool;
  /** Override SMTP sender for testing */
  smtpSend?: typeof smtpSendEmail;
  smtpReply?: typeof smtpReplyEmail;
  smtpForward?: typeof smtpForwardEmail;
};

// ── Shared helper ────────────────────────────────────────────────────────────

async function resolveAccount(ctx: ToolContext, accountId?: string) {
  const accounts = await ctx.storage.listAccounts(ctx.userId);
  const account = accountId
    ? accounts.find((a) => a.id === accountId)
    : (accounts.find((a) => a.isDefault) ?? accounts[0]);
  if (!account) throw new Error("No account configured");
  const password = decryptToString(account.passwordEnc);
  return { account, password };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ListEmailsParams {
  accountId?: string;
  mailbox?: string;
  page?: number;
  limit?: number;
  returnBody?: boolean;
}

export interface GetEmailParams {
  accountId?: string;
  mailbox?: string;
  uid: number;
}

export interface ListFoldersParams {
  accountId?: string;
}

export interface GetThreadParams {
  accountId?: string;
  mailbox?: string;
  uid: number;
}

export interface SearchEmailsParams {
  accountId?: string;
  mailbox?: string;
  query: string;
  limit?: number;
}

export interface SendEmailParams {
  accountId?: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: AttachmentInput[];
}

export interface ReplyEmailParams {
  accountId?: string;
  originalMessageId: string;
  originalReferences?: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

export interface ForwardEmailParams {
  accountId?: string;
  to: string | string[];
  subject: string;
  originalText: string;
  text?: string;
  html?: string;
}

export interface MoveEmailParams {
  accountId?: string;
  uid: number;
  mailbox: string;
  destination: string;
}

export interface DeleteEmailParams {
  accountId?: string;
  uid: number;
  mailbox: string;
}

export interface MarkEmailParams {
  accountId?: string;
  uid: number;
  mailbox: string;
  read?: boolean;
  flagged?: boolean;
}

export interface BatchMoveParams {
  accountId?: string;
  uids: number[];
  mailbox: string;
  destination: string;
}

export interface BatchDeleteParams {
  accountId?: string;
  uids: number[];
  mailbox: string;
}

export interface BatchMarkParams {
  accountId?: string;
  uids: number[];
  mailbox: string;
  read?: boolean;
  flagged?: boolean;
}

// ── Read tools ────────────────────────────────────────────────────────────────

export async function listEmails(
  ctx: ToolContext,
  params: ListEmailsParams,
  _deps: EmailDeps = {},
) {
  const { accountId, mailbox = "INBOX", page = 1, limit = 20, returnBody } = params;
  const { account, password } = await resolveAccount(ctx, accountId);
  const pool = _deps.pool ?? ctx.imapPool ?? imapPool;
  const client = await pool.getClient(ctx.userId, account, password);
  const emails = await imapListEmails(client, mailbox, { page, limit, returnBody });
  return { emails };
}

export async function getEmail(ctx: ToolContext, params: GetEmailParams, _deps: EmailDeps = {}) {
  const { accountId, mailbox = "INBOX", uid } = params;
  const { account, password } = await resolveAccount(ctx, accountId);
  const pool = _deps.pool ?? ctx.imapPool ?? imapPool;
  const client = await pool.getClient(ctx.userId, account, password);
  const email = await imapGetEmail(client, mailbox, uid);
  return { email };
}

export async function listFolders(
  ctx: ToolContext,
  params: ListFoldersParams,
  _deps: EmailDeps = {},
) {
  const { accountId } = params;
  const { account, password } = await resolveAccount(ctx, accountId);
  const pool = _deps.pool ?? ctx.imapPool ?? imapPool;
  const client = await pool.getClient(ctx.userId, account, password);
  const folders = await imapListFolders(client);
  return { folders };
}

export async function getThread(ctx: ToolContext, params: GetThreadParams, _deps: EmailDeps = {}) {
  const { accountId, mailbox = "INBOX", uid } = params;
  const { account, password } = await resolveAccount(ctx, accountId);
  const pool = _deps.pool ?? ctx.imapPool ?? imapPool;
  const client = await pool.getClient(ctx.userId, account, password);
  const email = await imapGetEmail(client, mailbox, uid);
  if (!email) return { thread: [] };
  const subject = email.subject.replace(/^(Re:|Fwd:)\s*/i, "").trim();
  const related = await imapSearchEmails(client, mailbox, subject);
  return { thread: related };
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchEmails(
  ctx: ToolContext,
  params: SearchEmailsParams,
  _deps: EmailDeps = {},
) {
  const { accountId, mailbox = "INBOX", query, limit = 20 } = params;
  const { account, password } = await resolveAccount(ctx, accountId);
  const pool = _deps.pool ?? ctx.imapPool ?? imapPool;
  const client = await pool.getClient(ctx.userId, account, password);
  const all = await imapSearchEmails(client, mailbox, query);
  return { emails: all.slice(0, limit) };
}

// ── Action tools ──────────────────────────────────────────────────────────────

export async function sendEmail(ctx: ToolContext, params: SendEmailParams, _deps: EmailDeps = {}) {
  const { accountId, to, subject, text, html, attachments } = params;
  const { account, password } = await resolveAccount(ctx, accountId);
  const send = _deps.smtpSend ?? smtpSendEmail;
  return send({ account, password, to, subject, text, html, attachments });
}

export async function replyEmail(
  ctx: ToolContext,
  params: ReplyEmailParams,
  _deps: EmailDeps = {},
) {
  const { accountId, originalMessageId, originalReferences, to, subject, text, html } = params;
  const { account, password } = await resolveAccount(ctx, accountId);
  const reply = _deps.smtpReply ?? smtpReplyEmail;
  return reply({
    account,
    password,
    originalMessageId,
    originalReferences,
    to,
    subject,
    text,
    html,
  });
}

export async function forwardEmail(
  ctx: ToolContext,
  params: ForwardEmailParams,
  _deps: EmailDeps = {},
) {
  const { accountId, to, subject, originalText, text, html } = params;
  const { account, password } = await resolveAccount(ctx, accountId);
  const forward = _deps.smtpForward ?? smtpForwardEmail;
  const result = await forward({ account, password, to, subject, originalText, text, html });
  return result;
}

export async function moveEmail(ctx: ToolContext, params: MoveEmailParams, _deps: EmailDeps = {}) {
  const { accountId, uid, mailbox, destination } = params;
  const { account, password } = await resolveAccount(ctx, accountId);
  const pool = _deps.pool ?? ctx.imapPool ?? imapPool;
  const client = await pool.getClient(ctx.userId, account, password);
  await imapMoveEmail(client, uid, mailbox, destination);
  return { status: "ok" as const };
}

export async function deleteEmail(
  ctx: ToolContext,
  params: DeleteEmailParams,
  _deps: EmailDeps = {},
) {
  const { accountId, uid, mailbox } = params;
  const { account, password } = await resolveAccount(ctx, accountId);
  const pool = _deps.pool ?? ctx.imapPool ?? imapPool;
  const client = await pool.getClient(ctx.userId, account, password);
  await imapDeleteEmail(client, uid, mailbox);
  return { status: "ok" as const };
}

export async function markEmail(ctx: ToolContext, params: MarkEmailParams, _deps: EmailDeps = {}) {
  const { accountId, uid, mailbox, read, flagged } = params;
  const { account, password } = await resolveAccount(ctx, accountId);
  const pool = _deps.pool ?? ctx.imapPool ?? imapPool;
  const client = await pool.getClient(ctx.userId, account, password);
  await imapMarkEmail(client, uid, mailbox, { read, flagged });
  return { status: "ok" as const };
}

// ── Batch tools ───────────────────────────────────────────────────────────────

export async function batchMove(ctx: ToolContext, params: BatchMoveParams, _deps: EmailDeps = {}) {
  const { accountId, uids, mailbox, destination } = params;
  const { account, password } = await resolveAccount(ctx, accountId);
  const pool = _deps.pool ?? ctx.imapPool ?? imapPool;
  const client = await pool.getClient(ctx.userId, account, password);
  for (const uid of uids) {
    await imapMoveEmail(client, uid, mailbox, destination);
  }
  return { status: "ok" as const, moved: uids.length };
}

export async function batchDelete(
  ctx: ToolContext,
  params: BatchDeleteParams,
  _deps: EmailDeps = {},
) {
  const { accountId, uids, mailbox } = params;
  const { account, password } = await resolveAccount(ctx, accountId);
  const pool = _deps.pool ?? ctx.imapPool ?? imapPool;
  const client = await pool.getClient(ctx.userId, account, password);
  for (const uid of uids) {
    await imapDeleteEmail(client, uid, mailbox);
  }
  return { status: "ok" as const, deleted: uids.length };
}

export async function batchMark(ctx: ToolContext, params: BatchMarkParams, _deps: EmailDeps = {}) {
  const { accountId, uids, mailbox, read, flagged } = params;
  const { account, password } = await resolveAccount(ctx, accountId);
  const pool = _deps.pool ?? ctx.imapPool ?? imapPool;
  const client = await pool.getClient(ctx.userId, account, password);
  for (const uid of uids) {
    await imapMarkEmail(client, uid, mailbox, { read, flagged });
  }
  return { status: "ok" as const, marked: uids.length };
}
