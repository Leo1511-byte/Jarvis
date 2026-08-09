# Architecture

## Why this differs from the original spec

The master spec assumes one Claude Code agent, running locally, with full-time access to your
filesystem, microphone, Docker, and dev tools — inspecting and building continuously. That
agent doesn't exist yet. This document was written by Claude running in **Cowork**, a sandboxed
cloud session with no access to your Mac. Cowork cannot: read your real Node/Python/Git
versions, detect your microphone, run a persistent background process, install software on
your machine, or type into your local Terminal. It can read/write files you explicitly hand it,
browse the web, and (with your approval) click around your visible desktop — it cannot be the
JARVIS runtime.

So the architecture has two tiers instead of one:

```
                         YOU
                          │
              ┌───────────┴────────────┐
              │                        │
      Voice / Keyboard          Cowork (this session)
              │                 — design partner —
              ▼                 docs, specs, code review,
   ┌─────────────────────┐      research, scaffolding
   │  LOCAL CLAUDE CODE   │      no persistent runtime
   │   (on your Mac)      │
   │   = actual JARVIS    │
   └──────────┬───────────┘
              │  MCP servers, local scripts, filesystem
   ┌──────────┼─────────────────────────────┬───────────┐
   ▼          ▼                             ▼           ▼
OBSIDIAN   SUPABASE                        n8n        GITHUB
(vault)    (structured state)        (automation)   (dev history)
   │
   ▼
Desktop app (Tauri) — the command-center UI, talks to the
local Claude Code / Agent SDK process over a local API
```

Cowork's job: write specs, docs, and code for this repo; do research; review architecture
decisions with you. It does not run wake-word detection, hold a persistent session, or touch
your microphone. The **local Claude Code session** (or a Claude Agent SDK process you run) is
the actual JARVIS orchestrator, because only it has real access to your machine.

## Layers

- **JARVIS (interface)** — the desktop app + voice loop. Talks to the local orchestrator.
- **Local orchestrator (Claude via Claude Code / Agent SDK)** — intelligence, planning, routing
  to specialist agents, the only tier with real filesystem/mic/Docker/git access.
- **Obsidian** — human-readable memory. Already exists at `/Users/leonardo/obsidian`; see
  `OBSIDIAN_SETUP.md` for how the spec's memory files map onto the existing vault rather than
  creating a second, conflicting structure.
- **Supabase** — structured state (projects, tasks, agent runs, automation history). Not yet
  provisioned. See `DATABASE_SCHEMA.md`.
- **n8n** — automation/orchestration for things better run on a schedule outside the app
  (briefing gathering, weekly review). Not yet installed. See `AUTOMATIONS.md`.
- **GitHub** — source control and dev history for JARVIS itself and any projects it manages.
- **Claude Code** — the execution environment for "continue Project X" development workflows.

## Design rules carried over from the spec

Inspect before modifying. Plan before major architecture changes. Build incrementally — one
milestone at a time (`ROADMAP.md`). Never mark something complete because the UI renders;
verify the underlying connection actually works. Least-privilege access, secrets never in
source (`SECURITY.md`). No component failure should crash the whole app — see "safe
degradation" in the original spec (§96), preserved here as a requirement once the desktop app
exists.

## Stack decision (Milestone 1 complete, 2026-08-09)

Real inspection came back. Machine: MacBook Air, Apple M4, 10 cores, 16 GB RAM, macOS 26.5.2 —
strong CPU/RAM, but only **~22 GiB free on a 90%-full disk**. That's the binding constraint,
not compute. Docker, Rust, Supabase CLI, n8n, Postgres, Redis are all absent — none is a sunk
cost, so each is a real decision, not just "install what's missing":

- **Desktop framework: Tauri**, confirmed over Electron. No Rust toolchain exists yet, so
  Milestone 3 needs an explicit, approved Rust install (~1–2 GB). Given the tight disk, Tauri's
  small runtime footprint is worth that cost more than it would be on a roomier machine —
  Electron avoids the Rust install but costs more RAM/disk per running instance.
- **Database: Supabase Cloud (free tier)**, not self-hosted/Docker Postgres. Docker isn't
  installed; standing up local Postgres would need a new install and eat scarce disk. Cloud
  removes Docker as a hard dependency for Milestone 7 entirely.
- **Automation: start without n8n.** Use plain Node/Python scripts triggered by macOS
  `launchd`/cron for the "runs on a schedule" cases (morning brief, weekly review) — n8n wants
  either Docker or a persistent Node process, and disk is tight. This is a downgrade from the
  spec's default because of what's actually on this machine, not a rejection of n8n — revisit
  if script-based scheduling gets unwieldy.
- **Local orchestrator: confirmed.** Claude Code v2.1.226 is installed and working, with `git`
  and `gh` (v2.92.0, authenticated as `Leo1511-byte`) available for source control.
- **Obsidian vault: `~/Documents/Obsidian Vault`**, confirmed by Leonardo — the only path with
  a live `.obsidian/` config. `/Users/leonardo/obsidian` (the path this repo's docs originally
  assumed) is a real but empty directory; see `OBSIDIAN_SETUP.md` for the correction.

## Risks carried forward from inspection

- **Disk space** (~22 GiB free): the Rust toolchain install in particular should be treated as
  a checkpoint, not assumed safe — recheck free space before Milestone 3 starts.
- **Prior "Jarvis" artifacts already exist on this machine**, unrelated to this repo:
  `~/Desktop/Jarvis.app`, `~/plugins/jarvis`, an iOS app container (`jarvis.ios`),
  `~/Library/Application Support/jarvis-desktop`, and multiple `jarvis-desktop`/"Jarvis Desktop"
  remnants in `~/.Trash`. Contents weren't inspected. Before Milestone 3 names anything on disk
  or in the Dock "Jarvis," check these for naming collisions or leftover state that could
  interfere.
- **GitHub auth is HTTPS + OS keyring, not SSH.** Any future automation that assumes
  SSH-based `git push` will fail as currently configured — use `gh`/HTTPS.
- **Two Claude Code install paths coexist** (npm global `@anthropic-ai/claude-code@2.1.87` and
  `~/.local/bin/claude@2.1.226`, the one actually on PATH). Leave as-is, but don't assume
  `npm update -g` keeps the running version current.
- **Microphone permission state is unverified** — inspection couldn't check without Full Disk
  Access. The first real mic use by a new JARVIS process triggers a live macOS permission
  dialog; the eventual desktop app needs to handle "not yet granted" as a normal state.
- **This repo currently lives inside a Claude session artifacts folder**
  (`~/Library/Application Support/Claude/local-agent-mode-sessions/.../outputs/jarvis`), not a
  normal project directory. Relocate to something like `~/Developer/jarvis` before this becomes
  a long-lived project — session artifact folders aren't guaranteed stable.

Full report: `~/Documents/Obsidian Vault/System/SYSTEM_INSPECTION_REPORT.md`.
