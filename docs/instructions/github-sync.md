# GitHub Sync — Principe & Workflow

## Source de vérité : le dépôt git

À l'ère de l'IA, **le dépôt git est la seule source de vérité fiable** :

- Les commits, branches et tags sont immuables et vérifiables.
- Les ADRs (`docs/adr/`) documentent les décisions architecturales de façon durable.
- Les messages de commit (Conventional Commits) constituent le changelog vivant.

GitHub Issues et PRs sont une **couche UX** par-dessus git. Ils peuvent être supprimés, archivés, ou devenir obsolètes. Ne jamais leur faire confiance pour du contexte critique — ce contexte doit vivre dans les commits ou les ADRs.

## Pourquoi on sync quand même

GitHub offre une interface de collaboration précieuse : revue de code, discussion, signalement de WIP via les Draft PRs, lien visuel entre issues et PRs. On en profite, sans en dépendre.

## Quand synchroniser

| Moment | Action GitHub |
|--------|--------------|
| Démarrage du travail sur un ADR | Ouvrir l'issue correspondante si elle n'existe pas encore |
| Début du développement actif | Ouvrir une **Draft PR** depuis la branche, liée à l'issue (`Closes #N`) |
| Prêt pour review | Marquer la Draft PR comme **Ready for review** |
| PR mergée | L'issue se ferme automatiquement via `Closes #N` |
| Travail abandonné | Fermer l'issue manuellement avec un commentaire bref, mettre `status: abandoned` dans l'ADR |

## Draft PR — signal de WIP

Ouvrir une Draft PR **dès que la branche a un premier commit significatif**, même si le travail n'est pas terminé. C'est un signal :
- pour les collaborateurs (humains ou IA) que ce travail est en cours,
- pour garder la traçabilité entre branche et issue visible dans l'interface GitHub.

Une Draft PR ne déclenche pas de review requests. La convertir en PR normale quand le travail est prêt.

## Comment synchroniser (règles concrètes)

1. **Toujours lier** une PR à son issue avec `Closes #<N>` dans le corps de la PR.
2. **Toujours renseigner** `pr`, `pr_url`, `github_issue`, `github_issue_url` dans le frontmatter de l'ADR correspondant (voir [`adr-workflow.md`](./adr-workflow.md)).
3. **Utiliser les templates** de `docs/templates/` pour ouvrir issues et PRs (voir [`templates.md`](./templates.md)).
4. **Ne pas dupliquer le contexte** : le corps d'une issue ou PR peut résumer, mais la décision technique durable doit être dans l'ADR ou le commit.
5. **Ne pas bloquer sur GitHub** : si l'interface est inaccessible, le travail continue — git suffit. La sync se fait a posteriori.
