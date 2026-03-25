# Architecture Decision Records

This folder contains ADRs and the issue breakdown for mailmcp.
Each ADR maps to a GitHub Issue, a git branch, and describes the goals and progress of a unit of work.

## Statut global

| ADR | Title | Package | Status |
|-----|-------|---------|--------|
| [ADR-000](ADR-000-project-setup.md) | Project Setup & Tooling | — | completed |
| [ADR-001](ADR-001-storage-file.md) | Storage — File Backend | `core` | completed |
| [ADR-002](ADR-002-storage-postgres.md) | Storage — PostgreSQL Backend | `core` | completed |
| [ADR-003](ADR-003-oauth-endpoints.md) | OAuth 2.1 Endpoints | `server` | completed |
| [ADR-004](ADR-004-provider-detection.md) | Provider Detection | `core` | completed |
| [ADR-005](ADR-005-imap-client.md) | IMAP Client & Connection Pool | `core` | completed |
| [ADR-006](ADR-006-smtp-client.md) | SMTP Client | `core` | completed |
| [ADR-007](ADR-007-mcp-tools-accounts.md) | MCP Tools — Account Management | `core` + `server` | completed |
| [ADR-008](ADR-008-mcp-tools-email.md) | MCP Tools — Email Operations | `core` + `server` | completed |
| [ADR-009](ADR-009-docker-deployment.md) | Docker & Production Deployment | `server` | completed |
| [ADR-010](ADR-010-monorepo-architecture.md) | Monorepo Architecture | — | completed |
| [ADR-011](ADR-011-cli-workspace.md) | CLI Companion & Workspace System | `mailmcp` | completed |
| [ADR-012](ADR-012-node-compatible-codebase.md) | Node.js-compatible codebase — Bun as runtime only | `core` + `mailmcp` | in-progress |
| [ADR-013](ADR-013-typescript-project-references.md) | TypeScript project references — monorepo typecheck scalability | — | in-progress |
| [ADR-014](ADR-014-core-package-split.md) | Split @mailmcp/core by responsibility + rename CLI | `core` + `mailmcp` | todo |

---

## Graphe de dépendances

Un ADR ne peut pas démarrer avant que ses dépendances soient `completed`.

```
ADR-000 ──┐
          │
ADR-001 ──┼──► ADR-010 ──┬──► ADR-002 ──┐
          │              │               ├──► ADR-007 ──┬──► ADR-008
          │              ├──► ADR-003 ──►ADR-009        │
          │              ├──► ADR-004 ──┬──► ADR-005 ───┘
          │              │              │    (ADR-008)
          │              │              └──► ADR-007
          │              ├──► ADR-006 ──► ADR-008
          │              └──► ADR-011 ◄── ADR-004, ADR-007
          │
          └──────────────────────────────► ADR-007
```

### Dépendances par ADR

| ADR | Dépend de | Requis par |
|-----|-----------|------------|
| ADR-000 | — | — |
| ADR-001 | — | ADR-002, ADR-007, ADR-010 |
| ADR-002 | ADR-001, ADR-010 | ADR-007, ADR-008 |
| ADR-003 | ADR-010 | ADR-009 |
| ADR-004 | ADR-010 | ADR-005, ADR-007, ADR-011 |
| ADR-005 | ADR-004, ADR-010 | ADR-008 |
| ADR-006 | ADR-010 | ADR-008 |
| ADR-007 | ADR-010, ADR-004, ADR-001 | ADR-008, ADR-011 |
| ADR-008 | ADR-007, ADR-005, ADR-006, ADR-010 | — |
| ADR-009 | ADR-010, ADR-003 | — |
| ADR-010 | ADR-001 | ADR-002, ADR-003, ADR-004, ADR-005, ADR-006, ADR-007, ADR-008, ADR-009, ADR-011 |
| ADR-011 | ADR-010, ADR-004, ADR-007 | — |
| ADR-012 | ADR-010, ADR-011 | ADR-013 |
| ADR-013 | ADR-012 | — |
| ADR-014 | ADR-010, ADR-013 | — |

---

## Ordre d'implémentation recommandé

Les ADRs sur la même ligne peuvent être travaillés en parallèle.

```
Étape 1 │ ADR-010  (monorepo — débloque tout)
         │
Étape 2 │ ADR-004  (provider detection)
        │ ADR-003  (OAuth — indépendant de ADR-004)
        │ ADR-002  (Postgres backend)
         │
Étape 3 │ ADR-005  (IMAP — nécessite ADR-004)
        │ ADR-006  (SMTP — indépendant de ADR-005)
        │ ADR-011  (CLI/workspace — nécessite ADR-004 mais pas ADR-007 complet)
         │
Étape 4 │ ADR-007  (MCP tools accounts — nécessite ADR-004, ADR-001/002)
         │
Étape 5 │ ADR-008  (MCP tools email — nécessite ADR-005, ADR-006, ADR-007)
        │ ADR-009  (Docker — nécessite ADR-003, ADR-010)
```
