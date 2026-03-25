import type { ToolContext } from "@mailmcp/core";
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
} from "@mailmcp/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function textResult(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

// Cast to any to work around TS2589 (type instantiation excessively deep) caused
// by the MCP SDK's Zod-based tool overloads.
// biome-ignore lint/suspicious/noExplicitAny: necessary cast for SDK overload resolution
type AnyServer = any;

export function registerAccountTools(server: McpServer, ctx: ToolContext): void {
  const s = server as AnyServer;

  s.tool(
    "setup_account",
    "Set up a new email account",
    {
      email: z.string().email(),
      password: z.string().optional(),
      name: z.string().optional(),
    },
    async ({ email, password, name }: { email: string; password?: string; name?: string }) => {
      return textResult(await setupAccount(ctx, { email, password, name }));
    },
  );

  s.tool("list_accounts", "List all configured email accounts", {}, async () =>
    textResult(await listAccounts(ctx, {})),
  );

  s.tool(
    "delete_account",
    "Delete an email account",
    {
      accountId: z.string(),
    },
    async ({ accountId }: { accountId: string }) =>
      textResult(await deleteAccount(ctx, { accountId })),
  );

  s.tool(
    "set_default_account",
    "Set an account as the default",
    {
      accountId: z.string(),
    },
    async ({ accountId }: { accountId: string }) =>
      textResult(await setDefaultAccount(ctx, { accountId })),
  );
}

export function registerEmailTools(server: McpServer, ctx: ToolContext): void {
  const s = server as AnyServer;

  s.tool(
    "list_emails",
    "List emails in a mailbox with pagination",
    {
      accountId: z.string().optional(),
      mailbox: z.string().optional(),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().optional(),
      returnBody: z.boolean().optional(),
    },
    async (params: {
      accountId?: string;
      mailbox?: string;
      page?: number;
      limit?: number;
      returnBody?: boolean;
    }) => textResult(await listEmails(ctx, params)),
  );

  s.tool(
    "get_email",
    "Get a single email by UID",
    {
      accountId: z.string().optional(),
      mailbox: z.string().optional(),
      uid: z.number().int().positive(),
    },
    async (params: { accountId?: string; mailbox?: string; uid: number }) =>
      textResult(await getEmail(ctx, params)),
  );

  s.tool(
    "list_folders",
    "List all mailbox folders",
    {
      accountId: z.string().optional(),
    },
    async (params: { accountId?: string }) => textResult(await listFolders(ctx, params)),
  );

  s.tool(
    "get_thread",
    "Get an email thread by UID",
    {
      accountId: z.string().optional(),
      mailbox: z.string().optional(),
      uid: z.number().int().positive(),
    },
    async (params: { accountId?: string; mailbox?: string; uid: number }) =>
      textResult(await getThread(ctx, params)),
  );

  s.tool(
    "search_emails",
    "Search emails in a mailbox",
    {
      accountId: z.string().optional(),
      mailbox: z.string().optional(),
      query: z.string(),
      limit: z.number().int().positive().optional(),
    },
    async (params: { accountId?: string; mailbox?: string; query: string; limit?: number }) =>
      textResult(await searchEmails(ctx, params)),
  );

  s.tool(
    "send_email",
    "Send a new email",
    {
      accountId: z.string().optional(),
      to: z.union([z.string(), z.array(z.string())]),
      subject: z.string(),
      text: z.string().optional(),
      html: z.string().optional(),
    },
    async (params: {
      accountId?: string;
      to: string | string[];
      subject: string;
      text?: string;
      html?: string;
    }) => textResult(await sendEmail(ctx, params)),
  );

  s.tool(
    "reply_email",
    "Reply to an existing email",
    {
      accountId: z.string().optional(),
      originalMessageId: z.string(),
      originalReferences: z.string().optional(),
      to: z.union([z.string(), z.array(z.string())]),
      subject: z.string(),
      text: z.string().optional(),
      html: z.string().optional(),
    },
    async (params: {
      accountId?: string;
      originalMessageId: string;
      originalReferences?: string;
      to: string | string[];
      subject: string;
      text?: string;
      html?: string;
    }) => textResult(await replyEmail(ctx, params)),
  );

  s.tool(
    "forward_email",
    "Forward an email",
    {
      accountId: z.string().optional(),
      to: z.union([z.string(), z.array(z.string())]),
      subject: z.string(),
      originalText: z.string(),
      text: z.string().optional(),
      html: z.string().optional(),
    },
    async (params: {
      accountId?: string;
      to: string | string[];
      subject: string;
      originalText: string;
      text?: string;
      html?: string;
    }) => textResult(await forwardEmail(ctx, params)),
  );

  s.tool(
    "move_email",
    "Move an email to another mailbox",
    {
      accountId: z.string().optional(),
      uid: z.number().int().positive(),
      mailbox: z.string(),
      destination: z.string(),
    },
    async (params: { accountId?: string; uid: number; mailbox: string; destination: string }) =>
      textResult(await moveEmail(ctx, params)),
  );

  s.tool(
    "delete_email",
    "Permanently delete an email",
    {
      accountId: z.string().optional(),
      uid: z.number().int().positive(),
      mailbox: z.string(),
    },
    async (params: { accountId?: string; uid: number; mailbox: string }) =>
      textResult(await deleteEmail(ctx, params)),
  );

  s.tool(
    "mark_email",
    "Mark an email as read/unread or flagged/unflagged",
    {
      accountId: z.string().optional(),
      uid: z.number().int().positive(),
      mailbox: z.string(),
      read: z.boolean().optional(),
      flagged: z.boolean().optional(),
    },
    async (params: {
      accountId?: string;
      uid: number;
      mailbox: string;
      read?: boolean;
      flagged?: boolean;
    }) => textResult(await markEmail(ctx, params)),
  );

  s.tool(
    "batch_move",
    "Move multiple emails to another mailbox",
    {
      accountId: z.string().optional(),
      uids: z.array(z.number().int().positive()),
      mailbox: z.string(),
      destination: z.string(),
    },
    async (params: { accountId?: string; uids: number[]; mailbox: string; destination: string }) =>
      textResult(await batchMove(ctx, params)),
  );

  s.tool(
    "batch_delete",
    "Permanently delete multiple emails",
    {
      accountId: z.string().optional(),
      uids: z.array(z.number().int().positive()),
      mailbox: z.string(),
    },
    async (params: { accountId?: string; uids: number[]; mailbox: string }) =>
      textResult(await batchDelete(ctx, params)),
  );

  s.tool(
    "batch_mark",
    "Mark multiple emails as read/unread or flagged/unflagged",
    {
      accountId: z.string().optional(),
      uids: z.array(z.number().int().positive()),
      mailbox: z.string(),
      read: z.boolean().optional(),
      flagged: z.boolean().optional(),
    },
    async (params: {
      accountId?: string;
      uids: number[];
      mailbox: string;
      read?: boolean;
      flagged?: boolean;
    }) => textResult(await batchMark(ctx, params)),
  );
}
