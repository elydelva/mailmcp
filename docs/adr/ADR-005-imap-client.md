---
issue: ADR-005
title: IMAP Client & Connection Pool
branch: feat/imap-client
status: completed
pr: 18
pr_url: https://github.com/elydelva/mailmcp/pull/18
github_issue: 5
github_issue_url: https://github.com/elydelva/mailmcp/issues/5
depends_on: [ADR-004, ADR-010]
required_by: [ADR-008]
---

# ADR-005 — IMAP Client

## Context
All email read operations go through IMAP. Connections are expensive to establish
so a pool is needed.

**Scope : `packages/core/imap/`.** Pas de dépendance vers un transport. Le pool est instancié une fois par processus (stdio ou server) et passé aux handlers de `core/tools/`.

## Decisions
- Client: `imapflow` (Promise-based, actively maintained by Postal Systems)
- Pool: `Map<\`\${userId}:\${accountId}\`, ImapFlow>` with 5-minute idle TTL
- Max 2 simultaneous connections per account
- Configurable timeout via `IMAP_TIMEOUT_MS`

## Goals / Commits
- [ ] `feat(imap): implement ImapFlow wrapper with connect/disconnect lifecycle`
- [ ] `feat(imap): implement connection pool with TTL eviction`
- [ ] `feat(imap): implement list_emails with pagination`
- [ ] `feat(imap): implement get_email (full headers + body)`
- [ ] `feat(imap): implement search_emails with IMAP SEARCH criteria`
- [ ] `feat(imap): implement move_email, delete_email, mark_email operations`
- [ ] `feat(imap): implement list_folders`
- [ ] `test(imap): unit tests for IMAP operations`
