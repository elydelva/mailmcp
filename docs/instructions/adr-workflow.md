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
---
```

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
