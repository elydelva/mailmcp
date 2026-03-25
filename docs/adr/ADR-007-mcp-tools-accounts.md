---
issue: ADR-007
title: MCP Tools — Account Management
branch: feat/mcp-tools-accounts
status: in-progress
pr: ~
pr_url: ~
github_issue: 7
github_issue_url: https://github.com/elydelva/mailmcp/issues/7
depends_on: [ADR-010, ADR-004, ADR-001]
required_by: [ADR-008, ADR-011]
---

# ADR-007 — MCP Tools: Account Management

## Context
Expose email account management as structured MCP tools with TypeBox schemas.

**Scope : `packages/core/tools/accounts.ts`.** Les handlers sont des fonctions pures sans connaissance du transport. Ils sont branchés sur les transports (stdio, SSE/HTTP) par `packages/mailmcp` et `packages/server` respectivement.

`setup_account` ne demande jamais de mot de passe directement en mode server — il retourne une URL vers l'endpoint REST de `packages/server/api/` pour une saisie locale via le CLI (ADR-011).

## Decisions

- Tools: `setup_account` (detect → test → save), `list_accounts`, `delete_account`, `set_default_account`
- Strict TypeBox schemas on all tool inputs/outputs
- Handlers signature : `(context: ToolContext, params: T) => Promise<Result>` où `ToolContext = { userId, storage, imapPool? }`
- `setup_account` en mode server retourne `{ status: "pending", setupUrl: string }` au lieu du résultat direct
- Wiring dans `packages/server` : `@getlarge/fastify-mcp` + SSE/HTTP transports
- Wiring dans `packages/mailmcp` : stdio transport

## Goals / Commits

- [ ] `feat(core): define ToolContext type and handler signature convention`
- [ ] `feat(core): implement setup_account handler (detect + test + save)`
- [ ] `feat(core): implement list_accounts, delete_account, set_default_account handlers`
- [ ] `feat(server): integrate @getlarge/fastify-mcp plugin with SSE + HTTP transports`
- [ ] `feat(server): wire core/tools/accounts into fastify-mcp`
- [ ] `feat(server): add POST /api/accounts REST endpoint for CLI setup`
- [ ] `test(core): unit tests for account management handlers`
