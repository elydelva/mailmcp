# Versioning & Releases

Versioning is fully automated via **Conventional Commits** + **release-please**.

## Commit format (enforced by Husky + commitlint)

```
<type>(<scope>): <description>
```

| Type | Version bump | Appears in changelog |
|------|-------------|----------------------|
| `feat` | minor | yes |
| `fix` | patch | yes |
| `perf` | patch | yes |
| `deps` | patch | yes |
| `docs` | — | yes |
| `refactor`, `test`, `ci`, `chore` | — | hidden |
| `feat!` / `BREAKING CHANGE:` | **major** | yes |

Examples:
```
feat(auth): add OAuth 2.1 PKCE flow
fix(imap): handle connection timeout gracefully
feat!: drop Node.js support — Bun only
```

## Release pipeline

1. Each merge to `main` triggers the `release-please` workflow.
2. release-please maintains a **"Release PR"** that bumps `package.json` and updates `CHANGELOG.md`.
3. Merging the Release PR creates the GitHub Release and Git tag.
4. The tag triggers the Docker publish job in `release-please.yml`.

## CI Docker images

| Event | Image tag |
|-------|-----------|
| Push to `main` | `ghcr.io/<org>/mailmcp:main`, `:sha-<sha>` |
| Release tag | `:1.2.3`, `:1.2`, `:1`, `:latest` |
