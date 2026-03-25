# ADR Workflow

Each ADR in `docs/adr/` maps to a GitHub Issue and (eventually) a PR.
Apply these rules **every time** work touches an ADR.

## Frontmatter (required on every ADR)

```yaml
---
issue: ADR-000          # ADR identifier
title: …
branch: …               # feature branch name
status: todo            # see lifecycle below
pr: ~                   # GitHub PR number, or ~ if not yet opened
pr_url: ~               # https://github.com/elydelva/mailmcp/pull/<n>
github_issue: ~         # GitHub Issue number, or ~ if not yet created
github_issue_url: ~     # https://github.com/elydelva/mailmcp/issues/<n>
depends_on: []          # ADRs that must be completed before this one can start
required_by: []         # ADRs that cannot start until this one is completed
---
```

## Dépendances entre ADRs

Les champs `depends_on` et `required_by` forment un graphe orienté acyclique qui définit l'ordre d'implémentation.

**Règle** : un ADR ne peut passer à `in-progress` que si tous ses `depends_on` sont à `completed`.

Le graphe complet et l'ordre d'implémentation recommandé sont maintenus dans [`docs/adr/README.md`](../adr/README.md).

Quand on écrit ou modifie un ADR :
1. Renseigner `depends_on` avec les ADRs dont la complétion est un prérequis.
2. Mettre à jour `required_by` sur chacun des ADRs listés dans `depends_on` (relation symétrique).
3. Mettre à jour la table de dépendances et l'ordre dans `docs/adr/README.md`.

## Lifecycle — keep `status` up to date

| Status | When to set it |
|--------|---------------|
| `todo` | ADR written but work not started |
| `in-progress` | Branch created / work begun |
| `completed` | PR merged to `main` |
| `abandoned` | Decision dropped — add an `## Abandonment` section explaining why |

## Rules

1. **Starting work** — set `status: in-progress`, create the GitHub Issue if absent, fill `github_issue` + `github_issue_url`.
2. **Opening a PR** — fill `pr` + `pr_url`, add `Closes #<github_issue>` in the PR body so GitHub auto-links it.
3. **PR merged** — set `status: completed`.
4. **Work dropped** — set `status: abandoned`, add `## Abandonment` section with the reason.
5. **Keep `docs/adr/README.md` in sync** — the status column must always match the frontmatter.
6. Never leave `pr`, `pr_url`, `github_issue`, or `github_issue_url` blank — use `~` (YAML null) when unknown.

## ADR template

See [`adr-template.md`](./adr-template.md) for the canonical structure to use when creating a new ADR.
