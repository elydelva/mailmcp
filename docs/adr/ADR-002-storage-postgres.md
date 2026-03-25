---
issue: ADR-002
title: Storage Layer — PostgreSQL Backend
branch: feat/storage-postgres-backend
status: in-progress
pr: ~
pr_url: ~
github_issue: 2
github_issue_url: https://github.com/elydelva/mailmcp/issues/2
depends_on: [ADR-001, ADR-010]
required_by: [ADR-007, ADR-008]
---

# ADR-002 — Storage Layer: PostgreSQL Backend

## Context
Production multi-user deployments need a proper relational database.

## Decisions
- Drizzle ORM with drizzle-kit for schema + migrations
- Schema: `users` and `email_accounts` tables (see spec)
- Implements the same `StorageAdapter` interface as the file backend

## Goals / Commits
- [ ] `feat(storage): install drizzle-orm and drizzle-kit`
- [ ] `feat(storage): define schema with users and email_accounts tables`
- [ ] `feat(storage): implement postgres StorageAdapter with Drizzle`
- [ ] `feat(storage): add initial migration via drizzle-kit`
- [ ] `test(storage): integration tests for postgres backend`
