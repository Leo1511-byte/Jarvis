# Automations

## What runs today

Nothing runs on a schedule yet — this section previously claimed a Cowork scheduled task
generated the morning brief automatically, which wasn't true (checked 2026-08-09: no scheduled
task existed). Corrected per spec principle #5 (never fake connection/automation status).

## Morning brief (Milestone 13, 2026-08-09)

`~/Documents/Obsidian Vault/System/scripts/morning_brief.py` is real and verified — run manually
against the actual vault, it reads today's Daily note, open tasks across `Daily/`/`Notes/`/
`Inbox/`, the Inbox backlog count, and the last 5 `System/memory.md` entries, and writes
`Briefs/YYYY-MM-DD.md`. It explicitly says what it does *not* cover (no calendar/email yet)
rather than silently omitting them.

The `launchd` job that would run it daily at 7am is written
(`packages/automations/launchd/dev.leonardo.jarvis.morningbrief.plist`) but **not activated** —
see `packages/automations/launchd/README.md` for the exact `launchctl` commands. Claude doesn't
load background jobs onto your Mac without you doing it yourself.

## Decided (2026-08-09): start without n8n

Inspection found n8n not installed, and it normally wants either Docker (also not installed)
or a persistent Node process — both a stretch on a 90%-full disk. Plan instead: plain
Node/Python scripts triggered by macOS `launchd`/cron for the "runs on a schedule" cases
(morning brief gathering, weekly review, calendar sync, reminders). Per spec principle #46,
n8n isn't used for anything simpler and safer done locally — this is that judgment call in
practice, not a rejection of n8n. Revisit if script-based scheduling gets unwieldy (Milestone 13
in `ROADMAP.md` stays the checkpoint for that decision).

## Interface (once automations exist beyond the one above)

Each automation entry needs: name, description, enabled/disabled, trigger, last run, next run,
last result, error state, permissions. Not built until there's more than one automation to
manage.
