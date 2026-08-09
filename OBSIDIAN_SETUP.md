# Obsidian Setup

## Corrected 2026-08-09, from real inspection

This doc originally assumed a populated vault at `/Users/leonardo/obsidian`, describing an
existing `Inbox/`/`Daily/`/`Notes/`/`Briefs/`/`System/` structure with working scripts and a
voice daemon. **That was wrong.** `SYSTEM_INSPECTION_PROMPT.md`'s report confirmed
`/Users/leonardo/obsidian` is a real directory but completely empty — no `JARVIS.md`, no
subfolders, nothing. That structure doesn't exist on this disk.

The report found two real vault candidates:
- **`~/Documents/Obsidian Vault`** — has a live `.obsidian/` config (genuinely opened in the
  app), but was nearly empty (one `Untitled.base` file) before the inspection report itself was
  saved there.
- **`~/Yaps Vault`** — has actual content (a "Primary" folder + a UUID-named folder) but no
  `.obsidian/` directory was found, so it's unconfirmed whether this is an Obsidian vault at
  all or a different app's data.

**Leonardo confirmed `~/Documents/Obsidian Vault` as the real vault** by directing the
inspection report to be saved there. It's now the canonical path for everything in this doc and
in `ARCHITECTURE.md`.

## What this actually means

There is no pre-existing Jarvis structure to reconcile with — it needs to be **built for real**,
not just documented. The scripts (`what_open.py`, `connect_this.py`, `orphan_scan.py`), the
voice bridge (`System/voice/speak_daemon.py`), and `JARVIS.md` described by the Jarvis skill
don't exist in `~/Documents/Obsidian Vault` as of this inspection. Before relying on any of
those trigger phrases against this vault, verify what's actually in it (Milestone 6 starting
task) rather than assuming the skill's description is current.

## Folder structure — still not the spec's numbered scheme

The master spec (§8) describes creating a fresh numbered folder structure (`00 - Dashboard`
through `12 - Archive`) plus an `11 - AI Memory/` folder with `MASTER_CONTEXT.md`,
`CURRENT_STATE.md`, `DECISIONS.md`, `LESSONS.md`, `AGENT_RULES.md`, `SYSTEM_STATE.md`,
`ACTIVE_PROJECT.md`. Per principle #17 ("do not redesign working architecture randomly") and #7
("keep components modular"), the numbered scheme still doesn't get adopted even on a mostly-
empty vault — arbitrary numbered folders aren't inherently better than descriptive names, and
locking in a structure right now, before Milestone 6 actually starts building it, would be
guessing. The target structure (`Inbox/`, `Daily/`, `Notes/`, `Briefs/`, `System/`) stays the
plan; it just needs to actually be created in `~/Documents/Obsidian Vault` when M6 starts.

## What gets added, once Milestone 6 actually starts

The spec's memory *files* are still a genuinely useful concept. All of these are **new files,
none exist yet** — the earlier version of this doc incorrectly implied some already did:

| Spec file | Plan |
|---|---|
| `MASTER_CONTEXT.md` | New: `System/MASTER_CONTEXT.md` — stable cross-session facts |
| `CURRENT_STATE.md` | New: `System/memory.md` — running log, per the Jarvis skill's description (create it for real) |
| `DECISIONS.md` | New: `System/DECISIONS.md` — architecture/project decisions with reasons |
| `LESSONS.md` | New: `System/LESSONS.md` |
| `AGENT_RULES.md` | New: `JARVIS.md` at vault root — identity, guardrails, trigger phrases. Becomes source of truth for behavior once written; if it and this doc ever disagree, `JARVIS.md` wins |
| `SYSTEM_STATE.md` | Deferred until there's more than one integration to track |
| `ACTIVE_PROJECT.md` | Deferred until the project system (Milestone 8) exists |

## Action

None yet. This is a plan, not a migration script. `JARVIS.md`, `System/memory.md`,
`DECISIONS.md`, and `LESSONS.md` get created when Milestone 6 actually starts, in
`~/Documents/Obsidian Vault` — not `/Users/leonardo/obsidian`.
