---
issue: ADR-007
title: MCP Tools — Account Management
branch: feat/mcp-tools-accounts
status: todo
pr: ~
pr_url: ~
github_issue: 7
github_issue_url: https://github.com/elydelva/mailmcp/issues/7
---

# ADR-007 — MCP Tools: Account Management

## Context
Expose email account management as structured MCP tools with TypeBox schemas.

## Decisions
- Tools: `setup_account` (detect → test → save), `list_accounts`, `delete_account`, `set_default_account`
- Strict TypeBox schemas on all tool inputs/outputs
- Wire `@getlarge/fastify-mcp` into Fastify server

## Goals / Commits
- [ ] `feat(server): integrate @getlarge/fastify-mcp plugin with SSE + HTTP transports`
- [ ] `feat(tools): implement setup_account detect step`
- [ ] `feat(tools): implement setup_account test + save steps`
- [ ] `feat(tools): implement list_accounts, delete_account, set_default_account`
- [ ] `test(tools): integration tests for account management tools`
