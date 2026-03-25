---
issue: ADR-008
title: MCP Tools — Email Operations
branch: feat/mcp-tools-email
status: todo
pr: ~
pr_url: ~
github_issue: 8
github_issue_url: https://github.com/elydelva/mailmcp/issues/8
depends_on: [ADR-007, ADR-005, ADR-006, ADR-010]
required_by: []
---

# ADR-008 — MCP Tools: Email Operations

## Context
Expose all email operations as MCP tools: read, search, send, and batch actions.

**Scope : `packages/core/tools/emails.ts`.** Même convention que ADR-007 : handlers purs branchés sur les transports par les packages consommateurs. Aucune dépendance vers Fastify.

## Decisions

- Read: `list_emails`, `get_email`, `get_thread`, `list_folders`
- Search: `search_emails`
- Actions: `send_email`, `reply_email`, `forward_email`, `move_email`, `delete_email`, `mark_email`
- Batch: `batch_move`, `batch_delete`, `batch_mark`
- Mandatory pagination on all list tools
- `returnBody=false` by default on `list_emails` for compact responses
- Handler signature : `(context: ToolContext, params: T) => Promise<Result>` (même convention que ADR-007)

## Goals / Commits

- [ ] `feat(core): implement list_emails and get_email handlers`
- [ ] `feat(core): implement list_folders and get_thread handlers`
- [ ] `feat(core): implement search_emails handler`
- [ ] `feat(core): implement send_email, reply_email, forward_email handlers`
- [ ] `feat(core): implement move_email, delete_email, mark_email handlers`
- [ ] `feat(core): implement batch_move, batch_delete, batch_mark handlers`
- [ ] `feat(server): wire core/tools/emails into fastify-mcp`
- [ ] `test(core): unit tests for email operation handlers`
