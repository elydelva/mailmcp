/**
 * mailmcp — single binary entry point.
 *
 * --mcp   Launch the stdio MCP server (for claude_desktop_config.json)
 * <cmd>   Launch the interactive CLI (setup, workspace, accounts, status)
 *
 * ADR-011 — CLI Companion & Workspace System
 */

const args = process.argv.slice(2);

if (args[0] === "--mcp") {
  // stdio MCP transport — ADR-011
  throw new Error("stdio MCP transport not yet implemented (see ADR-011)");
} else {
  // CLI — ADR-011
  throw new Error("CLI not yet implemented (see ADR-011)");
}
