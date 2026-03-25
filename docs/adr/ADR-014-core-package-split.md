---
issue: ADR-014
title: Split @mailmcp/core by responsibility
branch: refactor/core-package-split
status: in-progress
pr: 42
pr_url: https://github.com/elydelva/mailmcp/pull/42
github_issue: 41
github_issue_url: https://github.com/elydelva/mailmcp/issues/41
depends_on: [ADR-010, ADR-013]
required_by: []
---

# ADR-014 — Split @mailmcp/core by responsibility

## Context

`@mailmcp/core` regroupe trois responsabilités distinctes dans un même package :
- le chiffrement et la gestion des clés
- la couche de stockage (adapters file & postgres, schéma Drizzle)
- la détection et validation des providers email

Cette concentration crée un couplage inutile : par exemple, `@mailmcp/imap` et `@mailmcp/smtp`
dépendent de `core` uniquement pour la détection de providers, et embarquent donc transitiv
ement tout le code de stockage et les dépendances associées (`lowdb`, `drizzle-orm`, `postgres`).

## Decisions

- Extraire `@mailmcp/crypto` — chiffrement AES-256-GCM et gestion de clé (`crypto.ts`, `key.ts`, `password.ts`)
- Extraire `@mailmcp/storage` — adapters (file, postgres), schéma Drizzle, interface `StorageAdapter`, migrations
- Extraire `@mailmcp/providers` — détection multi-méthodes, base de providers connus (`detector.ts`, `known-providers.ts`)
- Déplacer `validator.ts` dans `@mailmcp/tools` — orchestre déjà `imap` + `smtp`, pas de nouvelle dep nécessaire (`imapflow` et `nodemailer` sont déjà transitifs via ces packages)
- Renommer le package `mailmcp` en `@mailmcp/cli` pour l'aligner sur la convention de nommage du monorepo
- Supprimer `@mailmcp/core` (ou le conserver comme re-export de transition, puis le supprimer)
- Mettre à jour les dépendances de tous les packages consommateurs

## Alternatives considered

| Option | Reason rejected |
|--------|----------------|
| Garder `core` tel quel | Couplage croissant, deps inutiles dans imap/smtp |
| Sous-exports `@mailmcp/core/crypto` | Complexité de config, pas de frontière claire entre packages |
| Merger imap/smtp dans core | Va à l'encontre de la direction actuelle, pire couplage |

## Goals / Commits

- [ ] `feat(crypto): extract @mailmcp/crypto package`
- [ ] `feat(storage): extract @mailmcp/storage package`
- [ ] `feat(providers): extract @mailmcp/providers package`
- [ ] `refactor(imap): depend on @mailmcp/providers instead of core`
- [ ] `refactor(smtp): depend on @mailmcp/providers instead of core`
- [ ] `refactor(tools): migrate validator.ts from core/providers`
- [ ] `refactor(tools): update imports to new packages`
- [ ] `refactor(server): update imports to new packages`
- [ ] `refactor(cli): rename mailmcp package to @mailmcp/cli`
- [ ] `refactor(cli): update imports to new packages`
- [ ] `chore(core): remove @mailmcp/core package`
- [ ] `test(crypto): unit tests for encrypt/decrypt`
- [ ] `test(storage): migrate existing file & postgres tests`
- [ ] `test(providers): migrate existing provider detection tests`

## Consequences

**Positif :**
- `@mailmcp/imap` et `@mailmcp/smtp` n'embarquent plus `lowdb`, `drizzle-orm`, `postgres` transitivement
- `@mailmcp/providers` est publiable indépendamment pour d'autres projets
- `@mailmcp/crypto` est testable et auditable isolément
- Chaque package a un `package.json` avec uniquement ses dépendances directes

**Négatif / trade-offs :**
- Augmente le nombre de packages dans le workspace (3 nouveaux + renommage du CLI)
- Le renommage de `mailmcp` → `@mailmcp/cli` nécessite de mettre à jour le nom publié sur npm et les références dans la doc utilisateur
- Les migrations Drizzle et la config `drizzle.config.ts` restent dans `@mailmcp/storage`
- `validator.ts` migre dans `@mailmcp/tools` (pas dans providers) pour éviter d'introduire `imapflow`/`nodemailer` comme deps directes de `@mailmcp/providers`

## Graphe de dépendances résultant

```
@mailmcp/crypto     (aucune dep interne)
       ↓
@mailmcp/storage  ←── @mailmcp/crypto          (lowdb, drizzle, postgres)
@mailmcp/providers ←── @mailmcp/crypto         (détection DNS/autoconfig, pas de client réseau lourd)

@mailmcp/imap    ←── @mailmcp/providers        (imapflow)
@mailmcp/smtp    ←── @mailmcp/providers        (nodemailer)
@mailmcp/tools   ←── @mailmcp/storage + @mailmcp/imap + @mailmcp/smtp  (+ validator.ts ici)
@mailmcp/server  ←── @mailmcp/tools
@mailmcp/cli     ←── @mailmcp/tools + @mailmcp/providers
```
