# Cahier des Charges — `@self/mcp-mail`
**Serveur MCP Email multi-utilisateurs avec OAuth 2.1**

> Version 1.0 — Mars 2026  
> Statut : Draft

---

## Table des matières

1. [Contexte & Objectifs](#1-contexte--objectifs)
2. [Architecture générale](#2-architecture-générale)
3. [Stack technique](#3-stack-technique)
4. [Gestion du stockage](#4-gestion-du-stockage)
5. [Authentification OAuth 2.1](#5-authentification-oauth-21)
6. [Setup Wizard — Détection automatique des providers](#6-setup-wizard--détection-automatique-des-providers)
7. [Providers email supportés](#7-providers-email-supportés)
8. [Outils MCP exposés](#8-outils-mcp-exposés)
9. [Gestion multi-utilisateurs](#9-gestion-multi-utilisateurs)
10. [Librairies de référence](#10-librairies-de-référence)
11. [Structure du projet](#11-structure-du-projet)
12. [Configuration & déploiement](#12-configuration--déploiement)
13. [Contraintes & exigences non-fonctionnelles](#13-contraintes--exigences-non-fonctionnelles)

---

## 1. Contexte & Objectifs

### 1.1 Contexte

Ce projet est un serveur MCP (Model Context Protocol) email conçu pour être auto-hébergé sur un VPS, derrière un reverse proxy (Traefik), et exposé via HTTPS. Il permet à des clients MCP — notamment Claude.ai (web & mobile), Claude Desktop, et Claude Code — d'accéder aux boîtes mail de ses utilisateurs via des outils structurés.

Le serveur est pensé comme une brique d'infrastructure personnelle dans un écosystème self-hosted plus large (Dokploy, AFFiNE, etc.).

### 1.2 Objectifs

- Exposer les fonctionnalités email (lecture, envoi, recherche, gestion) comme outils MCP
- Supporter plusieurs comptes email par utilisateur et plusieurs utilisateurs
- Implémenter OAuth 2.1 complet (compatible Claude.ai mobile & web)
- Fournir un setup wizard intelligent pour configurer les comptes email
- Être déployable en une commande via Docker Compose
- Supporter deux modes de stockage : PostgreSQL ou fichier JSON (volume Docker)

### 1.3 Non-objectifs

- Interface web de gestion des emails (webmail) — hors scope
- Chiffrement E2E des emails (délégué aux providers)
- Support SMTP entrant (serveur de réception propre) — hors scope

---

## 2. Architecture générale

```
Claude.ai / Claude Desktop / Claude Code
          │
          │ HTTPS — MCP over SSE / Streamable HTTP
          ▼
┌─────────────────────────────────────────────────┐
│              mcp-mail server                    │
│         (Fastify + @getlarge/fastify-mcp)       │
│                                                 │
│  /.well-known/oauth-protected-resource          │
│  /.well-known/openid-configuration (proxy)      │
│  /oauth2/register  (DCR proxy → Hydra)          │
│  /sse              (MCP SSE transport)           │
│  /mcp              (MCP Streamable HTTP)         │
│  /health                                        │
│                                                 │
│  Tools: send_email, read_email, search_email,   │
│         list_folders, move_email, delete_email, │
│         get_thread, list_accounts               │
└──────────────┬──────────────────────────────────┘
               │ token introspection
               ▼
┌─────────────────────────────────────┐
│           Ory Hydra                 │
│    (OAuth 2.1 + DCR + PKCE)        │
│                                    │
│  /oauth2/auth                      │
│  /oauth2/token                     │
│  /oauth2/register                  │
│  /admin/oauth2/introspect          │
└──────────────┬──────────────────────┘
               │ login / consent
               ▼
┌─────────────────────────────────────┐
│        Login UI (hydra-ui)          │
│  (hydra-login-consent-node          │
│   ou UI custom minimaliste)         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│           Storage                   │
│  PostgreSQL  OU  JSON file          │
│  (comptes email, sessions,          │
│   config utilisateurs)              │
└─────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     Providers email (externes)      │
│  Gmail · iCloud · Outlook · SMTP   │
│     (via IMAP + SMTP)               │
└─────────────────────────────────────┘
```

---

## 3. Stack technique

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| Runtime | Node.js 22+ | LTS, ESM natif, ARM64 |
| Framework HTTP | Fastify 5 | Performances, plugins first-party |
| MCP Protocol | `@getlarge/fastify-mcp` | Fork validé avec Claude.ai + OAuth |
| IMAP client | `imapflow` | Moderne, Promise-based, bien maintenu |
| SMTP client | `nodemailer` | Standard de facto Node.js SMTP |
| OAuth server | Ory Hydra v2.2+ | Seul serveur OS supportant DCR + OAuth 2.1 |
| Schéma validation | TypeBox (`@sinclair/typebox`) | Requis par `@getlarge/fastify-mcp` |
| ORM / Storage | Drizzle ORM (PostgreSQL) ou `lowdb` (JSON) | Choix au déploiement |
| Langage | TypeScript 5 | Typage strict, meilleure DX |
| Conteneurisation | Docker + Docker Compose | Déploiement VPS |
| Reverse proxy | Traefik (existant) | Déjà en place |

---

## 4. Gestion du stockage

Le serveur supporte deux backends de stockage, configurables via la variable d'environnement `STORAGE_BACKEND`.

### 4.1 Backend PostgreSQL (`STORAGE_BACKEND=postgres`)

Utilisé en production ou en multi-utilisateurs. Nécessite une instance PostgreSQL (peut être partagée avec Hydra ou dédiée).

**Schéma de données :**

```sql
-- Utilisateurs (identifiés par leur sub OAuth)
users (
  id          UUID PRIMARY KEY,
  oauth_sub   TEXT UNIQUE NOT NULL,   -- subject du token Hydra
  created_at  TIMESTAMPTZ DEFAULT now()
)

-- Comptes email par utilisateur
email_accounts (
  id           UUID PRIMARY KEY,
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,                  -- label affiché
  email        TEXT NOT NULL,
  provider     TEXT NOT NULL,                  -- gmail | icloud | outlook | generic
  imap_host    TEXT NOT NULL,
  imap_port    INTEGER NOT NULL,
  imap_secure  BOOLEAN DEFAULT true,
  smtp_host    TEXT NOT NULL,
  smtp_port    INTEGER NOT NULL,
  smtp_secure  BOOLEAN DEFAULT true,
  username     TEXT NOT NULL,
  -- mot de passe chiffré AES-256-GCM avec ENCRYPTION_KEY
  password_enc TEXT NOT NULL,
  is_default   BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
)
```

Implémentation via **Drizzle ORM** avec `drizzle-kit` pour les migrations.

### 4.2 Backend fichier JSON (`STORAGE_BACKEND=file`)

Utilisé pour les déploiements simples (usage solo, dev). Stocké dans un volume Docker monté.

```
/data/
├── users.json          # { [sub]: { id, createdAt } }
└── accounts.json       # { [userId]: EmailAccount[] }
```

Implémentation via **`lowdb`** (JSON file database, zero-dependency, synchrone).

Les mots de passe sont chiffrés de la même façon que pour PostgreSQL (AES-256-GCM).

### 4.3 Interface commune

Les deux backends implémentent la même interface TypeScript :

```typescript
interface StorageAdapter {
  // Users
  findOrCreateUser(sub: string): Promise<User>
  
  // Accounts
  listAccounts(userId: string): Promise<EmailAccount[]>
  getAccount(userId: string, accountId: string): Promise<EmailAccount | null>
  createAccount(userId: string, data: CreateAccountInput): Promise<EmailAccount>
  updateAccount(userId: string, accountId: string, data: Partial<CreateAccountInput>): Promise<EmailAccount>
  deleteAccount(userId: string, accountId: string): Promise<void>
  setDefaultAccount(userId: string, accountId: string): Promise<void>
}
```

---

## 5. Authentification OAuth 2.1

### 5.1 Protocole

Le serveur implémente le flow OAuth 2.1 complet requis par Claude.ai, conformément au [MCP Authorization spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization) :

| RFC / Spec | Statut MCP | Implémentation |
|-----------|-----------|----------------|
| OAuth 2.1 (`draft-ietf-oauth-v2-1`) | MUST | Via Hydra |
| Protected Resource Metadata (RFC 9728) | MUST | `/.well-known/oauth-protected-resource` |
| Authorization Server Metadata (RFC 8414) | MUST | Proxy vers Hydra |
| Dynamic Client Registration (RFC 7591) | MAY | DCR proxy avec nettoyage |
| Resource Indicators (RFC 8707) | MUST | Via Hydra |
| PKCE | MUST (clients publics) | Hydra enforced |

### 5.2 Endpoints exposés par le serveur MCP

```
GET  /.well-known/oauth-protected-resource
     → { resource: "https://mcp.example.com",
         authorization_servers: ["https://auth.example.com"] }

GET  /.well-known/openid-configuration
     → proxy vers Hydra avec override de client_registration_url

POST /oauth2/register   (DCR proxy)
     → proxy vers Hydra /oauth2/register
     → nettoyage des champs vides/null avant réponse
       (client_uri, logo_uri, tos_uri, contacts)
       ⚠️ Workaround bug Hydra + Claude validation Zod
```

### 5.3 Validation des tokens

Tokens **opaques** (pas JWT) → introspection Hydra admin :

```
POST http://hydra:4445/admin/oauth2/introspect
Authorization: Bearer {HYDRA_API_KEY}
Body: token={access_token}
```

Le `sub` retourné par l'introspection est utilisé comme identifiant utilisateur.

### 5.4 Ory Hydra — Configuration minimale requise

```yaml
OIDC_DYNAMIC_CLIENT_REGISTRATION_ENABLED: "true"
OIDC_DYNAMIC_CLIENT_REGISTRATION_DEFAULT_SCOPE: "openid,offline_access"
OAUTH2_PKCE_ENFORCED_FOR_PUBLIC_CLIENTS: "true"
STRATEGIES_ACCESS_TOKEN: "opaque"
TTL_ACCESS_TOKEN: "1h"
TTL_REFRESH_TOKEN: "720h"
```

---

## 6. Setup Wizard — Détection automatique des providers

### 6.1 Objectif

Permettre à un utilisateur de configurer un compte email en ne fournissant que son adresse email (et éventuellement son mot de passe). Le wizard détecte automatiquement le provider et les paramètres IMAP/SMTP.

### 6.2 Mécanisme de détection

**Étape 1 — Extraction du domaine**
```
user@gmail.com       → gmail
user@icloud.com      → icloud
user@outlook.com     → outlook
user@hotmail.com     → outlook
user@company.fr      → domaine custom → étape 2
```

**Étape 2 — Lookup DNS (domaines custom)**

Requête MX + SRV records :
```
_imap._tcp.company.fr    (SRV)
_imaps._tcp.company.fr   (SRV)
_submission._tcp.company.fr (SRV)
```

Fallback : tentative de connexion sur les ports standards :
- `imap.{domain}:993`, `mail.{domain}:993`, `{domain}:993`
- `smtp.{domain}:587`, `mail.{domain}:587`

**Étape 3 — Autoconfig Mozilla / Autodiscover Microsoft**

Requêtes HTTP dans l'ordre :
1. `https://autoconfig.{domain}/mail/config-v1.1.xml` (Mozilla Autoconfig)
2. `https://autodiscover.{domain}/autodiscover/autodiscover.xml` (MS Autodiscover)
3. `https://autodiscover.emailsrvr.com/autodiscover/autodiscover.xml` (fallback)

**Étape 4 — Base de données interne des providers connus**

```typescript
const KNOWN_PROVIDERS: ProviderConfig[] = [
  {
    id: 'gmail',
    domains: ['gmail.com', 'googlemail.com'],
    imap: { host: 'imap.gmail.com', port: 993, secure: true },
    smtp: { host: 'smtp.gmail.com', port: 587, secure: false, starttls: true },
    authNote: 'Nécessite un App Password (2FA activée)',
    docsUrl: 'https://support.google.com/accounts/answer/185833'
  },
  {
    id: 'icloud',
    domains: ['icloud.com', 'me.com', 'mac.com'],
    imap: { host: 'imap.mail.me.com', port: 993, secure: true },
    smtp: { host: 'smtp.mail.me.com', port: 587, secure: false, starttls: true },
    authNote: 'Nécessite un App-Specific Password',
    docsUrl: 'https://support.apple.com/en-us/102654'
  },
  {
    id: 'outlook',
    domains: ['outlook.com', 'hotmail.com', 'live.com', 'msn.com'],
    imap: { host: 'outlook.office365.com', port: 993, secure: true },
    smtp: { host: 'smtp-mail.outlook.com', port: 587, secure: false, starttls: true },
    authNote: 'Nécessite un App Password si MFA activée'
  },
  {
    id: 'yahoo',
    domains: ['yahoo.com', 'yahoo.fr', 'ymail.com'],
    imap: { host: 'imap.mail.yahoo.com', port: 993, secure: true },
    smtp: { host: 'smtp.mail.yahoo.com', port: 587, secure: false, starttls: true },
    authNote: 'Nécessite un App Password'
  },
  {
    id: 'protonmail',
    domains: ['proton.me', 'protonmail.com', 'pm.me'],
    imap: { host: '127.0.0.1', port: 1143, secure: false },
    smtp: { host: '127.0.0.1', port: 1025, secure: false },
    authNote: 'Nécessite Proton Mail Bridge installé localement',
    requiresBridge: true
  },
  // ... autres providers
]
```

### 6.3 Outil MCP `setup_account`

Le wizard est exposé comme outil MCP pour permettre une configuration interactive via Claude :

```typescript
// Étape 1 : détection
setup_account({ action: 'detect', email: 'user@gmail.com' })
→ { provider: 'gmail', config: {...}, authNote: '...', requiresAppPassword: true }

// Étape 2 : test de connexion
setup_account({ action: 'test', email, password, config })
→ { imap: 'ok', smtp: 'ok' } | { error: 'Authentication failed' }

// Étape 3 : sauvegarde
setup_account({ action: 'save', email, password, config, name: 'Gmail perso' })
→ { accountId: '...', success: true }
```

### 6.4 Validation de connexion

Avant toute sauvegarde, le wizard effectue :
1. Connexion IMAP test → `SELECT` sur INBOX
2. Connexion SMTP test → `EHLO` + `AUTH`
3. En cas d'échec : message d'erreur explicite avec suggestion (ex. "App Password requis")

---

## 7. Providers email supportés

| Provider | IMAP | SMTP | Auth | Détection auto |
|----------|------|------|------|----------------|
| Gmail | ✅ | ✅ | App Password / OAuth | ✅ |
| iCloud Mail | ✅ | ✅ | App-Specific Password | ✅ |
| Outlook / Hotmail | ✅ | ✅ | App Password / OAuth | ✅ |
| Yahoo Mail | ✅ | ✅ | App Password | ✅ |
| Proton Mail | ✅ (Bridge) | ✅ (Bridge) | Bridge local | ✅ (avec note) |
| Fastmail | ✅ | ✅ | App Password | ✅ |
| Zoho Mail | ✅ | ✅ | App Password | ✅ |
| SMTP custom | ✅ | ✅ | Password | ✅ (DNS lookup) |
| Postfix / Dovecot | ✅ | ✅ | Password | ✅ (DNS lookup) |

---

## 8. Outils MCP exposés

Tous les outils sont scopés à l'utilisateur authentifié via le token OAuth. Un utilisateur ne peut accéder qu'à ses propres comptes.

### 8.1 Gestion des comptes

| Outil | Description |
|-------|-------------|
| `setup_account` | Wizard de configuration (detect → test → save) |
| `list_accounts` | Liste les comptes email de l'utilisateur |
| `delete_account` | Supprime un compte email |
| `set_default_account` | Définit le compte par défaut |

### 8.2 Lecture

| Outil | Description | Params clés |
|-------|-------------|-------------|
| `list_emails` | Liste les emails d'un dossier | `folder`, `limit`, `offset`, `unread_only` |
| `get_email` | Récupère un email complet (headers + body) | `uid`, `account_id` |
| `get_thread` | Récupère un fil de discussion | `thread_id` |
| `list_folders` | Liste les dossiers IMAP | `account_id` |

### 8.3 Recherche

| Outil | Description | Params clés |
|-------|-------------|-------------|
| `search_emails` | Recherche full-text | `query`, `folder`, `from`, `to`, `since`, `before`, `has_attachment` |

### 8.4 Actions

| Outil | Description | Params clés |
|-------|-------------|-------------|
| `send_email` | Envoie un email | `to`, `cc`, `bcc`, `subject`, `body`, `reply_to_uid` |
| `reply_email` | Répond à un email | `uid`, `body`, `reply_all` |
| `forward_email` | Transfère un email | `uid`, `to`, `note` |
| `move_email` | Déplace vers un dossier | `uid`, `target_folder` |
| `delete_email` | Supprime (trash ou permanent) | `uid`, `permanent` |
| `mark_email` | Marque lu/non-lu/étoilé | `uid`, `flag`, `value` |

### 8.5 Gestion batch

| Outil | Description |
|-------|-------------|
| `batch_move` | Déplace plusieurs emails |
| `batch_delete` | Supprime plusieurs emails |
| `batch_mark` | Marque plusieurs emails |

---

## 9. Gestion multi-utilisateurs

### 9.1 Isolation

Chaque utilisateur est identifié par son `sub` OAuth (subject Hydra). Toutes les requêtes IMAP/SMTP sont exécutées avec les credentials de l'utilisateur authentifié. Il n'y a aucun compte "admin" avec accès aux données d'autres utilisateurs.

### 9.2 Pool de connexions IMAP

Les connexions IMAP sont coûteuses à établir. Le serveur maintient un pool par compte email :

```typescript
// Par utilisateur + par compte
const connectionPool = new Map<string, ImapFlow>()
// Clé : `${userId}:${accountId}`

// TTL de connexion inactive : 5 minutes
// Max connexions simultanées par compte : 2
```

### 9.3 Limites par utilisateur

Configurables via variables d'environnement :

```
MAX_ACCOUNTS_PER_USER=10    # comptes email max par user
MAX_EMAILS_PER_FETCH=100    # emails max par requête list
IMAP_TIMEOUT_MS=30000       # timeout connexion IMAP
```

---

## 10. Librairies de référence

Le serveur s'inspire des projets existants suivants, sans les fork ou les inclure directement :

### 10.1 `@codefuturist/email-mcp`

**Repo** : `github.com/codefuturist/email-mcp`  
**Inspiration** : Structure des outils MCP email (noms, paramètres, comportements), gestion du config TOML multi-comptes, détection automatique des providers via base de données interne.  
**Ce qu'on réutilise** : Le schéma de configuration des providers, la liste des providers supportés, la logique de test de connexion.  
**Ce qu'on ne réutilise pas** : L'architecture stdio/CLI (on est HTTP natif), la gestion auth (on a OAuth).

### 10.2 `@marlinjai/email-mcp`

**Repo** : `github.com/marlinjai/email-mcp`  
**Inspiration** : Support multi-providers avec fallback IMAP générique, batch operations design, compact search results pattern.  
**Ce qu'on réutilise** : Le pattern de résultats compacts (returnBody=false par défaut), la logique de batch operations.

### 10.3 `@getlarge/fastify-mcp`

**Repo** : `github.com/getlarge/fastify-mcp`  
**Usage direct** : Oui — c'est la lib MCP principale. Fork de `@platformatic/mcp` avec meilleur support OAuth 2.1, DCR proxy, introspection auth.  
**Points critiques** :
- Schémas d'outils : objets obligatoires au top-level (pas de Union direct)
- `introspectionAuth` pour authentifier les appels admin Hydra
- Hook DCR pour nettoyage des champs vides (bug Hydra + Claude Zod)

### 10.4 `imapflow`

**Repo** : `github.com/postalsys/imapflow`  
**Usage direct** : Oui — client IMAP moderne.  
**Pourquoi** : API Promise-based propre, support IMAP IDLE (push), bien maintenu par Postal Systems (aussi auteurs de Nodemailer).

### 10.5 `nodemailer`

**Repo** : `github.com/nodemailer/nodemailer`  
**Usage direct** : Oui — client SMTP.  
**Pourquoi** : Standard de facto Node.js, support STARTTLS, OAuth2, zéro dépendance.

### 10.6 `mailparser` (via `@postalsys/email-parser`)

**Usage direct** : Oui — parsing des emails entrants (MIME, attachments, HTML → text).

---

## 11. Structure du projet

```
mcp-mail/
├── src/
│   ├── index.ts                 # Entry point Fastify
│   ├── server.ts                # Config serveur + plugins
│   │
│   ├── auth/
│   │   ├── oauth.ts             # Endpoints OAuth (/.well-known, DCR proxy)
│   │   └── middleware.ts        # Validation token via introspection
│   │
│   ├── storage/
│   │   ├── interface.ts         # StorageAdapter interface
│   │   ├── postgres.ts          # Implémentation PostgreSQL (Drizzle)
│   │   ├── file.ts              # Implémentation JSON (lowdb)
│   │   └── index.ts             # Factory selon STORAGE_BACKEND
│   │
│   ├── providers/
│   │   ├── known-providers.ts   # Base de données providers connus
│   │   ├── detector.ts          # Logique de détection auto (DNS, autoconfig)
│   │   └── validator.ts         # Test de connexion IMAP/SMTP
│   │
│   ├── imap/
│   │   ├── client.ts            # Wrapper imapflow
│   │   ├── pool.ts              # Pool de connexions
│   │   └── operations.ts        # list, get, search, move, delete, mark
│   │
│   ├── smtp/
│   │   ├── client.ts            # Wrapper nodemailer
│   │   └── operations.ts        # send, reply, forward
│   │
│   ├── tools/
│   │   ├── account-tools.ts     # setup_account, list_accounts, ...
│   │   ├── read-tools.ts        # list_emails, get_email, get_thread, ...
│   │   ├── search-tools.ts      # search_emails
│   │   ├── action-tools.ts      # send_email, reply, forward, move, delete, mark
│   │   └── batch-tools.ts       # batch_move, batch_delete, batch_mark
│   │
│   └── config.ts                # Validation config via env vars (Standard Schema)
│
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
├── tsconfig.json
└── drizzle/
    └── migrations/              # Migrations SQL (Drizzle Kit)
```

---

## 12. Configuration & déploiement

### 12.1 Variables d'environnement

```bash
# Serveur
PORT=3000
HOST=0.0.0.0
BASE_URL=https://mcp-mail.example.com        # URL publique du serveur MCP

# OAuth / Hydra
HYDRA_PUBLIC_URL=https://auth.example.com    # URL publique Hydra
HYDRA_ADMIN_URL=http://hydra:4445            # URL interne Hydra admin
HYDRA_API_KEY=                               # API key Hydra pour introspection

# Chiffrement des mots de passe email
ENCRYPTION_KEY=                              # 32 bytes hex (openssl rand -hex 32)

# Storage
STORAGE_BACKEND=postgres                     # postgres | file

# PostgreSQL (si STORAGE_BACKEND=postgres)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# File storage (si STORAGE_BACKEND=file)
DATA_DIR=/data                               # Dossier monté en volume Docker

# Limites
MAX_ACCOUNTS_PER_USER=10
MAX_EMAILS_PER_FETCH=100
IMAP_TIMEOUT_MS=30000
```

### 12.2 Docker Compose de déploiement

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: hydra
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: hydra
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hydra"]
      interval: 5s
      retries: 10

  hydra-migrate:
    image: oryd/hydra:v2.2.0
    command: migrate sql -e --yes
    environment:
      DSN: postgres://hydra:${POSTGRES_PASSWORD}@postgres:5432/hydra?sslmode=disable
    depends_on:
      postgres:
        condition: service_healthy
    restart: on-failure

  hydra:
    image: oryd/hydra:v2.2.0
    restart: unless-stopped
    command: serve all --dev
    environment:
      DSN: postgres://hydra:${POSTGRES_PASSWORD}@postgres:5432/hydra?sslmode=disable
      URLS_SELF_ISSUER: ${HYDRA_PUBLIC_URL}
      URLS_CONSENT: ${AUTH_UI_URL}/consent
      URLS_LOGIN: ${AUTH_UI_URL}/login
      URLS_LOGOUT: ${AUTH_UI_URL}/logout
      SECRETS_SYSTEM: ${HYDRA_SECRET}
      OIDC_DYNAMIC_CLIENT_REGISTRATION_ENABLED: "true"
      OIDC_DYNAMIC_CLIENT_REGISTRATION_DEFAULT_SCOPE: openid,offline_access
      OAUTH2_PKCE_ENFORCED_FOR_PUBLIC_CLIENTS: "true"
      STRATEGIES_ACCESS_TOKEN: opaque
      TTL_ACCESS_TOKEN: 1h
      TTL_REFRESH_TOKEN: 720h
    depends_on:
      hydra-migrate:
        condition: service_completed_successfully
    expose:
      - "4444"
      - "4445"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.hydra.rule=Host(`${HYDRA_DOMAIN}`)"
      - "traefik.http.routers.hydra.entrypoints=websecure"
      - "traefik.http.routers.hydra.tls.certresolver=letsencrypt"
      - "traefik.http.services.hydra.loadbalancer.server.port=4444"

  hydra-ui:
    image: oryd/hydra-login-consent-node:latest
    restart: unless-stopped
    environment:
      HYDRA_ADMIN_URL: http://hydra:4445
    expose:
      - "3000"
    depends_on:
      - hydra
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.hydra-ui.rule=Host(`${AUTH_UI_DOMAIN}`)"
      - "traefik.http.routers.hydra-ui.entrypoints=websecure"
      - "traefik.http.routers.hydra-ui.tls.certresolver=letsencrypt"
      - "traefik.http.services.hydra-ui.loadbalancer.server.port=3000"

  mcp-mail:
    build: ./server
    restart: unless-stopped
    environment:
      BASE_URL: https://${MCP_MAIL_DOMAIN}
      HYDRA_PUBLIC_URL: https://${HYDRA_DOMAIN}
      HYDRA_ADMIN_URL: http://hydra:4445
      HYDRA_API_KEY: ${HYDRA_API_KEY}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      STORAGE_BACKEND: ${STORAGE_BACKEND:-postgres}
      DATABASE_URL: postgresql://mcp:${MCP_DB_PASSWORD}@postgres:5432/mcp_mail
      DATA_DIR: /data
    volumes:
      - mcp_data:/data    # utilisé uniquement si STORAGE_BACKEND=file
    depends_on:
      - hydra
    expose:
      - "3000"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mcp-mail.rule=Host(`${MCP_MAIL_DOMAIN}`)"
      - "traefik.http.routers.mcp-mail.entrypoints=websecure"
      - "traefik.http.routers.mcp-mail.tls.certresolver=letsencrypt"
      - "traefik.http.services.mcp-mail.loadbalancer.server.port=3000"

volumes:
  postgres_data:
  mcp_data:
```

### 12.3 Sous-domaines requis

| Domaine | Service | Description |
|---------|---------|-------------|
| `mcp-mail.example.com` | mcp-mail | Serveur MCP (URL à brancher dans Claude.ai) |
| `auth.example.com` | hydra | OAuth server public |
| `auth-ui.example.com` | hydra-ui | Login & consent page |

---

## 13. Contraintes & exigences non-fonctionnelles

### 13.1 Compatibilité

- Claude.ai web & mobile ✅
- Claude Desktop ✅
- Claude Code (CLI) ✅ (avec workaround bug scope — cf. section 5.2)
- ARM64 (VPS ARM) ✅ (toutes les images Docker sont multi-arch)

### 13.2 Sécurité

- Mots de passe email chiffrés **AES-256-GCM** au repos
- Tokens OAuth opaques (pas de JWT exposé)
- PKCE obligatoire pour tous les clients publics
- HTTPS obligatoire en production (Traefik + Let's Encrypt)
- Isolation stricte par utilisateur (aucune fuite cross-user)
- `ENCRYPTION_KEY` jamais loggée ni exposée dans les erreurs

### 13.3 Performance

- Pool de connexions IMAP (pas de reconnexion à chaque requête)
- Résultats compacts par défaut (`returnBody=false` sur `list_emails`)
- Pagination obligatoire sur tous les outils de liste
- Timeout configurable sur les connexions IMAP

### 13.4 Observabilité

- Logs structurés JSON via Fastify logger (Pino)
- Health endpoint `GET /health` sans auth
- Pas de métriques Prometheus dans cette version (v1)

### 13.5 Maintenabilité

- TypeScript strict (`"strict": true`)
- Schémas TypeBox sur tous les outils MCP
- StorageAdapter interface → swap PostgreSQL ↔ JSON sans toucher au reste
- Un seul `docker-compose.yml` pour tout déployer

---

*Fin du cahier des charges v1.0*