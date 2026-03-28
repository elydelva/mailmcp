---
issue: ADR-012
title: Node.js-compatible codebase — Bun as runtime only
branch: refactor/node-compatible-codebase
status: completed
pr: 32
pr_url: https://github.com/elydelva/mailmcp/pull/32
github_issue: 34
github_issue_url: https://github.com/elydelva/mailmcp/issues/34
depends_on: [ADR-010, ADR-011]
required_by: [ADR-013]
---

# ADR-012 — Node.js-compatible codebase — Bun as runtime only

## Context

Le projet utilise Bun comme runtime, package manager et test runner. La codebase exploite aussi des APIs propriétaires Bun (`Bun.file`, `Bun.write`, `Bun.sql`) dans `packages/core` et `packages/mailmcp`.

Deux contraintes sont entrées en tension lors d'une review de code :

**1. Le CLI `mailmcp` doit tourner sur Node.js.**

`packages/mailmcp` est distribué via npm (`bun install -g mailmcp`). Un utilisateur qui installe le CLI n'a pas nécessairement Bun sur sa machine — il peut lancer le binaire avec Node.js. Les APIs `Bun.*` plantent immédiatement dans ce cas.

**2. `packages/core` est partagé entre le CLI et le serveur.**

`packages/core` est importé par `packages/mailmcp` (CLI, Node.js) et `packages/server` (Bun). Si `core` utilise des APIs Bun, le CLI est cassé par construction. Or `core` contient actuellement :
- `storage/key.ts` — `Bun.file` / `Bun.write`
- `storage/postgres.ts` — `import { SQL } from "bun"`
- `storage/migrate.ts` — `import { SQL } from "bun"`

**3. Le problème de typecheck.**

`"types": ["bun-types"]` dans `tsconfig.base.json` injecte les types Bun dans tous les packages, y compris `mailmcp`. Cela crée une confusion : le code est déclaré compatible Node.js mais les types Bun sont disponibles partout, masquant les incompatibilités. Ce n'est pas non plus la cause principale des problèmes de mémoire du typecheck (voir Consequences).

**Observation clé** : Bun est 100% compatible Node.js en tant que runtime. On peut écrire `node:fs`, `node:crypto`, `node:path` et l'exécuter avec `bun run` — on bénéficie de la vitesse de Bun sans lock-in sur ses APIs. Les APIs Bun n'apportent pas de valeur fonctionnelle irremplaçable dans ce projet :

| API Bun utilisée | Remplaçant Node standard | Valeur ajoutée réelle |
|------------------|--------------------------|----------------------|
| `Bun.file` / `Bun.write` | `node:fs/promises` | Aucune — sucre syntaxique |
| `Bun.sql` | `postgres` (postgres.js) | Discutable — postgres.js est aussi simple |

## Decisions

### Bun reste le runtime, package manager et test runner

Bun n'est pas retiré du projet. Il est conservé pour :
- `bun run` — exécution des scripts
- `bun install` — gestion des dépendances
- `bun test` — test runner
- Chargement automatique de `.env`

### La codebase est écrite en Node.js standard

Toutes les APIs `Bun.*` sont remplacées par leurs équivalents `node:*` :

- `Bun.file(path).exists()` / `Bun.file(path).text()` / `Bun.write(path, data)` → `node:fs/promises` (`readFile`, `writeFile`, `access`, `mkdir`)
- `Bun.sql` dans `postgres.ts` et `migrate.ts` → bibliothèque `postgres` (postgres.js)
- `Bun.file` / `Bun.write` dans `packages/mailmcp/src/workspace/config.ts` → `node:fs/promises`

### `bun-types` retiré du tsconfig de base

`"types": ["bun-types"]` est retiré de `tsconfig.base.json`. Les types bun ne sont plus injectés globalement. Cela évite d'écrire accidentellement du code Bun dans des packages Node.js-only.

Les types Bun restent disponibles pour les fichiers de test (`*.test.ts`) via une surcharge locale si nécessaire — `bun:test` est le test runner et doit être typé.

### postgres.js remplace Bun.sql

`postgres.js` (`postgres` sur npm) est la bibliothèque standard pour PostgreSQL en ESM Node.js. Elle est :
- Compatible Node.js et Bun
- Bien typée (types inclus)
- Fonctionnellement équivalente à `Bun.sql` pour les usages du projet

`drizzle-orm` supporte postgres.js nativement via `drizzle-orm/postgres-js`.

## Alternatives considered

| Option | Reason rejected |
|--------|----------------|
| Garder les APIs Bun, documenter que Node.js n'est pas supporté | Le CLI est distribué via npm — contraindre les utilisateurs à installer Bun est une friction inacceptable pour un outil en ligne de commande |
| Exports conditionnels (`node` / `bun`) dans core | Complexité de maintenance élevée pour un gain nul : les APIs Bun n'apportent rien que `node:*` ne fasse |
| Déplacer `postgres.ts` et `migrate.ts` dans `packages/server` | Casse l'abstraction `StorageAdapter` — le backend postgres doit rester dans `core` pour être utilisable depuis `server` sans duplication |
| Utiliser `Bun.serve()` à la place de Fastify | Hors scope de cet ADR ; Fastify est déjà en place (ADR-003, ADR-009) |

## Goals / Commits

- [ ] `refactor(storage): replace Bun.file/Bun.write in key.ts with node:fs/promises`
- [ ] `deps(storage): replace Bun.sql with postgres.js in postgres.ts and migrate.ts`
- [ ] `refactor(storage): update drizzle adapter from bun-sql to postgres-js`
- [ ] `refactor(mailmcp): replace Bun.file/Bun.write in workspace/config.ts with node:fs/promises`
- [ ] `chore(tsconfig): remove bun-types from tsconfig.base.json, scope to test files only`
- [ ] `test: verify typecheck passes without bun-types globally`

## Consequences

**Facilite :**
- Le CLI tourne sur Node.js sans Bun installé
- Le typecheck est cohérent : aucun type Bun dans les packages Node.js-only
- `packages/core` est testable avec n'importe quel runner compatible Node.js
- La migration vers un autre runtime (Deno, edge workers) est plus simple à l'avenir

**Complique :**
- `postgres.js` ajoute une dépendance là où `Bun.sql` était natif — coût marginal (package léger, bien maintenu)
- Le typecheck sur les fichiers de test (`bun:test`) nécessite une attention particulière pour que les types Bun restent disponibles dans ce contexte précis

**Note sur la performance du typecheck :**
Le problème de mémoire/lenteur du typecheck (`NODE_OPTIONS='--max-old-space-size=4096'`) n'est pas résolu par cet ADR. La cause racine est que `@mailmcp/core` expose `src/index.ts` comme point d'entrée — TypeScript retypecheck toute la source de `core` pour chaque package dépendant. La solution (émission de `.d.ts`) fera l'objet d'un ADR séparé ou sera traitée dans le cadre de cet ADR si le coût s'avère faible.
