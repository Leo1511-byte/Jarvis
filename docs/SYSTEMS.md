# Systems — how JARVIS actually works today

Current-state reference, written 2026-08-15 against the real code (through Milestone 41), not the
original spec. For deep detail on any one system, see its dedicated doc — this is the map, not
the territory. For history/bug-by-bug narrative (especially voice), see `CHANGELOG.md` and
`VOICE_SETUP.md`.

## The shape

```
                    JARVIS Command Core
                    (commandEngine.ts:
                     parseCommand / executeCommand)
                             │
        ┌──────────┬─────────┼─────────┬──────────┐
        │          │         │         │          │
      Chat      Skills    Voice    Connections   Agents
   (ChatView,  (registry (classic +  (read-only  (orchestrator
    persisted  .ts, 7    gemini_live  registry,   .rs, claude
   messages)   real       + M41 tool  status per   CLI, back-
              Skills)     bridge)     connection)  ground jobs)
        │
    Memory
   (Obsidian
    vault —
    mostly not
    built yet)
```

Typed commands, classic voice transcripts, and (as of M41) Gemini Live's tool calls all end up
going through the same `parseCommand`/`executeCommand` pair in `commandEngine.ts` — this is the
one real invariant the whole system is built around (see `docs/WAYS_OF_WORKING.md`'s voice
architecture rule).

## Chat

`ChatView.tsx` + `getStore()` (Supabase-backed if configured, else a `localStore.ts` fallback with
an identical interface). Every real exchange — typed, classic voice, or a Gemini Live turn —
gets persisted via `persistMessage()`. Not a general-purpose chatbot UI: shows JARVIS-specific
state (which command ran, permission requests) rather than being a plain message thread.

## Skills

`skills/types.ts` (the `Skill` interface: id, name, description, `permissionLevel` 1-3, `domain`
`"software" | "hardware"`, `connectionIds`, `execute()`) and `skills/registry.ts` (the array of
real Skills — currently `research`, `continue-project`, `check-calendar`, `check-email`,
`check-github`, `check-memory`, `self-upgrade`). Single source of truth since M31 — `permissions.ts`,
`commandEngine.ts`, and `lib/store/builtinSkills.ts` all derive from it instead of hand-duplicating.
No hardware Skill exists yet (no reachable device). See `docs/SKILLS.md`.

## Connections

`lib/store/builtinConnections.ts` — a fixed, read-only registry (not something the UI creates or
edits) of six connections: Calendar, Gmail, GitHub (all via MCP/`gh` CLI), Obsidian (direct
filesystem access from the local `claude` process), Web (the orchestrator's research prompt),
Supabase. Each declares capabilities with a `readOnly` flag, mirrored in
`packages/database/migrations/0003_connections.sql`'s seed data. `ConnectionsView.tsx` shows real
status per connection (`connected`/`unverified`/`not-wired`) — never a faked green checkmark. See
`docs/CONNECTIONS.md`.

## Voice

Two engines, selectable per-user (`config.json`'s `voice_engine`, System/voice/ in the Obsidian
vault — not part of this git repo):
- **Classic**: wake word (openWakeWord) → fixed recording → faster-whisper transcription →
  `commandEngine.ts` → ElevenLabs/`say` TTS. Turn-based, ~12-44s round trip.
- **Gemini Live** (M40+): wake word gates opening a real-time bidirectional session; conversation
  audio is Gemini talking directly (not routed through `commandEngine.ts`); as of M41, one
  registered tool (`run_jarvis_command`) lets Gemini reach the real command path when it decides
  something needs an actual action, with Level 3 confirmation delivered verbally instead of a
  popup. Optional native AEC via `aec_bridge/` (Swift/AVAudioEngine), since plain Python audio
  libraries can't reach CoreAudio's VoiceProcessingIO.

Both share `voice.rs`'s listener slot, crash-recovery monitor, and line-based JSON stdout
protocol. See `docs/VOICE.md`.

## Permissions

`permissions.ts` — `permissionLevelFor(kind)` returns 1/2/3 per command/Skill kind. Level 3 is
gated two ways depending on entry point: built-in Skills are checked in `App.tsx`'s
`handleCommand` *before* `executeCommand` runs at all; the `ask` fallback's own NEEDS_APPROVAL
classification calls `ctx.requestApproval` from *inside* `executeCommand`. Both ultimately show
the same `ApprovalDialog`/`useApproval` hook — one real approval flow, not two. See
`docs/SECURITY.md`.

## Agents / background work

No separate agent process or specialist routing exists — `orchestrator.rs`'s `run_orchestrator`
(synchronous) and `run_orchestrator_background` (`claude --bg`, polled) shell prompts out to the
local `claude` CLI. `continue-project` and `self-upgrade` use the background path; research/
calendar/email/github stay synchronous (quick reads, background would just add polling overhead).
See `docs/AGENTS.md` for what's real vs. still aspirational relative to the original spec's
QUEUED/PLANNING/WORKING/... state machine.

## Memory

Obsidian (`~/Documents/Obsidian Vault`) is the intended long-term knowledge store — real,
reachable by the local `claude` process, but the *app-side* Memory system (a visual layer with
search/relationships/indexing) is mostly not built. See `docs/MEMORY.md`.

## Projects / Tasks

Real Supabase-or-local-store-backed projects and tasks (`ProjectsView.tsx`, `TasksView.tsx`), an
"active project" concept (`useActiveProject`) that flows into command context (e.g. `research`
scopes findings to it when set).

## Multi-window

Any real view can pop out into its own Tauri window (`?view=<slug>`, `windows.rs`) — independent
windows reading the same store, no cross-window state sync. Voice listener deliberately
single-instance, disabled outside the main window.

## Themes

Four: Crimson Command, Neon Void, Holographic Core, Obsidian. Theme-driven CSS tokens, never
hardcoded per-component colors.

## What's genuinely not built yet

The "Ways of Working" behavioral mode system (Quick Answer/Research/Build/Debug/Analyze/Review/
Agent Work, auto-routed) has no code equivalent — see `project/ROADMAP.md`'s backlog. Memory as a
visual/searchable layer. A real agent-state-machine/supervision UI. Hardware Skills (no device
yet). Custom user-authored Skills.
