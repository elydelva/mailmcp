# Templates — Utilisation

Les templates pour issues et PRs sont dans `docs/templates/`.

```
docs/templates/
  issues/
    bug.md       ← signalement d'un bug
    feature.md   ← demande de fonctionnalité / nouveau ADR
  pr/
    bugfix.md    ← PR corrigeant un bug
    feature.md   ← PR implémentant un ADR / feature
```

## Quand utiliser quel template

| Situation | Template |
|-----------|---------|
| Comportement inattendu / régresssion | `issues/bug.md` |
| Nouveau travail lié à un ADR ou feature | `issues/feature.md` |
| PR corrigeant un bug (issue de type bug) | `pr/bugfix.md` |
| PR implémentant un ADR ou feature | `pr/feature.md` |

## Comment créer une issue avec le template

```sh
# Copier le template, l'éditer, puis créer l'issue
gh issue create --title "ADR-00X — …" --body-file docs/templates/issues/feature.md
```

## Comment créer une PR avec le template

```sh
# Draft PR dès le premier commit significatif
gh pr create --draft \
  --title "feat(<scope>): …" \
  --body-file docs/templates/pr/feature.md \
  --base main

# Convertir en PR normale quand prête
gh pr ready <number>
```

## Règle générale

Les templates sont des points de départ — adapter le contenu au contexte réel. Ne pas laisser de sections vides avec leur placeholder : soit les remplir, soit les supprimer.
