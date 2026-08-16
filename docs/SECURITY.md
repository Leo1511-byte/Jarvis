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
Requires explicit approval each time via the real `ApprovalDialog`/`useApproval` flow
(`apps/desktop/frontend/src/components/ApprovalDialog.tsx`) — no standing auto-approval for
these, ever. As of Milestone 41, voice has its own parallel confirmation path (spoken, not a
popup) with the same real guarantee — see `docs/VOICE.md`.

## Rules

- No hardcoded credentials, anywhere, including frontend code.
- No unrestricted filesystem access where a scoped path will do (e.g. Obsidian MCP access
  scoped to the vault, not the whole home directory).
- No executing downloaded scripts or installing binaries without them being inspected first.
- No silent destructive actions — deletions, overwrites, and sends are always confirmed.
- Logs capture actions, agent runs, tool calls, errors, permission requests, and state
  transitions. Logs never capture passwords, tokens, API keys, private keys, or auth headers.

## Current state (updated 2026-08-15, moved from repo root as part of the docs restructure)

No secrets exist in *this git repo* — real API keys (ElevenLabs, Gemini) live in
`~/Documents/Obsidian Vault/System/voice/config.json`, which is outside this repo and never
committed (the vault isn't even a git repository). Supabase is provisioned and in real use
(confirmed live as of Milestone 39). Permission levels above are real and enforced —
`permissions.ts`, `ApprovalDialog`/`useApproval`, checked in `App.tsx`'s `handleCommand` for
built-in Skills and inside `commandEngine.ts`'s `ask` fallback — not aspirational. n8n was never
adopted (see `docs/ARCHITECTURE.md`'s stack decision).
