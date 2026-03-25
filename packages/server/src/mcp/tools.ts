import type { ToolContext } from "@mailmcp/tools";
import {
  batchDelete,
  batchMark,
  batchMove,
  deleteAccount,
  deleteEmail,
  forwardEmail,
  getEmail,
  getThread,
  listAccounts,
  listEmails,
  listFolders,
  markEmail,
  moveEmail,
  replyEmail,
  searchEmails,
  sendEmail,
  setDefaultAccount,
  setupAccount,
} from "@mailmcp/tools";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

type McpContent = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

function ok(data: unknown): McpContent {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

function err(error: unknown): McpContent {
  const msg = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text", text: msg }], isError: true };
}

export function registerAccountTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "setup_account",
    {
      description: "Set up a new email account",
      inputSchema: z.object({
        email: z.string().email(),
        password: z.string().optional(),
        name: z.string().optional(),
      }),
    },
    async ({ email, password, name }) => {
      try {
        return ok(await setupAccount(ctx, { email, password, name }));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "list_accounts",
    {
      description: "List all configured email accounts",
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        return ok(await listAccounts(ctx, {}));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "delete_account",
    {
      description: "Delete an email account",
      inputSchema: z.object({ accountId: z.string() }),
      annotations: { destructiveHint: true },
    },
    async ({ accountId }) => {
      try {
        return ok(await deleteAccount(ctx, { accountId }));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "set_default_account",
    {
      description: "Set an account as the default",
      inputSchema: z.object({ accountId: z.string() }),
      annotations: { idempotentHint: true },
    },
    async ({ accountId }) => {
      try {
        return ok(await setDefaultAccount(ctx, { accountId }));
      } catch (e) {
        return err(e);
      }
    },
  );
}

export function registerEmailTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "list_emails",
    {
      description: "List emails in a mailbox with pagination",
      inputSchema: z.object({
        accountId: z.string().optional(),
        mailbox: z.string().optional(),
        page: z.number().int().positive().optional(),
        limit: z.number().int().positive().optional(),
        returnBody: z.boolean().optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    async (params) => {
      try {
        return ok(await listEmails(ctx, params));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "get_email",
    {
      description: "Get a single email by UID",
      inputSchema: z.object({
        accountId: z.string().optional(),
        mailbox: z.string().optional(),
        uid: z.number().int().positive(),
      }),
      annotations: { readOnlyHint: true },
    },
    async (params) => {
      try {
        return ok(await getEmail(ctx, params));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "list_folders",
    {
      description: "List all mailbox folders",
      inputSchema: z.object({ accountId: z.string().optional() }),
      annotations: { readOnlyHint: true },
    },
    async (params) => {
      try {
        return ok(await listFolders(ctx, params));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "get_thread",
    {
      description: "Get an email thread by UID",
      inputSchema: z.object({
        accountId: z.string().optional(),
        mailbox: z.string().optional(),
        uid: z.number().int().positive(),
      }),
      annotations: { readOnlyHint: true },
    },
    async (params) => {
      try {
        return ok(await getThread(ctx, params));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "search_emails",
    {
      description: "Search emails in a mailbox",
      inputSchema: z.object({
        accountId: z.string().optional(),
        mailbox: z.string().optional(),
        query: z.string(),
        limit: z.number().int().positive().optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    async (params) => {
      try {
        return ok(await searchEmails(ctx, params));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "send_email",
    {
      description: "Send a new email",
      inputSchema: z.object({
        accountId: z.string().optional(),
        to: z.union([z.string(), z.array(z.string())]),
        subject: z.string(),
        text: z.string().optional(),
        html: z.string().optional(),
      }),
    },
    async (params) => {
      try {
        return ok(await sendEmail(ctx, params));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "reply_email",
    {
      description: "Reply to an existing email",
      inputSchema: z.object({
        accountId: z.string().optional(),
        originalMessageId: z.string(),
        originalReferences: z.string().optional(),
        to: z.union([z.string(), z.array(z.string())]),
        subject: z.string(),
        text: z.string().optional(),
        html: z.string().optional(),
      }),
    },
    async (params) => {
      try {
        return ok(await replyEmail(ctx, params));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "forward_email",
    {
      description: "Forward an email",
      inputSchema: z.object({
        accountId: z.string().optional(),
        to: z.union([z.string(), z.array(z.string())]),
        subject: z.string(),
        originalText: z.string(),
        text: z.string().optional(),
        html: z.string().optional(),
      }),
    },
    async (params) => {
      try {
        return ok(await forwardEmail(ctx, params));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "move_email",
    {
      description: "Move an email to another mailbox",
      inputSchema: z.object({
        accountId: z.string().optional(),
        uid: z.number().int().positive(),
        mailbox: z.string(),
        destination: z.string(),
      }),
      annotations: { destructiveHint: true },
    },
    async (params) => {
      try {
        return ok(await moveEmail(ctx, params));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "delete_email",
    {
      description: "Permanently delete an email",
      inputSchema: z.object({
        accountId: z.string().optional(),
        uid: z.number().int().positive(),
        mailbox: z.string(),
      }),
      annotations: { destructiveHint: true },
    },
    async (params) => {
      try {
        return ok(await deleteEmail(ctx, params));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "mark_email",
    {
      description: "Mark an email as read/unread or flagged/unflagged",
      inputSchema: z.object({
        accountId: z.string().optional(),
        uid: z.number().int().positive(),
        mailbox: z.string(),
        read: z.boolean().optional(),
        flagged: z.boolean().optional(),
      }),
      annotations: { idempotentHint: true },
    },
    async (params) => {
      try {
        return ok(await markEmail(ctx, params));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "batch_move",
    {
      description: "Move multiple emails to another mailbox",
      inputSchema: z.object({
        accountId: z.string().optional(),
        uids: z.array(z.number().int().positive()),
        mailbox: z.string(),
        destination: z.string(),
      }),
      annotations: { destructiveHint: true },
    },
    async (params) => {
      try {
        return ok(await batchMove(ctx, params));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "batch_delete",
    {
      description: "Permanently delete multiple emails",
      inputSchema: z.object({
        accountId: z.string().optional(),
        uids: z.array(z.number().int().positive()),
        mailbox: z.string(),
      }),
      annotations: { destructiveHint: true },
    },
    async (params) => {
      try {
        return ok(await batchDelete(ctx, params));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "batch_mark",
    {
      description: "Mark multiple emails as read/unread or flagged/unflagged",
      inputSchema: z.object({
        accountId: z.string().optional(),
        uids: z.array(z.number().int().positive()),
        mailbox: z.string(),
        read: z.boolean().optional(),
        flagged: z.boolean().optional(),
      }),
      annotations: { idempotentHint: true },
    },
    async (params) => {
      try {
        return ok(await batchMark(ctx, params));
      } catch (e) {
        return err(e);
      }
    },
  );
}
