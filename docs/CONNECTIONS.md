# Connections — what JARVIS can access

Current-state reference, 2026-08-15. Connection ≠ Skill: a Connection is *access*; a Skill is
*ability* built on top of one or more Connections. See `docs/SKILLS.md`.

## The registry (`apps/desktop/frontend/src/lib/store/builtinConnections.ts`)

Fixed, known-in-advance metadata — not something the UI creates, edits, or authenticates. Six
real connections:

| Connection | Capabilities | Read-only? |
|---|---|---|
| `calendar` | `read-events` | Yes |
| `gmail` | `read-email` | Yes |
| `github` | `read-prs-issues` | Yes |
| `obsidian` | `read-vault`, `write-notes` | Mixed |
| `web` | `search-and-summarize` | Yes |
| `supabase` | `read-structured-state`, `write-structured-state` | Mixed |

Mirrored by hand in `packages/database/migrations/0003_connections.sql`'s seed inserts — neither
`builtinConnections.ts` nor the migration is the sole source of truth; they're meant to match.
No credentials or auth state live in either place — that stays where it already is (OS keyring,
`.claude/settings.local.json`, `.env.local`). See `docs/SECURITY.md`.

## How connections actually work today

None of these six are Connections in the "JARVIS opened an authenticated session" sense — they're
all reached through tools the *local `claude` CLI process* already has configured (MCP servers for
Calendar/Gmail, the `gh` CLI for GitHub, direct filesystem access for Obsidian). `commandEngine.ts`
never talks to any of these APIs directly; it sends a purpose-built prompt to the orchestrator
(`run_orchestrator`) and the `claude` process's own tool access does the rest. This is why adding a
"connection" in this codebase mostly means: confirm the local `claude` process can already reach
it, then register the metadata here for the UI/permission system to reference — not writing a new
API client.

## Status honesty rule

`ConnectionsView.tsx`'s `statusFor()` reports `connected` / `unverified` / `not-wired` per
connection, matching the same evidence bar `StatusPanel.tsx` uses elsewhere — a connection is only
`connected` if it's been confirmed live via a real command-bar result, `unverified` if the code
path exists but hasn't been click-through confirmed, `not-wired` otherwise. Never show a fake
green checkmark (see `docs/WAYS_OF_WORKING.md`'s error-handling rule).

## Adding a Connection

1. Add an entry to `builtinConnections.ts` with real capabilities and accurate `readOnly` flags.
2. Add the matching seed row to `0003_connections.sql`.
3. Confirm the local `claude` process can actually reach it (MCP server configured, CLI
   authenticated, etc.) before claiming `connected` anywhere.
4. Any Skill that needs it references the id in its `connectionIds`.
