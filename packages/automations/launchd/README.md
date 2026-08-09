# launchd automations

Milestone 13. Plain `launchd` user agents instead of n8n — see `AUTOMATIONS.md` in the repo root
for why. Each automation is a `.plist` here plus the script it runs (scripts live in the vault
itself, under `System/scripts/`, since that's what they operate on).

## What's here

- `dev.leonardo.jarvis.morningbrief.plist` — runs
  `~/Documents/Obsidian Vault/System/scripts/morning_brief.py` daily at 7:00 AM. The script reads
  today's Daily note, open tasks across `Daily/`/`Notes/`/`Inbox/`, the Inbox backlog count, and
  the last 5 entries in `System/memory.md`, and writes `Briefs/YYYY-MM-DD.md`. **Verified 2026-
  08-09** — run manually against the real vault and produced a correct, real brief (not a stub).

## Status: written, not activated

Claude does not run `launchctl load` for you. This is deliberate — a background job that writes
to your vault on a recurring schedule should start because you turned it on, not because an
assistant decided it should run. Activate it yourself:

```sh
# 1. Copy the plist into your LaunchAgents directory
cp packages/automations/launchd/dev.leonardo.jarvis.morningbrief.plist \
   ~/Library/LaunchAgents/

# 2. Load it
launchctl load ~/Library/LaunchAgents/dev.leonardo.jarvis.morningbrief.plist

# 3. (optional) Trigger it once immediately to confirm it fires correctly,
#    without waiting until 7am
launchctl start dev.leonardo.jarvis.morningbrief
```

Check it worked: look for a fresh `Briefs/YYYY-MM-DD.md` in the vault, and check
`System/scripts/morning_brief.log` / `morning_brief.err.log` for output or errors.

To undo:

```sh
launchctl unload ~/Library/LaunchAgents/dev.leonardo.jarvis.morningbrief.plist
rm ~/Library/LaunchAgents/dev.leonardo.jarvis.morningbrief.plist
```

## Adding another scheduled script later

1. Write the script (Python or Node) wherever it operates — vault scripts go in
   `System/scripts/`, app-level scripts go in `packages/automations/`.
2. Copy this plist as a template: new `Label` (reverse-DNS style, `dev.leonardo.jarvis.<name>`),
   new `ProgramArguments`, new schedule under `StartCalendarInterval` (or `StartInterval` for a
   fixed period instead of a specific time).
3. Document it in `AUTOMATIONS.md` and in this README's "What's here" list.
4. Leave activation to the user, same as above.
