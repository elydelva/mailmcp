// Public API of @mailmcp/core

export * from "./imap/index.js";
export { decrypt, decryptToString, encrypt } from "./password.js";
export * from "./providers/index.js";
export * from "./smtp/index.js";
export * from "./storage/index.js";
export * from "./tools/accounts.js";
export * from "./tools/context.js";
// Tool handlers — re-exported explicitly to resolve naming conflicts with
// imap/smtp operations that share the same function names.
export type {
  BatchDeleteParams,
  BatchMarkParams,
  BatchMoveParams,
  DeleteEmailParams,
  EmailDeps,
  ForwardEmailParams,
  GetEmailParams,
  GetThreadParams,
  ListEmailsParams,
  ListFoldersParams,
  MarkEmailParams,
  MoveEmailParams,
  ReplyEmailParams,
  SearchEmailsParams,
  SendEmailParams,
} from "./tools/emails.js";
export {
  batchDelete,
  batchMark,
  batchMove,
  deleteEmail,
  forwardEmail,
  getEmail,
  getThread,
  listEmails,
  listFolders,
  markEmail,
  moveEmail,
  replyEmail,
  searchEmails,
  sendEmail,
} from "./tools/emails.js";
