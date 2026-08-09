# MCP Setup

MCP servers for JARVIS get configured **locally**, in the Claude Code session that acts as the
JARVIS runtime — not in Cowork, which has its own separate MCP configuration that doesn't
carry over.

## Planned servers

| Server | Purpose | Scope |
|---|---|---|
| Filesystem / Obsidian | Read/write the vault | Scoped to `/Users/leonardo/obsidian` only, not the whole home directory |
| Supabase | Structured state queries | Least-privilege service role, not the admin key, once provisioned |
| GitHub | Repo/issue/PR read, gated writes | **Read path done a different way, 2026-08-09** — no MCP server configured or needed; `check my github`/`check my prs` route through the orchestrator, which tells the local `claude` CLI to use its already-authenticated `gh` command directly. Write actions (create PR, comment, merge) would still be Level 3 and aren't built |
| Google Calendar | Schedule read, gated writes | **Verified working locally, 2026-08-09** — `list_calendars` called directly from this local Claude Code session, returned real data |
| Gmail | Search/read/draft, gated sends | **Verified working locally, 2026-08-09** — `list_labels` called directly from this local Claude Code session, returned real data |

## Current state

**Correction, 2026-08-09 (second correction to this doc):** the previous correction below said
Calendar/Gmail were Cowork-scoped and needed separate configuration in the local runtime. That
turned out to be wrong, or at least no longer true — tested directly from this local Claude Code
session (not Cowork) and both connectors are already configured and working here: `list_calendars`
returned 2 real calendars, `list_labels` returned real Gmail label counts (e.g. 1040 INBOX
messages). So Milestones 14/15 are *not* blocked on MCP configuration. What's still missing is
routing — nothing in the JARVIS desktop app can invoke these yet, since that needs the M10
orchestrator process to exist first.

Filesystem/Obsidian and Supabase servers are not yet configured/provisioned. GitHub turned out
not to need an MCP server at all — `gh auth status` confirmed real local auth, and the
orchestrator's `claude` process already has bash/tool access to call `gh` directly, so
`check my github` (M12) is done without one. Worth remembering as a general pattern: an MCP
server is only needed when the underlying capability isn't already reachable some other way the
orchestrator has access to.

**Prior correction, 2026-08-09 (kept for history):** earlier drafts of this doc implied
Calendar/Gmail access still needed you to authorize a connector. Checked directly — both were
already connected at the Cowork account level; the open question at the time was only whether
that access carried over to the local runtime, which the test above has now answered.

## Test procedure (once configured)

Same pattern as the existing Obsidian connection test: write a known value, read it back,
modify it, read again, confirm. Do this per-server before relying on it for real work.
