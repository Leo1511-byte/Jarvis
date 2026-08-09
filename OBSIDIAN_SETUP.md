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

## Milestone 6: done, 2026-08-09

Built for real in `~/Documents/Obsidian Vault` and verified by running each script against
seeded content (not just written and assumed to work):

| File/folder | Status |
|---|---|
| `JARVIS.md` (vault root) | Built — identity, vault map, guardrails, trigger phrases. Source of truth per the guardrail in the file itself |
| `System/memory.md` | Built — running dated log, seeded with today's real decisions |
| `System/scripts/what_open.py` | Built and run-tested — correctly found 4 open tasks across `Daily/`+`Notes/` |
| `System/scripts/orphan_scan.py` | Built and run-tested — correctly reported no orphans once notes were cross-linked |
| `System/scripts/connect_this.py` | Built and run-tested — correctly scored and ranked link candidates by shared tags/keywords |
| `Inbox/`, `Daily/`, `Notes/`, `Briefs/` | Created with real seed content (one Inbox item, one Daily note, two linked Notes). `Briefs/` stays empty until Milestone 13 wires the morning-brief automation |
| `System/JARVIS_CONNECTION_TEST.md` | Ran the literal spec §12 test: wrote "Jarvis memory online.", read it, modified it, read it again. Confirmed |

Not built yet, deferred to when they're actually needed rather than created speculatively:
`MASTER_CONTEXT.md`, `DECISIONS.md`, `LESSONS.md`, `SYSTEM_STATE.md`, `ACTIVE_PROJECT.md`.
`System/voice/` is explicitly Milestone 9's job, not this one.
