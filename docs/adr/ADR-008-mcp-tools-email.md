---
issue: ADR-008
title: MCP Tools — Email Operations
branch: feat/mcp-tools-email
status: todo
pr: ~
pr_url: ~
github_issue: 8
github_issue_url: https://github.com/elydelva/mailmcp/issues/8
---

# ADR-008 — MCP Tools: Email Operations

## Context
Expose all email operations as MCP tools: read, search, send, and batch actions.

## Decisions
- Read: `list_emails`, `get_email`, `get_thread`, `list_folders`
- Search: `search_emails`
- Actions: `send_email`, `reply_email`, `forward_email`, `move_email`, `delete_email`, `mark_email`
- Batch: `batch_move`, `batch_delete`, `batch_mark`
- Mandatory pagination on all list tools
- `returnBody=false` by default on `list_emails` for compact responses

## Goals / Commits
- [ ] `feat(tools): implement list_emails and get_email tools`
- [ ] `feat(tools): implement list_folders and get_thread tools`
- [ ] `feat(tools): implement search_emails tool`
- [ ] `feat(tools): implement send_email, reply_email, forward_email tools`
- [ ] `feat(tools): implement move_email, delete_email, mark_email tools`
- [ ] `feat(tools): implement batch_move, batch_delete, batch_mark tools`
- [ ] `test(tools): integration tests for email operation tools`
