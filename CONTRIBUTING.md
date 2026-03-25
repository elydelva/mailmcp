# Contributing / Development setup

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.3
- Docker + Docker Compose (for integration testing)

## Setup

```bash
git clone https://github.com/elydelva/mailmcp
cd mailmcp
bun install
cp .env.example .env
```

## Running locally

```bash
# Server (watch mode)
bun run dev

# CLI
bun run --cwd packages/mailmcp src/index.ts setup
bun run --cwd packages/mailmcp src/index.ts --mcp
```

## Checks

```bash
bun test                  # test suite
bun run typecheck         # TypeScript (core + server)
bun run typecheck:cli     # TypeScript (mailmcp — slow, MCP SDK deep types)
bun run lint              # Biome linter
bun run format            # Biome formatter
bun run knip              # dead code
```

All checks run automatically on every commit via Husky + lint-staged.

## Docker (local dev)

```bash
# Uses docker-compose.override.yml — builds from source, exposes ports directly
POSTGRES_PASSWORD=dev docker compose up
```

Services:
- `http://localhost:3000` — mailmcp
- `http://localhost:4444` — Hydra public
- `http://localhost:4445` — Hydra admin
- `http://localhost:3001` — Hydra login/consent UI
- `localhost:5432` — Postgres

## Commit format

Enforced by commitlint. Pattern: `<type>(<scope>): <description>` (lowercase, imperative).

```
feat(imap): add connection timeout handling
fix(smtp): handle auth error on gmail
chore(ci): update bun version
```

Types: `feat`, `fix`, `perf`, `deps`, `docs`, `refactor`, `test`, `ci`, `chore`

## Database (Postgres backend)

```bash
# Generate a migration after schema changes
bun run --cwd packages/core db:generate

# Run migrations
DATABASE_URL=postgres://... bun run --cwd packages/core db:migrate
```

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for system design, package structure, and ADR index.
