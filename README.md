# mailmcp

> A self-hosted MCP server that gives Claude full access to your email — without handing credentials to anyone.

Works with Gmail, iCloud, Outlook, Yahoo, Fastmail, Proton Mail Bridge, and any standard IMAP/SMTP provider.  
Compatible with **Claude.ai** (web & mobile), **Claude Desktop**, and **Claude Code**.

---

## Install — server mode (multi-user, VPS)

You need: a server with Docker + Docker Compose, three DNS records pointing to it, and a Let's Encrypt-compatible email.

**1. Clone and configure**

```bash
git clone https://github.com/elydelva/mailmcp
cd mailmcp
cp .env.example .env
```

Edit `.env`:

```env
POSTGRES_PASSWORD=<strong password>
MCP_DOMAIN=mail.example.com        # your server's MCP endpoint
HYDRA_DOMAIN=auth.example.com      # OAuth server
AUTH_UI_DOMAIN=login.example.com   # login/consent UI
ACME_EMAIL=you@example.com         # Let's Encrypt notifications
HYDRA_SECRET=<openssl rand -hex 32>
```

**2. Start the stack**

```bash
docker compose up -d
```

This starts mailmcp + Ory Hydra (OAuth) + login UI + Postgres + Traefik (TLS). Certificates are provisioned automatically.

**3. Add to Claude**

In Claude → Settings → Integrations → Add MCP server:

```
https://mail.example.com
```

Claude will walk you through OAuth. Once connected, run:

```
Set up my email account
```

Claude will call `setup_account` — your address is detected automatically, and your password is entered locally via the CLI wizard (never sent through Claude).

---

## Install — local mode (single user, no server)

No Docker, no OAuth. Runs directly on your machine.

**1. Install**

```bash
bun install -g mailmcp
# or for one-off use:
bunx mailmcp setup
```

**2. Add your email account**

```bash
mailmcp setup
```

The wizard asks for your provider, email, and app password. IMAP/SMTP settings are detected automatically.

**3. Configure Claude Desktop**

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mail": { "command": "mailmcp", "args": ["--mcp"] }
  }
}
```

Restart Claude Desktop. That's it.

---

## Managing accounts

```bash
mailmcp accounts               # list configured accounts
mailmcp accounts remove <email>
mailmcp status                 # health check
```

For multiple servers or contexts:

```bash
mailmcp workspace list
mailmcp workspace use home
mailmcp workspace add work https://mail.work.example.com
```

---

## What Claude can do with your email

| Ask Claude to… | Tool used |
|---|---|
| "Show my unread emails" | `list_emails` |
| "Read the thread with Alice" | `get_thread` |
| "Search for invoices from last month" | `search_emails` |
| "Reply to Bob's message" | `reply_email` |
| "Send a draft to the team" | `send_email` |
| "Move all newsletters to Archives" | `batch_move` |
| "Delete emails older than 6 months" | `batch_delete` |
| "Mark everything from GitHub as read" | `batch_mark` |

---

## Supported providers

| Provider | Auto-detected |
|---|:---:|
| Gmail | ✅ |
| iCloud Mail | ✅ |
| Outlook / Hotmail | ✅ |
| Yahoo Mail | ✅ |
| Fastmail | ✅ |
| Zoho Mail | ✅ |
| Proton Mail (Bridge) | ✅ |
| Any IMAP/SMTP server | ✅ (DNS lookup) |

For Gmail and other providers that require it, use an **app password**, not your main account password.

---

## More

- [Architecture & design decisions](docs/ARCHITECTURE.md)
- [Contributing / development setup](docs/CONTRIBUTING.md)

## License

MIT
