---
issue: ADR-009
title: Docker & Production Deployment
branch: feat/docker-deployment
status: completed
pr: 27
pr_url: https://github.com/elydelva/mailmcp/pull/27
github_issue: 9
github_issue_url: https://github.com/elydelva/mailmcp/issues/9
depends_on: [ADR-010, ADR-003]
required_by: []
---

# ADR-009 — Docker & Production Deployment

## Context
The project must be deployable with a single command on a VPS behind Traefik.

**Scope : `packages/server` uniquement.** Le Dockerfile build `packages/server`, pas le monorepo entier. `packages/mailmcp` se distribue via npm/bun install, pas Docker.

## Decisions
- Docker image basée sur `oven/bun:1-alpine`, build de `packages/server` uniquement
- Multi-stage build (builder + minimal runner)
- Non-root user inside container
- docker-compose.yml with Hydra + hydra-ui + mailmcp + Traefik labels
- docker-compose.override.yml for local dev (no Traefik)

## Goals / Commits
- [ ] `chore(docker): finalize multi-stage Dockerfile for production`
- [ ] `chore(docker): add complete docker-compose with Traefik labels`
- [ ] `chore(docker): add docker-compose.override.yml for local dev`
- [ ] `docs: add deployment guide (README)`
- [ ] `ci: add Docker Hub push workflow on main branch merge`
