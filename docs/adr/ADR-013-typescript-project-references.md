---
issue: ADR-013
title: TypeScript project references — monorepo typecheck scalability
branch: chore/typescript-project-references
status: in-progress
pr: 33
pr_url: https://github.com/elydelva/mailmcp/pull/33
github_issue: 35
github_issue_url: https://github.com/elydelva/mailmcp/issues/35
depends_on: [ADR-012]
required_by: []
---

# ADR-013 — TypeScript project references — monorepo typecheck scalability

## Context

Le typecheck root (`tsc --noEmit`) crash avec un OOM à 4 Go de heap :

```
FATAL ERROR: Ineffective mark-compacts near heap limit
Allocation failed - JavaScript heap out of memory
```

Cause racine : `@mailmcp/core` expose du `.ts` brut comme point d'entrée
(`"exports": { ".": "./src/index.ts" }`). TypeScript n'a aucun cache
inter-packages — chaque fois que `mailmcp` ou `server` importe `@mailmcp/core`,
il retypecheck **l'intégralité du source de core** depuis zéro. Avec 3 packages
cross-dépendants, le graphe explose en mémoire.

Le problème est structurel et ne se résout pas avec `NODE_OPTIONS='--max-old-space-size=4096'` :
cette option repousse le crash, elle ne règle pas la cause. Sur une équipe de ~100 devs
avec un monorepo qui grossit, le typecheck devient ingérable.

## Decisions

### Phase 1 — TypeScript composite projects + project references

Chaque package devient un **composite project** :

```jsonc
// packages/core/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationDir": "dist",
    "declarationMap": true
  }
}
```

Les packages dépendants déclarent leurs références :

```jsonc
// packages/mailmcp/tsconfig.json
{
  "references": [{ "path": "../core" }]
}

// packages/server/tsconfig.json
{
  "references": [{ "path": "../core" }]
}
```

Le root `tsconfig.json` orchestre le build via références (plus d'`include`) :

```jsonc
// tsconfig.json (root)
{
  "files": [],
  "references": [
    { "path": "packages/core" },
    { "path": "packages/mailmcp" },
    { "path": "packages/server" }
  ]
}
```

`tsc --build` construit le graphe dans le bon ordre et **cache** chaque package
dans un `.tsbuildinfo` par package. Si `core` n'a pas changé, ses types ne sont
plus jamais recalculés.

Chaque `package.json` expose les types compilés :

```jsonc
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "default": "./src/index.ts"
  }
}
```

### Phase 2 — Split `@mailmcp/core` en sous-packages

Découpage par domaine fonctionnel avec frontières stables :

| Package | Contenu | Dépend de |
|---------|---------|-----------|
| `@mailmcp/core` | `storage/`, `providers/`, `password.ts` | — |
| `@mailmcp/imap` | `imap/` | `@mailmcp/core` |
| `@mailmcp/smtp` | `smtp/` | `@mailmcp/core` |
| `@mailmcp/tools` | `tools/` | `@mailmcp/core`, `@mailmcp/imap`, `@mailmcp/smtp` |

Bénéfice : un changement dans `@mailmcp/tools` ne déclenche pas de rebuild de
`@mailmcp/core`. Le CLI (`mailmcp`) qui n'importe que `@mailmcp/core` + `@mailmcp/tools`
ne retypecheck jamais `@mailmcp/imap` ou `@mailmcp/smtp`.

### Phase 3 — Turborepo pour le cache partagé en équipe

Turborepo cache les outputs de `tsc --build` sur disque (et en remote cache).
Sur ~100 devs, si personne n'a touché `@mailmcp/core` depuis le dernier build,
le typecheck de core est un hit de cache instantané.

```jsonc
// turbo.json
{
  "tasks": {
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "outputs": ["dist/**/*.d.ts", "*.tsbuildinfo"]
    },
    "test": {
      "dependsOn": ["^typecheck"]
    }
  }
}
```

## Alternatives considered

| Option | Reason rejected |
|--------|----------------|
| `NODE_OPTIONS='--max-old-space-size=4096'` | Repousse le crash sans résoudre la cause ; non portable sur toutes les machines |
| `skipLibCheck: true` partout | Déjà en place, n'aide pas pour le typecheck cross-packages |
| Un seul tsconfig root avec `include` | Modèle actuel — c'est la cause du problème |
| Nx à la place de Turborepo | Plus lourd à configurer, Turborepo est suffisant pour ce cas |

## Goals / Commits

### Phase 1 — TypeScript composite projects
- [ ] `chore(tsconfig): enable composite mode and declaration emit on all packages`
- [ ] `chore(tsconfig): add project references to root tsconfig`
- [ ] `chore(core): expose dist types in package.json exports`
- [ ] `chore(mailmcp): expose dist types in package.json exports`
- [ ] `chore(server): expose dist types in package.json exports`
- [ ] `test: verify tsc --build completes without OOM`

### Phase 2 — Split core
- [ ] `chore(monorepo): extract @mailmcp/imap from core`
- [ ] `chore(monorepo): extract @mailmcp/smtp from core`
- [ ] `chore(monorepo): extract @mailmcp/tools from core`
- [ ] `refactor(server): update imports to new sub-packages`
- [ ] `refactor(mailmcp): update imports to new sub-packages`

### Phase 3 — Turborepo
- [ ] `chore(turbo): add turborepo with typecheck and test pipeline`
- [ ] `chore(ci): replace tsc --build with turbo run typecheck in CI`

## Consequences

**Facilite :**
- `tsc --build` termine en quelques secondes après le premier build (cache `.tsbuildinfo`)
- Typecheck scalable à N packages et N devs sans OOM
- Chaque package est typechecké indépendamment — les erreurs sont localisées
- Remote cache Turborepo : CI et dev partagent le cache compilé

**Complique :**
- Le workflow de dev nécessite `tsc --build` avant d'importer entre packages
  (Bun résout encore le `.ts` brut au runtime — seul le typecheck change)
- Phase 2 implique une réorganisation de l'arborescence — migration des imports
  dans `server` et `mailmcp`
- Phase 3 introduit une dépendance sur `turbo` en devDependency root
