---
issue: ADR-003
title: OAuth 2.1 — Protected Resource & DCR Proxy
branch: feat/oauth-endpoints
status: todo
pr: ~
pr_url: ~
github_issue: 3
github_issue_url: https://github.com/elydelva/mailmcp/issues/3
depends_on: [ADR-010]
required_by: [ADR-009]
---

# ADR-003 — OAuth 2.1 Endpoints

## Context
The MCP server must expose OAuth endpoints required by the MCP spec (2025-11-25)
to be compatible with Claude.ai web, mobile, and desktop.

**Scope : `packages/server` uniquement.** Ces endpoints n'existent pas en mode stdio (ADR-011). En mode stdio, il n'y a pas d'authentification — le `userId` est la constante `"local"`.

## Decisions
- `GET /.well-known/oauth-protected-resource` (RFC 9728)
- `GET /.well-known/openid-configuration` proxy to Hydra
- `POST /oauth2/register` DCR proxy to Hydra + empty-field cleanup (Hydra + Zod bug workaround)
- Token validation via Hydra admin introspection endpoint
- Fastify middleware extracting `sub` from introspection for user scoping

## Goals / Commits
- [ ] `feat(auth): add /.well-known/oauth-protected-resource endpoint`
- [ ] `feat(auth): add openid-configuration proxy to Hydra`
- [ ] `feat(auth): add DCR proxy with empty-field cleanup`
- [ ] `feat(auth): add token introspection middleware`
- [ ] `test(auth): test OAuth endpoints with mock Hydra responses`
