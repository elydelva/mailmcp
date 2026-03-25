import type { ToolContext } from "@mailmcp/core";
import { deleteAccount, listAccounts, setDefaultAccount, setupAccount } from "@mailmcp/core";
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
