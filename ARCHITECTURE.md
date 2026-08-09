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

## Open decision

Desktop framework (Tauri vs. alternatives), local STT/TTS/wake-word libraries, and whether
Supabase runs cloud or self-hosted are all deferred until `SYSTEM_INSPECTION_PROMPT.md` comes
back with real numbers (RAM, CPU arch, existing installs). Don't lock these in before that.
