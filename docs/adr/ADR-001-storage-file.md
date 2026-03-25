---
issue: ADR-001
title: Storage Layer — Interface + File Backend
branch: feat/storage-file-backend
status: in-progress
---

# ADR-001 — Storage Layer: File Backend

## Context
The server needs to persist email accounts and user data.
Two backends are planned; this issue covers the interface and the lightweight file backend.

## Decisions
- Common `StorageAdapter` TypeScript interface for both backends
- File backend uses `lowdb` (zero-dep JSON file database, good for solo/dev use)
- Passwords encrypted at rest with AES-256-GCM using `ENCRYPTION_KEY`

## Goals / Commits
- [x] `feat(storage): define StorageAdapter interface and core types`
- [x] `feat(storage): implement AES-256-GCM encrypt/decrypt helpers`
- [x] `feat(storage): implement file backend with lowdb`
- [x] `test(storage): unit tests for file backend CRUD`
- [x] `feat(storage): storage factory selecting backend via STORAGE_BACKEND env`
