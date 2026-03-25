import { createStorage, initEncryptionKey } from "@mailmcp/storage";
import type { ToolContext } from "@mailmcp/tools";
import {
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
} from "@mailmcp/tools";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { logger } from "../logger.js";

type McpContent = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

function withErrorHandling<P>(
  toolName: string,
  handler: (params: P) => Promise<McpContent>,
): (params: P) => Promise<McpContent> {
  return async (params: P) => {
    try {
      return await handler(params);
    } catch (err) {
      let msg = err instanceof Error ? err.message : String(err);
      if (err instanceof Error && "responseText" in err) {
        const rt = (err as { responseText?: unknown }).responseText;
        if (typeof rt === "string" && rt) msg = rt;
      }
      logger.error(
        { tool: toolName, error: msg, stack: err instanceof Error ? err.stack : undefined, params },
        "Tool execution failed",
      );
      return { content: [{ type: "text", text: msg }], isError: true };
    }
  };
}

export async function startStdioServer(dataDir: string): Promise<void> {
  await initEncryptionKey(dataDir);
  process.env.STORAGE_BACKEND = "file";
  process.env.DB_PATH = `${dataDir}/db.json`;
  const storage = createStorage();
  const ctx: ToolContext = { userId: "local", storage };

  logger.info({ dataDir }, "Starting mailmcp stdio server");

  const server = new McpServer({ name: "mailmcp", version: "0.1.0" });

  // Account tools
  server.registerTool(
    "setup_account",
    {
      description: "Set up an email account",
      inputSchema: z.object({
        email: z.string(),
        password: z.string().optional(),
        name: z.string().optional(),
      }),
    },
    withErrorHandling("setup_account", async ({ email, password, name }) => {
      const result = await setupAccount(ctx, { email, password, name });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }),
  );

  server.registerTool(
    "list_accounts",
    {
      description: "List configured email accounts",
      annotations: { readOnlyHint: true },
    },
    withErrorHandling("list_accounts", async () => {
      const result = await listAccounts(ctx, {});
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }),
  );

  server.registerTool(
    "delete_account",
    {
      description: "Delete an email account",
      inputSchema: z.object({ accountId: z.string() }),
      annotations: { destructiveHint: true },
    },
    withErrorHandling("delete_account", async ({ accountId }) => {
      const result = await deleteAccount(ctx, { accountId });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }),
  );

  server.registerTool(
    "set_default_account",
    {
      description: "Set the default email account",
      inputSchema: z.object({ accountId: z.string() }),
      annotations: { idempotentHint: true },
    },
    withErrorHandling("set_default_account", async ({ accountId }) => {
      const result = await setDefaultAccount(ctx, { accountId });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }),
  );

  // Email tools
  server.registerTool(
    "list_emails",
    {
      description: "List emails in a mailbox",
      inputSchema: z.object({
        accountId: z.string().optional(),
        mailbox: z.string().optional(),
        page: z.number().optional(),
        limit: z.number().optional(),
        returnBody: z.boolean().optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    withErrorHandling("list_emails", async ({ accountId, mailbox, page, limit, returnBody }) => {
      const result = await listEmails(ctx, {
        accountId,
        mailbox,
        page: page ?? 1,
        limit: limit ?? 20,
        returnBody,
      });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }),
  );

  server.registerTool(
    "get_email",
    {
      description: "Get a specific email",
      inputSchema: z.object({
        accountId: z.string().optional(),
        mailbox: z.string().optional(),
        uid: z.number(),
      }),
      annotations: { readOnlyHint: true },
    },
    withErrorHandling("get_email", async ({ accountId, mailbox, uid }) => {
      const result = await getEmail(ctx, { accountId, mailbox: mailbox ?? "INBOX", uid });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }),
  );

  server.registerTool(
    "search_emails",
    {
      description: "Search emails",
      inputSchema: z.object({
        accountId: z.string().optional(),
        mailbox: z.string().optional(),
        query: z.string(),
        limit: z.number().optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    withErrorHandling("search_emails", async ({ accountId, mailbox, query, limit }) => {
      const result = await searchEmails(ctx, { accountId, mailbox, query, limit });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }),
  );

  server.registerTool(
    "send_email",
    {
      description: "Send an email",
      inputSchema: z.object({
        accountId: z.string(),
        to: z.array(z.string()),
        subject: z.string(),
        text: z.string().optional(),
        html: z.string().optional(),
      }),
    },
    withErrorHandling("send_email", async ({ accountId, to, subject, text, html }) => {
      const result = await sendEmail(ctx, { accountId, to, subject, text, html });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }),
  );

  server.registerTool(
    "mark_email",
    {
      description: "Mark an email as read/unread/flagged",
      inputSchema: z.object({
        accountId: z.string().optional(),
        mailbox: z.string(),
        uid: z.number(),
        read: z.boolean().optional(),
        flagged: z.boolean().optional(),
      }),
      annotations: { idempotentHint: true },
    },
    withErrorHandling("mark_email", async ({ accountId, mailbox, uid, read, flagged }) => {
      const result = await markEmail(ctx, { accountId, mailbox, uid, read, flagged });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }),
  );

  server.registerTool(
    "move_email",
    {
      description: "Move an email to another folder",
      inputSchema: z.object({
        accountId: z.string().optional(),
        mailbox: z.string(),
        uid: z.number(),
        destination: z.string(),
      }),
      annotations: { destructiveHint: true },
    },
    withErrorHandling("move_email", async ({ accountId, mailbox, uid, destination }) => {
      const result = await moveEmail(ctx, { accountId, mailbox, uid, destination });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }),
  );

  server.registerTool(
    "delete_email",
    {
      description: "Delete an email",
      inputSchema: z.object({
        accountId: z.string().optional(),
        mailbox: z.string(),
        uid: z.number(),
      }),
      annotations: { destructiveHint: true },
    },
    withErrorHandling("delete_email", async ({ accountId, mailbox, uid }) => {
      const result = await deleteEmail(ctx, { accountId, mailbox, uid });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
