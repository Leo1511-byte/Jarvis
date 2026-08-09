# MCP Setup

MCP servers for JARVIS get configured **locally**, in the Claude Code session that acts as the
JARVIS runtime — not in Cowork, which has its own separate MCP configuration that doesn't
carry over.

## Planned servers

| Server | Purpose | Scope |
|---|---|---|
| Filesystem / Obsidian | Read/write the vault | Scoped to `/Users/leonardo/obsidian` only, not the whole home directory |
| Supabase | Structured state queries | Least-privilege service role, not the admin key, once provisioned |
| GitHub | Repo/issue/PR read, gated writes | Read by default; push/create requires Level 3 approval |
| Google Calendar | Schedule read, gated writes | Already connected in Cowork sessions (confirmed 2026-08-09 — a Calendar MCP is available there) — but that's session-scoped, not something the desktop app inherits. Needs its own server configured in the local runtime |
| Gmail | Search/read/draft, gated sends | Same situation as Calendar — a Gmail-like MCP is connected in Cowork already, doesn't transfer to the local runtime, needs separate local config |

## Current state

None of these are configured in the *local* runtime yet, because a local runtime doesn't exist
yet. `SYSTEM_INSPECTION_PROMPT.md` will report what MCP servers (if any) are already configured
in your local Claude Code setup — that's the actual starting point, not this table.

**Correction, 2026-08-09:** earlier drafts of this doc implied Calendar/Gmail access still
needed you to authorize a connector. Checked directly — both are already connected at the Cowork
account level. The remaining gap isn't authorization, it's scope: Cowork's connectors exist only
inside Cowork chat sessions, not inside the standalone JARVIS.app / local Claude Code process
that will actually run as JARVIS. Milestones 14/15 are blocked on configuring equivalent MCP
servers in that local runtime, not on getting your permission again.

## Test procedure (once configured)

Same pattern as the existing Obsidian connection test: write a known value, read it back,
modify it, read again, confirm. Do this per-server before relying on it for real work.
