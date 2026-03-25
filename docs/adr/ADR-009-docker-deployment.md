---
issue: ADR-009
title: Docker & Production Deployment
branch: feat/docker-deployment
status: todo
---

# ADR-009 — Docker & Production Deployment

## Context
The project must be deployable with a single command on a VPS behind Traefik.

## Decisions
- Docker image: `mailmcp` based on `oven/bun:1-alpine`
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
