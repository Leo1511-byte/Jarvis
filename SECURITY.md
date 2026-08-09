# Security

## Never commit

`.env`, `*.key`, `*.pem`, `tokens/`, `credentials/`, `secrets/`, database passwords, API keys,
OAuth client secrets, OS credential files. Enforced by `.gitignore`; treat any diff touching
these patterns as a stop-and-check moment, not something to push through.

## Permission levels

**Level 1 — Safe.** Read, search, analyze, summarize, recommend. Generally allowed without
asking.

**Level 2 — Workspace modification.** Create/update a note, task, or project doc; modify
approved code; create a research entry. Allowed, but every action must be traceable (logged in
`CHANGELOG.md` or the activity feed once it exists).

**Level 3 — Sensitive.** Delete files, send email, deploy, publish, change accounts or
security settings, modify credentials, push risky code, run destructive terminal commands.
Requires explicit approval each time via the approval UI (`AGENT_SYSTEM.md`) — no standing
auto-approval for these, ever.

## Rules

- No hardcoded credentials, anywhere, including frontend code.
- No unrestricted filesystem access where a scoped path will do (e.g. Obsidian MCP access
  scoped to the vault, not the whole home directory).
- No executing downloaded scripts or installing binaries without them being inspected first.
- No silent destructive actions — deletions, overwrites, and sends are always confirmed.
- Logs capture actions, agent runs, tool calls, errors, permission requests, and state
  transitions. Logs never capture passwords, tokens, API keys, private keys, or auth headers.

## Current state

No secrets exist in this repo yet — nothing has been provisioned (no Supabase project, no n8n
instance, no OAuth apps). This file will grow real content once Milestone 7 (Supabase) and
Milestone 18 (permissions + security UI) start.
