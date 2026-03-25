---
issue: ADR-011
title: CLI Companion & Workspace System
branch: feat/cli-workspace
status: in-progress
pr: ~
pr_url: ~
github_issue: ~
github_issue_url: ~
depends_on: [ADR-010, ADR-004, ADR-007]
required_by: []
---

# ADR-011 — CLI Companion & Workspace System

## Context

Deux problèmes distincts motivent ce composant :

**1. Le mot de passe ne peut pas transiter par le chat en mode server.**
En mode server, `setup_account` est appelé via Claude → serveurs Anthropic → mailmcp. Envoyer un mot de passe dans ce chemin est inacceptable. Il faut un canal local sécurisé.

**2. L'utilisateur doit pouvoir switcher entre plusieurs instances mailmcp.**
Solo local, serveur familial, serveur pro — le même outil doit gérer plusieurs contextes sans reconfigurer `claude_desktop_config.json` à chaque fois.

Le binaire `packages/mailmcp` répond aux deux : stdio MCP server en mode `--mcp`, CLI interactif sinon.

## Decisions

### Binaire unique, deux modes

```bash
mailmcp --mcp                  # lance le stdio MCP server (usage dans claude_desktop_config.json)
mailmcp <command>              # CLI interactif
```

Un seul `bin` dans `package.json`, pas deux exécutables distincts.

### Workspace system

Inspiré de `kubectl config use-context` et `gh auth switch`.

Config stockée dans `~/.config/mailmcp/config.json` :

```json
{
  "activeWorkspace": "local",
  "workspaces": {
    "local": {
      "type": "stdio",
      "dataDir": "~/.local/share/mailmcp"
    },
    "home": {
      "type": "server",
      "url": "https://mail.home.example.com",
      "token": "eyJ..."
    },
    "work": {
      "type": "server",
      "url": "https://mail.work.example.com",
      "token": "eyJ..."
    }
  }
}
```

Le workspace `local` existe toujours par défaut — jamais besoin de le créer.

### Commandes CLI

```bash
# Gestion des workspaces
mailmcp workspace list                          # liste + workspace actif (●)
mailmcp workspace use <name>                    # switch
mailmcp workspace add <name> <url>             # ajoute un server distant + OAuth
mailmcp workspace remove <name>                # supprime

# Gestion des comptes email
mailmcp setup                                   # wizard interactif (nouveau compte)
mailmcp accounts                                # liste les comptes du workspace actif
mailmcp accounts remove <email>                # supprime un compte

# Diagnostic
mailmcp status                                  # santé workspace actif + comptes
mailmcp doctor                                  # vérifie config, connexions, token OAuth
```

### Setup wizard UX (@clack/prompts)

```
$ mailmcp setup

◆ Quel fournisseur ?
│  ● Gmail
│  ○ iCloud
│  ○ Outlook / Microsoft 365
│  ○ Proton Mail
│  ○ Fastmail
│  ○ Autre (domaine custom)

◆ Adresse email
│  john@gmail.com

◆ Mot de passe d'application  (jamais affiché, jamais dans les logs)
│  ••••••••••••••••

◇ Test de connexion IMAP…  ✓
◇ Test de connexion SMTP…  ✓

✓ Compte john@gmail.com configuré (défaut)
```

Même UX en mode local (écrit dans `~/.local/share/mailmcp/db.json`) et en mode server (POST chiffré vers l'API REST de `packages/server`).

### stdio transport

En mode `--mcp`, `packages/mailmcp` lit le workspace actif pour déterminer le mode :

- Workspace `type: stdio` → lance le MCP server directement en utilisant `core/tools/` avec `userId = "local"` et `FileStorageAdapter`
- Workspace `type: server` → proxie les appels MCP vers le server distant via SSE/HTTP (l'auth OAuth est gérée transparentement)

Cela permet de ne configurer `claude_desktop_config.json` qu'une seule fois (`mailmcp --mcp`) et de switcher le contexte via `mailmcp workspace use <name>`.

### Communication avec packages/server

En mode distant, le CLI communique avec `packages/server` via :
- `POST /api/accounts` — création de compte (mot de passe saisi localement, envoyé en HTTPS)
- `GET /api/accounts` — liste
- `DELETE /api/accounts/:id` — suppression
- `GET /api/status` — santé du serveur

Ces endpoints REST sont dans `packages/server/api/` (distinct du transport MCP).

### Installation

```bash
# Usage ponctuel
bunx mailmcp setup

# Installation globale
bun install -g mailmcp

# Dans claude_desktop_config.json
{
  "mcpServers": {
    "mail": { "command": "mailmcp", "args": ["--mcp"] }
  }
}
```

## Alternatives considered

| Option | Reason rejected |
|--------|----------------|
| Two exécutables séparés (`mailmcp-cli` et `mailmcp-mcp`) | Configuration claude_desktop plus complexe, deux binaires à maintenir |
| Workspace géré par variable d'environnement | Non persistant, pas de commande `switch`, moins ergonomique |
| Saisie du mot de passe via un endpoint MCP dédié | Passe quand même par Claude — non acceptable en mode server |
| Web UI pour le setup | Scope trop large pour v1, CLI suffit et est plus universel |

## Goals / Commits

- [ ] `feat(cli): scaffold packages/mailmcp with --mcp / cli argv routing`
- [ ] `feat(cli): implement workspace config read/write (~/.config/mailmcp/)`
- [ ] `feat(cli): implement workspace list/use/add/remove commands`
- [ ] `feat(cli): implement setup wizard with @clack/prompts`
- [ ] `feat(cli): implement accounts list/remove commands`
- [ ] `feat(cli): implement status and doctor commands`
- [ ] `feat(mcp): implement stdio transport using core/tools with userId=local`
- [ ] `feat(mcp): implement stdio→server proxy mode for remote workspaces`
- [ ] `test(cli): unit tests for workspace config and command logic`

## Consequences

**Facilite :**
- Zero mot de passe dans le chat, dans tous les modes
- UX identique pour l'utilisateur quelle que soit l'infrastructure sous-jacente
- Migration local → server sans reconfigurer Claude

**Complique :**
- Le mode proxy stdio→server (workspace distant) nécessite de maintenir la compatibilité du protocole MCP entre les versions
- `doctor` et `status` doivent tester la connexion sans bloquer le démarrage
