# mailmcp

> A self-hosted MCP server that gives Claude full access to your email — without handing credentials to anyone.

Works with Gmail, iCloud, Outlook, Yahoo, Fastmail, Proton Mail Bridge, and any standard IMAP/SMTP provider.

---

## Quick start — local mode

No server, no Docker, no OAuth. Runs directly on your machine in minutes.

### 1. Install

```bash
npm install -g mailmcp
```

### 2. Add your email account

```bash
mailmcp setup
```

The wizard asks for your provider, email, and app password. IMAP/SMTP settings are detected automatically.

> **Gmail / iCloud / Yahoo:** use an [app password](https://support.google.com/accounts/answer/185833), not your main account password.

### 3. Connect to Claude

**Claude Desktop** — add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mail": { "command": "mailmcp", "args": ["--mcp"] }
  }
}
```

Restart Claude Desktop. Done.

**Claude.ai (web & mobile)** — go to Settings → Integrations → Add MCP server, then run:

```bash
mailmcp serve
```

Copy the displayed URL into Claude and follow the on-screen instructions.

**Claude Code** — add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "mail": { "command": "mailmcp", "args": ["--mcp"] }
  }
}
```

---

## Managing accounts

```bash
mailmcp accounts                   # list configured accounts
mailmcp accounts remove <email>    # remove an account
mailmcp status                     # health check
```

For multiple contexts (home, work, etc.):

```bash
mailmcp workspace list
mailmcp workspace use home
mailmcp workspace add work https://mail.work.example.com
```

---

## What Claude can do with your email

### Account management

| Tool | What it does |
|---|---|
| `setup_account` | Add a new email account (provider auto-detected) |
| `list_accounts` | List all configured accounts |
| `set_default_account` | Change the default account |
| `delete_account` | Remove an account |

### Reading & searching

| Tool | What it does |
|---|---|
| `list_emails` | List emails with pagination (`page`, `limit`) |
| `get_email` | Fetch a single email by UID (full body + attachments) |
| `get_thread` | Fetch an entire conversation thread by UID |
| `list_folders` | List all mailbox folders |
| `search_emails` | Search emails by keyword |

### Sending

| Tool | What it does |
|---|---|
| `send_email` | Compose and send a new email |
| `reply_email` | Reply to an existing email (preserves threading headers) |
| `forward_email` | Forward an email to new recipients |

### Single-email actions

| Tool | What it does |
|---|---|
| `move_email` | Move an email to another folder |
| `delete_email` | Permanently delete an email |
| `mark_email` | Mark as read / unread / flagged / unflagged |

### Batch actions (up to 500 emails per call)

Accepts either an explicit list of UIDs or a server-side filter (`from`, `subject`, `before`, `after`, `read`).

| Tool | What it does |
|---|---|
| `batch_move` | Move multiple emails to a folder |
| `batch_delete` | Permanently delete multiple emails |
| `batch_mark` | Mark multiple emails as read / unread / flagged |
| `batch_archive` | Move multiple emails to the Archive folder (auto-detected) |

**Examples:**
```
"Show my unread emails"                       → list_emails
"Read the thread with Alice"                  → get_thread
"Search for invoices from last month"         → search_emails
"Reply to Bob's message"                      → reply_email
"Archive all newsletters from this week"      → batch_archive (filter: from + after)
"Delete emails older than 6 months"           → batch_delete (filter: before)
"Mark everything from GitHub as read"         → batch_mark   (filter: from)
```

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

---

## Self-hosted server mode

For teams or multi-user setups. Hosts a full OAuth 2.1 server — users authenticate with their own accounts, credentials stay on the server.

### Requirements

- A Linux server with Docker and Docker Compose
- Three DNS records pointing to your server:
  - `mail.example.com` — MCP endpoint
  - `auth.example.com` — OAuth server (Ory Hydra)
  - `login.example.com` — login/consent UI
- A valid email address for Let's Encrypt

### 1. Clone and configure

```bash
git clone https://github.com/elydelva/mailmcp
cd mailmcp
cp .env.example .env
```

Edit `.env`:

```env
POSTGRES_PASSWORD=<strong password>
MCP_DOMAIN=mail.example.com
HYDRA_DOMAIN=auth.example.com
AUTH_UI_DOMAIN=login.example.com
ACME_EMAIL=you@example.com
HYDRA_SECRET=<openssl rand -hex 32>
```

### 2. Start the stack

```bash
docker compose -f docker/docker-compose.yml up -d
```

Starts mailmcp + Ory Hydra (OAuth 2.1) + login UI + PostgreSQL + Traefik (TLS). Certificates are provisioned automatically via Let's Encrypt.

### 3. Add to Claude

In Claude → Settings → Integrations → Add MCP server:

```
https://mail.example.com
```

Claude walks you through OAuth. Once connected, run:

```
Set up my email account
```

Claude calls `setup_account` — your address is detected automatically, and your app password is entered locally via the CLI wizard (never sent through Claude).

### Stack overview

| Service | Role |
|---|---|
| `mailmcp` | MCP server (this repo) |
| `hydra` | OAuth 2.1 authorization server |
| `hydra-ui` | Login & consent UI |
| `postgres` | Persistent storage |
| `traefik` | Reverse proxy + TLS termination |

### Upgrading

```bash
docker compose -f docker/docker-compose.yml pull
docker compose -f docker/docker-compose.yml up -d
```

---

## More

- [Architecture & design decisions](docs/ARCHITECTURE.md)
- [Contributing / development setup](CONTRIBUTING.md)

## License

MIT
