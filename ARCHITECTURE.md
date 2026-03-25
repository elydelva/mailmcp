# Architecture

## Overview

mailmcp is a Bun monorepo with three packages:

| Package | Role |
|---|---|
| `packages/core` | IMAP/SMTP clients, provider detection, storage adapters, MCP tool handlers |
| `packages/server` | Fastify HTTP server — MCP transport, OAuth 2.1 endpoints, REST API |
| `packages/mailmcp` | CLI binary — setup wizard, workspace management, stdio MCP mode |

## How it works

```
Claude.ai / Claude Desktop / Claude Code
          │
          │ HTTPS — MCP over Streamable HTTP (server mode)
          │ stdio  — direct process pipe (local mode)
          ▼
    mailmcp server / mailmcp --mcp
          │
          ├── OAuth 2.1     /.well-known, DCR proxy → Ory Hydra
          ├── MCP tools     list/read/search/send/reply/move/delete/batch
          └── Storage       PostgreSQL (Drizzle ORM) or JSON file (lowdb)
                │
                └── IMAP connection pool + SMTP client
                          │
                          └── Your email provider
```

## Two deployment modes

### Server mode (`packages/server`)

Full multi-user deployment with OAuth 2.1. Used for VPS / home server.

- Fastify + `@modelcontextprotocol/sdk` with `StreamableHTTPServerTransport`
- OAuth 2.1 via Ory Hydra: `/.well-known/oauth-protected-resource` (RFC 9728), DCR proxy, Bearer token introspection middleware
- PostgreSQL storage via Drizzle ORM + `Bun.sql`
- One `userId` per OAuth `sub` claim

### Local mode (`packages/mailmcp --mcp`)

Single-user, stdio transport, zero authentication.

- Reads active workspace from `~/.config/mailmcp/config.json`
- Launches MCP server in-process using `StdioServerTransport`
- `userId = "local"`, JSON file storage via lowdb
- Claude Desktop connects via direct process spawn

## Workspace system

Inspired by `kubectl config use-context`. Stored in `~/.config/mailmcp/config.json`:

```json
{
  "activeWorkspace": "local",
  "workspaces": {
    "local": { "type": "stdio", "dataDir": "~/.local/share/mailmcp" },
    "home":  { "type": "server", "url": "https://mail.home.example.com", "token": "…" }
  }
}
```

`mailmcp workspace use <name>` switches context. `mailmcp --mcp` reads the active workspace at startup — no need to reconfigure Claude Desktop when switching.

## Security model

- Passwords are stored base64-encoded (not plaintext) in the storage backend. Production deployments should encrypt at rest.
- In server mode, passwords travel over HTTPS only — never through Claude's chat channel.
- In local mode, credentials stay on the local machine. The `setup` wizard accepts the password via terminal (hidden input), not via MCP.
- OAuth tokens are opaque (Hydra handles signing). Token introspection validates every request.

## Package dependency graph

```
packages/core
    ▲
    │
packages/server      packages/mailmcp
```

`core` has no dependency on `server` or `mailmcp`. Both consume `core` as a workspace dependency.

## Key technologies

| Concern | Library |
|---|---|
| Runtime | Bun |
| HTTP server | Fastify |
| MCP protocol | `@modelcontextprotocol/sdk` |
| IMAP | imapflow |
| SMTP | nodemailer |
| OAuth server | Ory Hydra |
| ORM | Drizzle ORM |
| File storage | lowdb |
| Schema validation | Zod, TypeBox |
| CLI prompts | @clack/prompts |
| Linter/formatter | Biome |
| Dead code | Knip |
| Commits | Conventional Commits + commitlint |
| Releases | release-please |
| Docker | Multi-stage `oven/bun:1-alpine`, Traefik for TLS |

## ADRs

All architectural decisions are recorded in [`docs/adr/`](docs/adr/). Each ADR has a GitHub Issue, a branch, and commit-sized goals. See [`docs/adr/README.md`](docs/adr/README.md) for the full dependency graph and implementation order.
