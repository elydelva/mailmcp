---
issue: ADR-015
title: Email body rendering pipeline — MIME parsing, content extraction, Markdown output
branch: feat/email-body-rendering
status: completed
pr: 44
pr_url: https://github.com/elydelva/mailmcp/pull/44
github_issue: 43
github_issue_url: https://github.com/elydelva/mailmcp/issues/43
depends_on: [ADR-008, ADR-014]
required_by: []
---

# ADR-015 — Email body rendering pipeline

## Context

Les outils MCP d'ADR-008 exposent aujourd'hui un champ `bodyText` qui correspond au
fragment `text/plain` brut extrait du message IMAP. Ce fragment souffre de plusieurs
problèmes qui le rendent inutilisable en l'état :

1. **Quoted-printable non décodé** — les séquences `=C3=A9`, `=0D=0A`, etc. ne sont
   pas résolues ; le texte est illisible.
2. **Entités HTML et zero-width characters** — les newsletters embarquent du HTML
   dans le `text/plain` (`&zwnj;`, `&#8199;`, balises `<a>`, etc.).
3. **Absence de structure** — les liens de tracking, footers légaux, blocs
   "se désabonner" et répétitions de URLs noyent le contenu utile.
4. **Encodages mixtes** — base64, UTF-8, Latin-1 coexistent dans un même message
   selon l'expéditeur.

La cause racine est l'absence d'un vrai parseur MIME : on extrait le texte au niveau
bas sans exploiter la structure multipart du message (`text/plain`, `text/html`,
`multipart/alternative`, pièces jointes…).

Un modèle de langage consommant ces données via MCP génère des réponses de mauvaise
qualité quand le contexte email est bruité. Un pipeline de rendu propre améliore
directement la pertinence des outils MCP.

## Decisions

Le pipeline est découpé en **trois couches indépendantes**, chacune portée par une
bibliothèque spécialisée. Aucune couche ne connaît le détail de la suivante.

### Couche 1 — Parse MIME : `mailparser`

**Responsabilité :** décoder la structure complète du message IMAP.

- Résout le quoted-printable et le base64 de façon transparente.
- Extrait les parties `text/plain` et `text/html` séparément.
- Expose les métadonnées structurées (`from`, `to`, `subject`, `date`, `attachments`).
- Produit un objet `ParsedMail` typé utilisé par les couches suivantes.

`mailparser` est la seule couche qui touche au MIME brut. Les couches 2 et 3
reçoivent uniquement du HTML ou du texte déjà décodé.

### Couche 2 — Extraction du contenu principal : `@mozilla/readability` + `linkedom`

**Responsabilité :** isoler le contenu éditorial du HTML en éliminant le bruit
propre aux newsletters (header, footer, liens de tracking, blocs "unsubscribe",
répétitions d'URLs).

- `@mozilla/readability` implémente l'algorithme de Firefox Reader Mode.
- `linkedom` fournit un DOM léger compatible Bun/Edge, sans dépendance native.
- La couche reçoit le `html` issu de la couche 1 et retourne un HTML nettoyé.
- Si `readability` échoue à extraire un article (score trop bas), le HTML brut
  décodé est passé directement à la couche 3 sans erreur.

Cette couche est **optionnelle et non bloquante** : son absence ne rompt pas le
pipeline.

### Couche 3 — Conversion Markdown : `turndown`

**Responsabilité :** transformer le HTML nettoyé en Markdown lisible par un LLM.

- Convertit les éléments structurels (`h1`–`h6`, `ul`, `ol`, `blockquote`, `pre`).
- Règle custom `strip-tracking-links` : les `<a href>` pointant vers des domaines
  de tracking connus (`click.`, `track.`, `links.`, redirecteurs) sont remplacés
  par leur texte ; les liens éditoriaux légitimes sont conservés en syntaxe
  `[texte](url)`.
- Les éléments `<style>`, `<script>`, `<img>` sont supprimés avant conversion.
- La sortie est un Markdown `atx` (headings `#`) avec listes à tiret.

### Package cible : `@mailmcp/parser`

Un nouveau workspace `packages/parser` porte les trois couches et exporte :

```ts
// Point d'entrée unique
export async function renderEmail(rawMime: string): Promise<RenderedEmail>

export interface RenderedEmail {
  subject:     string
  from:        string
  date:        Date
  markdown:    string        // sortie principale — HTML → Readability → Turndown
  plainText:   string        // text/plain décodé — fallback si pas de HTML
  hasHtml:     boolean
  attachments: Attachment[]
}
```

Les outils MCP d'ADR-008 remplacent le champ `bodyText` brut par `markdown` (ou
`plainText` si `hasHtml === false`).

## Alternatives considérées

| Option | Raison rejetée |
|--------|----------------|
| Regex de nettoyage ad hoc sur `text/plain` | Fragile, ne résout pas le quoted-printable ni la structure multipart |
| `node-html-markdown` à la place de `turndown` | Moins extensible, pas de système de règles custom |
| `jsdom` à la place de `linkedom` | Dépendance native lourde, incompatible edge/Bun sans configuration |
| Tout-en-un (`email-reply-parser`, etc.) | Orienté fil de réponse, pas newsletter ; pas de séparation claire des couches |
| Extraction LLM directe sur le HTML brut | Consomme trop de tokens, coût élevé pour un résultat équivalent |

## Goals / Commits

- [x] `feat(parser): scaffold @mailmcp/parser package with tsconfig and deps`
- [x] `feat(parser): layer 1 — mailparser MIME decode, export ParsedMail`
- [x] `feat(parser): layer 2 — readability content extraction with linkedom`
- [x] `feat(parser): layer 3 — turndown html-to-markdown with tracking-link rule`
- [x] `feat(parser): renderEmail() pipeline wiring all three layers`
- [x] `test(parser): unit tests for each layer in isolation`
- [x] `test(parser): integration test on real newsletter fixture`
- [x] `feat(tools): add markdown and plain text fields to get-email tool via parser`
- [x] `feat(docker): add parser package to build stage`

## Consequences

**Facilité :**
- Le contexte fourni aux LLMs via MCP est propre et structuré → meilleures réponses.
- Chaque couche est testable indépendamment avec un input/output clairement défini.
- L'ajout de règles de nettoyage supplémentaires (ex. : filtre par domaine) est
  localisé dans la couche 3 sans toucher au parsing MIME.

**Difficulté / compromis :**
- `mailparser` requiert le message IMAP **complet** (headers + body) ; les clients
  IMAP existants (ADR-005) doivent passer de `BODY[TEXT]` à `RFC822` ou `BODY[]`
  lors du fetch — changement mineur mais nécessaire.
- `linkedom` ne couvre pas 100 % des API DOM ; les newsletters très complexes
  peuvent produire des résultats `readability` dégradés. Le fallback HTML brut
  atténue ce risque.
- Ajout de ~4 dépendances runtime (`mailparser`, `turndown`, `@mozilla/readability`,
  `linkedom`) dans un package dédié, sans impact sur les autres packages du monorepo.
