import type { ToolContext } from "@mailmcp/core";
import {
  createStorage,
  deleteAccount,
  deleteEmail,
  getEmail,
  listAccounts,
  listEmails,
  markEmail,
  moveEmail,
  searchEmails,
  sendEmail,
  setDefaultAccount,
  setupAccount,
} from "@mailmcp/core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

export async function startStdioServer(dataDir: string): Promise<void> {
  process.env.STORAGE_BACKEND = "file";
  process.env.DB_PATH = `${dataDir}/db.json`;
  const storage = createStorage();
  const ctx: ToolContext = { userId: "local", storage };

  const server = new McpServer({ name: "mailmcp", version: "0.1.0" });

  // Account tools
  server.tool(
    "setup_account",
    "Set up an email account",
    {
      email: z.string(),
      password: z.string().optional(),
      name: z.string().optional(),
    },
    async (params) => {
      const result = await setupAccount(ctx, params);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.tool("list_accounts", "List configured email accounts", {}, async () => {
    const result = await listAccounts(ctx, {});
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  });

  server.tool(
    "delete_account",
    "Delete an email account",
    {
      accountId: z.string(),
    },
    async (params) => {
      const result = await deleteAccount(ctx, params);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    "set_default_account",
    "Set the default email account",
    {
      accountId: z.string(),
    },
    async (params) => {
      const result = await setDefaultAccount(ctx, params);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  // Email tools
  server.tool(
    "list_emails",
    "List emails in a mailbox",
    {
      accountId: z.string().optional(),
      mailbox: z.string().optional(),
      page: z.number().optional(),
      limit: z.number().optional(),
      returnBody: z.boolean().optional(),
    },
    async (params) => {
      const result = await listEmails(ctx, { page: 1, limit: 20, ...params });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    "get_email",
    "Get a specific email",
    {
      accountId: z.string().optional(),
      mailbox: z.string().optional(),
      uid: z.number(),
    },
    async (params) => {
      const result = await getEmail(ctx, { mailbox: "INBOX", ...params });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    "search_emails",
    "Search emails",
    {
      accountId: z.string().optional(),
      mailbox: z.string().optional(),
      query: z.string(),
      limit: z.number().optional(),
    },
    async (params) => {
      const result = await searchEmails(ctx, params);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    "send_email",
    "Send an email",
    {
      accountId: z.string(),
      to: z.array(z.string()),
      subject: z.string(),
      text: z.string().optional(),
      html: z.string().optional(),
      cc: z.array(z.string()).optional(),
      bcc: z.array(z.string()).optional(),
    },
    async (params) => {
      const result = await sendEmail(ctx, params);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    "mark_email",
    "Mark an email as read/unread/flagged",
    {
      accountId: z.string().optional(),
      mailbox: z.string(),
      uid: z.number(),
      read: z.boolean().optional(),
      flagged: z.boolean().optional(),
    },
    async ({ accountId, mailbox, uid, read, flagged }) => {
      const result = await markEmail(ctx, { accountId, mailbox, uid, read, flagged });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    "move_email",
    "Move an email to another folder",
    {
      accountId: z.string().optional(),
      mailbox: z.string(),
      uid: z.number(),
      destination: z.string(),
    },
    async ({ accountId, mailbox, uid, destination }) => {
      const result = await moveEmail(ctx, { accountId, mailbox, uid, destination });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    "delete_email",
    "Delete an email",
    {
      accountId: z.string().optional(),
      mailbox: z.string(),
      uid: z.number(),
    },
    async ({ accountId, mailbox, uid }) => {
      const result = await deleteEmail(ctx, { accountId, mailbox, uid });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
