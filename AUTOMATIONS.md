# Automations

## What runs today

A Cowork scheduled task generates the morning brief into `Briefs/` around 7am, using the vault
read procedure from the existing Jarvis skill. That's the only automation that currently exists.

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
