#!/usr/bin/env bun

import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    mcp: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  allowPositionals: true,
});

if (values.mcp) {
  // stdio MCP server mode
  const { startStdioServer } = await import("./mcp/stdio.js");
  const { getActiveWorkspace } = await import("./workspace/config.js");
  const { workspace } = await getActiveWorkspace();
  if (workspace.type !== "stdio") {
    console.error(
      "Cannot start stdio server for a remote workspace. Use the server package instead.",
    );
    process.exit(1);
  }
  await startStdioServer(workspace.dataDir);
} else {
  const [command, ...args] = positionals;

  switch (command) {
    case "workspace": {
      const [sub, ...rest] = args;
      const { workspaceList, workspaceUse, workspaceAdd, workspaceRemove } = await import(
        "./workspace/commands.js"
      );
      switch (sub) {
        case "list":
          console.log(await workspaceList());
          break;
        case "use":
          console.log(await workspaceUse(rest[0] ?? ""));
          break;
        case "add":
          console.log(await workspaceAdd(rest[0] ?? "", rest[1] ?? "", rest[2]));
          break;
        case "remove":
          console.log(await workspaceRemove(rest[0] ?? ""));
          break;
        default:
          console.log("Usage: mailmcp workspace <list|use|add|remove>");
          break;
      }
      break;
    }
    case "setup": {
      const { runSetupWizard } = await import("./commands/setup.js");
      await runSetupWizard();
      break;
    }
    case "accounts": {
      const [sub, ...rest] = args;
      const { listAccountsCmd, removeAccount } = await import("./commands/accounts.js");
      if (sub === "remove") await removeAccount(rest[0] ?? "");
      else await listAccountsCmd();
      break;
    }
    case "status": {
      const { showStatus } = await import("./commands/status.js");
      await showStatus();
      break;
    }
    default:
      console.log(`mailmcp — email MCP server

Commands:
  mailmcp --mcp                    Start stdio MCP server
  mailmcp workspace list           List workspaces
  mailmcp workspace use <name>     Switch active workspace
  mailmcp workspace add <n> <url>  Add remote server workspace
  mailmcp workspace remove <name>  Remove workspace
  mailmcp setup                    Set up an email account
  mailmcp accounts                 List accounts
  mailmcp accounts remove <email>  Remove an account
  mailmcp status                   Show active workspace status
`);
  }
}
