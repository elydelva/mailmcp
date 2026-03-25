---
issue: ADR-006
title: SMTP Client — Send, Reply, Forward
branch: feat/smtp-client
status: todo
pr: ~
pr_url: ~
github_issue: 6
github_issue_url: https://github.com/elydelva/mailmcp/issues/6
depends_on: [ADR-010]
required_by: [ADR-008]
---

# ADR-006 — SMTP Client

## Context
Email sending operations use SMTP via nodemailer.

**Scope : `packages/core/smtp/`.** Pas de dépendance vers un transport. Utilisé par les handlers de `core/tools/` appelés depuis stdio ou server indifféremment.

## Decisions
- Client: `nodemailer` (Node.js/Bun standard)
- Support TLS and STARTTLS
- Use `mailparser` for parsing original emails during reply/forward

## Goals / Commits
- [ ] `feat(smtp): implement nodemailer transport wrapper`
- [ ] `feat(smtp): implement send_email operation`
- [ ] `feat(smtp): implement reply_email with In-Reply-To / References headers`
- [ ] `feat(smtp): implement forward_email with original body quoting`
- [ ] `test(smtp): unit tests for SMTP operations`
