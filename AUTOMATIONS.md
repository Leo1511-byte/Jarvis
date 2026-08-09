# Automations

## What runs today

A Cowork scheduled task generates the morning brief into `Briefs/` around 7am, using the vault
read procedure from the existing Jarvis skill. That's the only automation that currently exists.

## What n8n is for (Milestone 13, not yet installed)

Automations better run outside the app on a schedule: gathering data for the morning brief,
calendar sync, task reminders, weekly project review, email summaries, scheduled research.
Per spec principle #46, n8n isn't used for anything simpler and safer done locally — the
morning brief staying a Cowork scheduled task rather than moving to n8n is a live example of
that judgment call, and it should stay that way unless there's a concrete reason to move it.

## Interface (once automations exist beyond the one above)

Each automation entry needs: name, description, enabled/disabled, trigger, last run, next run,
last result, error state, permissions. Not built until there's more than one automation to
manage.
