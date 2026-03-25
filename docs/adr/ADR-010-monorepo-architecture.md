---
issue: ADR-010
title: Monorepo Architecture — packages/core, packages/server, packages/mailmcp
branch: refactor/monorepo-architecture
status: todo
pr: ~
pr_url: ~
github_issue: ~
github_issue_url: ~
depends_on: [ADR-001]
required_by: [ADR-002, ADR-003, ADR-004, ADR-005, ADR-006, ADR-007, ADR-008, ADR-009, ADR-011]
---

# ADR-010 — Monorepo Architecture

## Context

Le projet doit supporter trois modes d'exécution distincts :

1. **stdio** — transport MCP local, zéro auth, usage solo sur un PC
2. **server** — transport SSE/HTTP, OAuth 2.1, multi-utilisateur, déployable sur VPS
3. **CLI** — outil en ligne de commande pour la configuration, le setup wizard et la gestion des workspaces

Ces trois modes partagent la même logique métier (IMAP, SMTP, détection de fournisseurs, handlers MCP) mais diffèrent sur le transport et l'authentification. Sans séparation explicite, le risque est d'écrire des handlers MCP couplés à Fastify, rendant impossible leur réutilisation en stdio.

La codebase actuelle est en majorité des placeholders (ADR-001 implémenté, tout le reste vide) : c'est le moment optimal pour imposer cette structure.

## Decisions

### Structure des packages

```
packages/
  core/        ← logique métier pure, zéro framework, zéro transport
  server/      ← Fastify + OAuth + SSE/HTTP, cible Docker
  mailmcp/     ← CLI + stdio MCP, installable globalement via bun install -g
```

### packages/core

Contient tout ce qui peut tourner indépendamment d'un transport :

```
packages/core/src/
  storage/       ← StorageAdapter interface, file backend, postgres backend, crypto
  imap/          ← ImapFlow wrapper, connection pool, opérations
  smtp/          ← nodemailer wrapper, send/reply/forward
  providers/     ← détection fournisseur, DNS lookup, validation IMAP/SMTP
  tools/         ← handlers MCP purs : (userId, storage, imapPool, params) → résultat
```

**Règle stricte** : `packages/core` n'importe rien de Fastify, de `@getlarge/fastify-mcp`, ni de tout autre framework HTTP. Les seules dépendances autorisées sont des bibliothèques fonctionnelles (imapflow, nodemailer, lowdb, drizzle, typebox).

### packages/server

Point d'entrée pour le déploiement Docker multi-utilisateur :

```
packages/server/src/
  index.ts          ← entry point
  server.ts         ← Fastify setup, enregistrement des plugins
  auth/             ← OAuth 2.1 endpoints + middleware Hydra (ADR-003)
  transport/        ← @getlarge/fastify-mcp branché sur core/tools
  api/              ← REST endpoints consommés par le CLI en mode distant
```

Dépend de `packages/core` comme dépendance workspace locale.

### packages/mailmcp

Binaire unique exposant deux modes via argv :

```
packages/mailmcp/src/
  index.ts           ← lit argv : --mcp → stdio, sinon CLI
  mcp/
    stdio.ts         ← stdin/stdout transport, userId = "local", branche core/tools
  cli/
    commands/        ← setup, accounts, workspace, status
    wizard/          ← prompts interactifs (@clack/prompts)
    config.ts        ← lecture/écriture ~/.config/mailmcp/config.json
```

```bash
mailmcp --mcp          # stdio MCP server (pour claude_desktop_config.json)
mailmcp setup          # wizard CLI
mailmcp workspace use  # switch d'environnement
```

Dépend de `packages/core`. Publiable sur npm/jspm pour `bun install -g mailmcp`.

### Bun workspaces

```json
// package.json racine
{
  "workspaces": ["packages/*"],
  "private": true
}
```

Chaque package a son propre `package.json`. Les imports croisés utilisent le nom du package (`@mailmcp/core`) résolu par Bun sans symlinks manuels.

### userId en mode stdio

En stdio, il n'y a pas d'auth. Le `userId` est la constante `"local"` passée à tous les handlers de `core/tools/`. Le `FileStorageAdapter` fonctionne tel quel — il prend déjà un `userId` en paramètre.

### Séparation du setup wizard

En stdio, `setup_account` peut accepter le mot de passe directement (local, acceptable). En server, le tool `setup_account` retourne une URL vers un endpoint REST dédié dans `packages/server/api/` — jamais de mot de passe dans le chat.

Le CLI (`mailmcp setup`) appelle toujours l'endpoint REST directement, avec saisie masquée locale — identique visuellement dans les deux modes.

## Alternatives considered

| Option | Reason rejected |
|--------|----------------|
| Monorepo avec trois `index.ts` dans le même package | Aucune frontière d'import — couplage accidentel Fastify/stdio garanti à terme |
| Repo séparés (core, server, cli) | Overhead de versioning inter-repo pour un projet à ce stade |
| Garder la structure plate actuelle | ADR-007/008 écrits naïvement avec `@getlarge/fastify-mcp` rendront stdio impossible sans refactor majeur |

## Goals / Commits

- [ ] `refactor(monorepo): init bun workspaces with packages/core, packages/server, packages/mailmcp`
- [ ] `refactor(monorepo): move storage/ and crypto/ to packages/core`
- [ ] `refactor(monorepo): scaffold packages/server with existing Fastify setup`
- [ ] `refactor(monorepo): scaffold packages/mailmcp with bin entry point`
- [ ] `refactor(monorepo): update all imports and tsconfig paths`
- [ ] `ci: update github actions to build/test all packages`
- [ ] `chore(docker): update Dockerfile to build packages/server only`

## Consequences

**Facilite :**
- Les handlers MCP (ADR-007/008) s'écrivent une seule fois dans `core/tools/` et fonctionnent dans les trois modes
- Le CLI (ADR-011) peut importer `core` directement sans passer par HTTP
- Impossible d'importer Fastify depuis `core` par construction

**Complique :**
- Le refactor de l'existant (faible : ADR-001 est le seul code réel, déjà dans `storage/`)
- La CI doit builder/tester trois packages
- Les paths TypeScript nécessitent un `tsconfig` par package + un root `tsconfig.base.json`
