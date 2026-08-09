# Obsidian Setup

## Reconciling the spec with what already exists

The master spec (§8) describes creating a fresh numbered folder structure (`00 - Dashboard`
through `12 - Archive`) plus an `11 - AI Memory/` folder with `MASTER_CONTEXT.md`,
`CURRENT_STATE.md`, `DECISIONS.md`, `LESSONS.md`, `AGENT_RULES.md`, `SYSTEM_STATE.md`,
`ACTIVE_PROJECT.md`.

Your vault at `/Users/leonardo/obsidian` already has a working structure:

```
Inbox/    — unsorted quick capture
Daily/    — one note per day (YYYY-MM-DD.md)
Notes/    — the durable second brain
Briefs/   — daily generated morning briefs
System/   — Jarvis's own memory/config (not user-facing)
  scripts/  — what_open.py, connect_this.py, orphan_scan.py
  voice/    — speak_daemon.py, config.json, queue/, done/
```

Per principle #17 ("do not redesign working architecture randomly when bugs occur") and #7
("keep components modular"), **the numbered folder structure does not get created.** It would
duplicate `Notes/`/`Daily/`/`Inbox/` under different names for no benefit and would fragment
where things already live.

## What does get added

The spec's memory *files* are a genuinely useful concept even though the folder scheme isn't
adopted. They map onto the existing `System/` folder like this:

| Spec file | Maps to |
|---|---|
| `MASTER_CONTEXT.md` | New file: `System/MASTER_CONTEXT.md` — stable cross-session facts |
| `CURRENT_STATE.md` | Existing `System/memory.md` already serves this; extend rather than duplicate |
| `DECISIONS.md` | New file: `System/DECISIONS.md` — architecture/project decisions with reasons |
| `LESSONS.md` | New file: `System/LESSONS.md` |
| `AGENT_RULES.md` | Already exists in spirit as `JARVIS.md` (identity, guardrails, trigger phrases) — source of truth per the existing skill; don't fork a second rules file |
| `SYSTEM_STATE.md` | New, once there's more than one integration to track (Obsidian + voice today; add this when Supabase/GitHub/n8n come online) |
| `ACTIVE_PROJECT.md` | Deferred until the project system (Milestone 8) exists — no projects to point at yet |

## Source of truth

`JARVIS.md` at the vault root remains the single source of truth for identity and guardrails,
per the existing skill. If this doc and `JARVIS.md` ever disagree, `JARVIS.md` wins — you may
have edited it directly.

## Action

None yet. This is a plan, not a migration script — `DECISIONS.md` and `LESSONS.md` get created
when Milestone 6 actually starts, not preemptively.
