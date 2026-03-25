# mailmcp

> A self-hosted MCP server that gives AI assistants full access to your email — securely, privately, and without vendor lock-in.

## What is this?

**mailmcp** is a [Model Context Protocol](https://modelcontextprotocol.io) server for email. It connects Claude (and any MCP-compatible AI client) to your existing email accounts via IMAP/SMTP, exposing them as structured tools.

Works with Gmail, iCloud, Outlook, Yahoo, Fastmail, Proton Mail Bridge, and any standard IMAP/SMTP provider.

## Why?

Most AI email integrations are cloud-hosted, tied to a single provider, or require handing over OAuth tokens to a third party. mailmcp runs **on your own infrastructure** — a VPS, a home server, anywhere Docker runs.

- Your credentials never leave your server
- Works with any IMAP/SMTP provider, not just the big ones
- Multi-account and multi-user out of the box
- Compatible with Claude.ai (web & mobile), Claude Desktop, and Claude Code

## Features

- **Smart setup wizard** — add an email account by just typing your address; provider config is detected automatically via DNS lookups and Mozilla Autoconfig
- **Full email operations** — read, search, send, reply, forward, move, delete, mark, batch actions
- **OAuth 2.1** — full spec compliance (PKCE, DCR, opaque tokens) via [Ory Hydra](https://www.ory.sh/hydra/)
- **Two storage backends** — PostgreSQL for production, JSON file for solo/dev use
- **Connection pooling** — IMAP connections are reused, not re-established on every request
- **Deploy in one command** — single `docker compose up`

## Supported providers

| Provider | Auto-detected |
|----------|:---:|
| Gmail | ✅ |
| iCloud Mail | ✅ |
| Outlook / Hotmail | ✅ |
| Yahoo Mail | ✅ |
| Fastmail | ✅ |
| Zoho Mail | ✅ |
| Proton Mail (Bridge) | ✅ |
| Any IMAP/SMTP server | ✅ (DNS lookup) |

## Quick start

```bash
cp .env.example .env
# Fill in ENCRYPTION_KEY, HYDRA_SECRET, POSTGRES_PASSWORD, domain names
docker compose up -d
```

Then add `https://your-domain.com` as a remote MCP server in Claude.

See [docs/adr/ADR-009-docker-deployment.md](docs/adr/ADR-009-docker-deployment.md) for the full deployment guide.

## Architecture

```
Claude.ai / Claude Desktop / Claude Code
          │
          │ HTTPS — MCP over SSE / Streamable HTTP
          ▼
    mailmcp server          (Fastify + @getlarge/fastify-mcp)
          │
          ├── OAuth 2.1     /.well-known, DCR proxy → Ory Hydra
          ├── MCP tools     list/read/search/send/reply/move/delete...
          └── Storage       PostgreSQL (Drizzle) or JSON file (lowdb)
                │
                └── Email providers via IMAP + SMTP
```

## MCP tools exposed

| Category | Tools |
|----------|-------|
| Account setup | `setup_account`, `list_accounts`, `delete_account`, `set_default_account` |
| Reading | `list_emails`, `get_email`, `get_thread`, `list_folders` |
| Search | `search_emails` |
| Sending | `send_email`, `reply_email`, `forward_email` |
| Actions | `move_email`, `delete_email`, `mark_email` |
| Batch | `batch_move`, `batch_delete`, `batch_mark` |

## Development

```bash
bun install
cp .env.example .env
bun run dev
```

```bash
bun run typecheck   # TypeScript strict check
bun run lint        # Biome linter
bun run format      # Biome formatter
bun run knip        # Dead code detection
bun test            # Test suite
```

## Issue roadmap

Implementation is tracked as ADRs in [`docs/adr/`](docs/adr/). Each ADR maps to a branch with commit-sized goals.

## License

MIT
