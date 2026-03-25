---
issue: ADR-000
title: Project Setup & Tooling
branch: setup/project-init
status: completed
---

# ADR-000 — Project Setup & Tooling

## Context
Initialize the mailmcp project with the tech stack defined in the spec.

## Decisions
- Runtime: Bun.js (performance, native ESM, built-in test runner)
- HTTP framework: Fastify 5
- Linter/Formatter: Biome (replaces ESLint + Prettier, faster)
- Dead code detection: Knip
- Type checking: TypeScript strict via `tsc --noEmit`
- CI: GitHub Actions (typecheck + lint + knip + test + docker build)
- Docker image: `mailmcp` based on `oven/bun:1-alpine`

## Goals / Commits
- [x] `chore: init bun project with package.json and tsconfig`
- [x] `chore: add biome for lint and format`
- [x] `chore: add knip for dead code detection`
- [x] `chore: scaffold src/ directory structure`
- [x] `chore: add Dockerfile and docker-compose`
- [x] `ci: add GitHub Actions CI pipeline`
- [x] `docs: add ADR structure and issue tracking`
