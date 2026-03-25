---
issue: ADR-004
title: Provider Detection & Setup Wizard
branch: feat/provider-detection
status: todo
---

# ADR-004 — Provider Detection

## Context
The setup wizard should detect IMAP/SMTP config automatically from an email address,
minimizing manual configuration.

## Decisions
- Static database of known providers (gmail, icloud, outlook, yahoo, protonmail, fastmail, zoho)
- DNS lookup (MX + SRV records) for custom domains
- Fallback: Mozilla Autoconfig + Microsoft Autodiscover XML
- IMAP + SMTP connection test before saving any account

## Goals / Commits
- [ ] `feat(providers): add known-providers static database`
- [ ] `feat(providers): implement email-to-provider detection by domain`
- [ ] `feat(providers): add DNS SRV/MX lookup for custom domains`
- [ ] `feat(providers): add Mozilla Autoconfig + MS Autodiscover HTTP fallback`
- [ ] `feat(providers): add IMAP/SMTP connection validator`
- [ ] `test(providers): unit tests for detection logic`
