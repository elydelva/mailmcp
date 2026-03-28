---
issue: ADR-016
title: MCP Tools — Batch Email Operations
branch: feat/batch-operations
status: in-progress
pr: ~
pr_url: ~
github_issue: ~
github_issue_url: ~
depends_on: [ADR-008, ADR-015]
required_by: []
---

# ADR-016 — MCP Tools: Batch Email Operations

## Context

Les outils MCP actuels (ADR-008) permettent des actions sur un email à la fois (`delete_email`, `move_email`, `mark_email`). Pour des cas d'usage courants — vider une boîte, archiver une campagne, marquer 100 emails comme lus — cela génère N appels successifs, ce qui est lent et coûteux en tokens.

Ce ADR ajoute des outils MCP dédiés aux opérations en lot, capables de traiter jusqu'à plusieurs centaines d'emails en un seul appel.

## Decisions

- Nouveaux outils exposés via MCP :
  - `batch_delete` — supprime une liste d'UIDs ou tous les emails correspondant à un filtre
  - `batch_move` — déplace une liste d'UIDs vers un dossier cible
  - `batch_mark` — marque une liste d'UIDs (`read`, `unread`, `flagged`, `unflagged`)
  - `batch_archive` — raccourci pour `batch_move` vers le dossier Archive détecté automatiquement
- Entrée acceptée sous deux formes :
  - `uids: string[]` — liste explicite d'UIDs IMAP
  - `filter: { folder?, from?, subject?, before?, after?, read? }` — résolution côté serveur avant exécution
- Limite configurable : maximum 500 UIDs par appel (rejeté avec une erreur claire si dépassé)
- Implémentation en `packages/core/tools/batch.ts`, même convention handler que ADR-007/008
- Utilisation des commandes IMAP `UID STORE` et `UID COPY` + `UID STORE \Deleted` + `EXPUNGE` en lot pour minimiser les round-trips

## Alternatives considered

| Option | Reason rejected |
|--------|----------------|
| Réutiliser `batch_delete` existant de ADR-008 | Déjà présent en stub mais sans support `filter` ni limite de sécurité |
| Exposer un outil générique `batch_action` | Trop ouvert — signature difficile à valider et à documenter pour un LLM |
| Implémenter côté client (appels répétés) | N round-trips réseau, pas atomique, expérience agent dégradée |

## Goals / Commits

- [ ] `feat(core): add batch_delete handler with uid list and filter support`
- [ ] `feat(core): add batch_move handler with uid list and filter support`
- [ ] `feat(core): add batch_mark handler with uid list and filter support`
- [ ] `feat(core): add batch_archive shortcut handler`
- [ ] `feat(server): register batch tools in fastify-mcp`
- [ ] `test(core): unit tests for batch handlers`
- [ ] `docs: update tool reference with batch tools`

## Consequences

- Les agents LLM peuvent accomplir des tâches de gestion de boîte entière en un seul appel outil.
- La limite à 500 UIDs protège contre les opérations accidentellement destructrices sur de très grandes boîtes.
- Le support du `filter` introduit une résolution IMAP `SEARCH` côté serveur avant exécution — ajoute une latence légère mais réduit la charge token.
- Les opérations batch IMAP ne sont pas atomiques sur tous les serveurs ; un échec partiel sera reporté dans la réponse avec les UIDs ayant échoué.
