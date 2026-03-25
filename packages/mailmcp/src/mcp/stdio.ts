import { createStorage, initEncryptionKey } from "@mailmcp/core";
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

type ToolHandler<T = unknown> = (
  params: T,
) => Promise<{ content: Array<{ type: "text"; text: string }> }>;

function withErrorHandling<T>(handler: ToolHandler<T>, toolName: string): ToolHandler<T> {
  return async (params: T) => {
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
      return { content: [{ type: "text", text: JSON.stringify({ error: msg }) }] };
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
  server.tool(
    "setup_account",
    "Set up an email account",
    {
      email: z.string(),
      password: z.string().optional(),
      name: z.string().optional(),
    },
    withErrorHandling(async (params: { email: string; password?: string; name?: string }) => {
      const result = await setupAccount(ctx, params);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }, "setup_account"),
  );

  server.tool(
    "list_accounts",
    "List configured email accounts",
    {},
    withErrorHandling(async () => {
      const result = await listAccounts(ctx, {});
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }, "list_accounts"),
  );

  server.tool(
    "delete_account",
    "Delete an email account",
    {
      accountId: z.string(),
    },
    withErrorHandling(async (params: { accountId: string }) => {
      const result = await deleteAccount(ctx, params);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }, "delete_account"),
  );

  server.tool(
    "set_default_account",
    "Set the default email account",
    {
      accountId: z.string(),
    },
    withErrorHandling(async (params: { accountId: string }) => {
      const result = await setDefaultAccount(ctx, params);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }, "set_default_account"),
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
    withErrorHandling(
      async (params: {
        accountId?: string;
        mailbox?: string;
        page?: number;
        limit?: number;
        returnBody?: boolean;
      }) => {
        const result = await listEmails(ctx, {
          page: params.page ?? 1,
          limit: params.limit ?? 20,
          ...params,
        });
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      },
      "list_emails",
    ),
  );

  server.tool(
    "get_email",
    "Get a specific email",
    {
      accountId: z.string().optional(),
      mailbox: z.string().optional(),
      uid: z.number(),
    },
    withErrorHandling(async (params: { accountId?: string; mailbox?: string; uid: number }) => {
      const result = await getEmail(ctx, { mailbox: params.mailbox ?? "INBOX", ...params });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }, "get_email"),
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
    withErrorHandling(
      async (params: { accountId?: string; mailbox?: string; query: string; limit?: number }) => {
        const result = await searchEmails(ctx, params);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      },
      "search_emails",
    ),
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
    withErrorHandling(
      async (params: {
        accountId: string;
        to: string[];
        subject: string;
        text?: string;
        html?: string;
        cc?: string[];
        bcc?: string[];
      }) => {
        const result = await sendEmail(ctx, params);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      },
      "send_email",
    ),
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
    withErrorHandling(async ({ accountId, mailbox, uid, read, flagged }) => {
      const result = await markEmail(ctx, { accountId, mailbox, uid, read, flagged });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }, "mark_email"),
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
    withErrorHandling(async ({ accountId, mailbox, uid, destination }) => {
      const result = await moveEmail(ctx, { accountId, mailbox, uid, destination });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }, "move_email"),
  );

  server.tool(
    "delete_email",
    "Delete an email",
    {
      accountId: z.string().optional(),
      mailbox: z.string(),
      uid: z.number(),
    },
    withErrorHandling(async ({ accountId, mailbox, uid }) => {
      const result = await deleteEmail(ctx, { accountId, mailbox, uid });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }, "delete_email"),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
