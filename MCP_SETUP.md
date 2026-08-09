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
| Google Calendar | Schedule read, gated writes | Suggested via Cowork's connector picker already; needs you to authorize |
| Gmail | Search/read/draft, gated sends | Same — suggested, not yet authorized |

## Current state

None of these are configured yet in a local runtime, because a local runtime doesn't exist
yet. `SYSTEM_INSPECTION_PROMPT.md` will report what MCP servers (if any) are already configured
in your local Claude Code setup — that's the actual starting point, not this table.

## Test procedure (once configured)

Same pattern as the existing Obsidian connection test: write a known value, read it back,
modify it, read again, confirm. Do this per-server before relying on it for real work.
