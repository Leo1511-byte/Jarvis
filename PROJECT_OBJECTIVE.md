# Project Objective

Leonardo's description of the final product — what JARVIS should actually become, in his own
words. Captured directly, not reworded or reorganized on the way in.

Relationship to other docs: `VISION.md` is the first-draft charter (2026-08-11, written to be
argued with and eventually reviewed with Andrew). This file is where the concrete end-state
picture lives once Leonardo lays it out — `VISION.md` and `project/ROADMAP.md` get reconciled against
it afterward, not the other way around.

---

## Leonardo's description (2026-08-11, captured as given)

1. **JARVIS can do anything on command, within what it has access to.** An AI assistant that
   acts, not just answers — bounded by what's actually connected/granted, not by a fixed list
   of pre-built commands.
2. **Styled and felt like Iron Man's JARVIS.** General look and behavior, not just a theme
   skin — images to follow (static, no animation) for what this should actually look like.
3. **A device-connection tab, under Settings.** Where you go to connect devices to JARVIS.
4. **JARVIS can upgrade itself, only when explicitly told to.** Not autonomous/automatic —
   triggered specifically by Leonardo's command.
5. **JARVIS keeps itself organized** — files, structure, etc. — as an ongoing property, not a
   one-time cleanup.

## Claude's notes / open questions (added after discussion, kept separate from the above)

- Point 3 (device tab vs. software Connections): Leonardo confirmed — **keep them as two
  distinct concepts** (software Connections/Integrations vs. a hardware Devices panel), both
  reachable from Settings.
- Point 1 ("do anything it has access to"): extend the existing `ask` orchestrator fallback
  from read-only-by-prompt to a real action path, gated by the same Level 1/2/3 approval flow
  the six built-in Skills already use — not a new system, an extension of M31's.
- Point 4 (self-upgrade): confirmed as edit → rebuild → relaunch via the existing
  `continue-project` mechanism, pointed at JARVIS's own repo — not live runtime self-patching.

## Visual reference 1 — "JARVIS Core" dashboard (2026-08-11)

Leonardo confirmed this image is the target style, with an explicit note: **don't replicate
every panel shown — fewer panels, curated, not maximalist.**

What the image shows: near-black background, electric-blue/cyan glow throughout, angular HUD
panels with cut/bracket corners (not rounded), a central holographic ring/core visual with a
vertical light beam, monospace/technical uppercase type, small circular percentage gauges,
green "ONLINE"/"ACTIVE" status tags, a bottom status bar ("ALL SYSTEMS OPERATIONAL"). Panels
present: System Status, Active Protocols, Core Functions (with progress bars), Neural Network
(a decorative brain graphic + "Learning Rate 2.7x" / "Neurons Active 12.6B"), Resource Usage
(CPU/Memory/Storage/Network gauges), Data Stream (scrolling log), Core Stability.

**Flag for Leonardo:** some of the reference image's numbers are decorative sci-fi flavor, not
real data ("Learning Rate 2.7x", "Neurons Active 12.6B" — there's no actual neural net being
trained here). This app's whole existing discipline (see `docs/ARCHITECTURE.md`/`CLAUDE.md`) is
never showing a status that isn't real — `StatusPanel` already had a bug fixed for exactly this
(M6) where it claimed things were wired that weren't. Recommend: adopt the *visual language*
(glow, bracket-corner panels, rings, monospace, status-tag styling) but keep every number/status
shown genuinely real — e.g. actual Skill run counts, actual Connection status, actual
CPU/memory if we wire real system stats, not invented figures.

---

## Visual reference 2 — "Memory Core" view (2026-08-11)

Same visual language as reference 1 (near-black, cyan glow, bracket-corner panels, monospace
uppercase type), applied to a Memory browser: three-column layout — left is a category nav
(All Memories, Conversations, Projects, Ideas, Knowledge, References, Tasks & Plans, Personal,
each with a real-looking count) plus a stats panel (total memories, total size, last updated,
oldest memory) and quick actions (Add Memory, Import File, **Connect Obsidian**, Export
Backup); center is a searchable/filterable/sortable list of memory entries (title, snippet,
tags, date); right is a detail panel for the selected entry (type, category, created/modified,
size, tags, summary, linked memories, an "Open Memory" button). Top bar: logo + a compact
4-item nav (Dashboard, Skills, Chat, Memory), plus a live Memory Core status (storage
used, % capacity). Bottom bar: sync status + a small network/graph visual + backup status.

This is essentially a concrete UI spec for the still-open Memory index work (Milestone 27/33,
currently blocked on `cargo` for real vault filesystem scanning) — the category breakdown,
counts, and detail panel all imply the vault is actually being parsed and indexed, not just
summarized by a single orchestrator prompt the way `check-memory` works today.

**Same honesty flag as reference 1:** counts like "1,248 memories," "174.3 GB / 200 GB storage,"
"87%," "last updated 10 min ago" all need to be real numbers derived from actually scanning
`~/Documents/Obsidian Vault`, not placeholders carried over from the mockup.

**Open question for Leonardo:** this reference uses a compact **top nav bar** with only 4 items
(Dashboard, Skills, Chat, Memory), not the current app's 13-item **left Sidebar** (most of which
are still unbuilt placeholders). Do you want to move to a top-nav layout showing only real
views, or keep the left Sidebar (which is also where Milestone 32's per-view pop-out buttons
currently live)?

---

## Visual reference 3 — "System" (Settings) view (2026-08-11)

Same visual language again, this time on a System/Settings overview: top nav now shows 5 items
(Dashboard, Skills, Chat, Memory, System) — **confirms the top-nav pattern across all three
references, not a one-off.** Layout: left is a System Navigation list (Overview, Core Systems,
Performance, Network, Security, Storage, Updates, Backups, Diagnostics, Configuration, Logs)
plus a System Info panel (version, uptime, install date, license) and a "Run Diagnostics"
button; center is a 12-tile Core Systems Status grid (AI Processor, Memory Core, Neural Engine,
Voice Engine, Context Engine, Learning Module, Decision Engine, Data Analyzer, Autonomous
Agent, Knowledge Graph, Sensor Fusion, Predictive Model, all "ONLINE"), an Active Processes
table, System Alerts, and System Logs; right is a Performance Monitor (CPU/memory/storage/
network, live-looking graphs), a Security Status panel, and Quick Actions (Optimize System,
Clear Cache, Sync Data, Restart Core, Shutdown, Emergency Protocol).

**Strong honesty flag — this one goes further than references 1-2.** Most of the Core Systems
grid names fictional subsystems that don't exist in this app at all: "Neural Engine,"
"Autonomous Agent," "Predictive Model," "Learning Module," "Sensor Fusion," "Knowledge Graph,"
"Decision Engine," "Context Engine." The Active Processes table (`core_main.exe`,
`ai_engine.exe`, etc.) is a fictional OS process list — this app isn't `JARVIS OS 3.1`, it's a
Tauri app with a Rust backend and a handful of real child processes (voice listener, speak
daemon, orchestrator CLI calls). Cloning this literally would be the most direct violation yet
of this project's core rule (see `CLAUDE.md`): never show a status that isn't real.

**What's genuinely buildable here, with real data:**
- Performance Monitor → real CPU/memory/disk/network via a Rust system-info crate. Actually new
  capability, not currently built, but honest and doable.
- Core Systems grid → rename to match what's *actually* real: Local Orchestrator (Claude CLI),
  Voice pipeline, Supabase, Obsidian, GitHub, Calendar, Gmail — i.e. exactly what
  `StatusPanel`/`ConnectionsView` already track, restyled as tiles instead of a list.
- System Alerts / Logs → the real `activity_events` table (Milestone 26), already exists.
- System Info → real version from `package.json`/`Cargo.toml`, real uptime, no invented
  "License: ULTIMATE."
- Quick Actions → only ones that map to a real backend action (e.g. "Restart Core" = restart
  the voice listener process; "Sync Data" = trigger a real check against a Connection). Drop
  vague/undefined ones ("Optimize System," "Emergency Protocol") unless we define what they'd
  actually do.
- Security Status → reflect the real Level 1/2/3 permission system and approval-gate config
  (`permissions.ts`, `docs/SECURITY.md`), not invented "Intrusion Detection"/"Encryption"/"Threat
  Level" fields.
- **This is also where idea #3's device-connection panel belongs** — System/Settings is the
  natural home for both software Connections and hardware Devices.

## Navigation decision

All three references consistently use a compact top nav bar, not the current app's 13-item left
Sidebar. **Claude's recommendation: adopt the top nav, and show only real/working views in it**
(Dashboard, Chat, Skills, Memory, System — plus Projects/Tasks/Activity if kept), dropping
placeholder-only sections entirely rather than linking to `NotBuiltView`. Milestone 32's
per-view pop-out buttons (currently in the Sidebar) would need to move — most natural spot is a
small pop-out icon in each view's own header, not the nav itself.

---

## Decisions locked in (2026-08-11)

1. **Visual direction confirmed**: dark/near-black background, electric-blue/cyan glow,
   angular bracket-corner HUD panels, monospace/uppercase type, green status tags, central
   glowing-ring "Core" motif — matching references 1-3, curated rather than maximalist.
2. **Every number/status shown must be real** — no decorative sci-fi metrics ("Learning Rate
   2.7x," fictional subsystem names, invented process lists). Where the reference shows
   something fake, we either wire it to real data or drop it. This isn't a style compromise —
   it's the same rule this project has enforced since M6.
3. **Navigation moves to a top nav bar**, showing only real/working views — replaces the
   current 13-item left Sidebar, which mixes real views with dead placeholders.
4. **Settings/System is one screen covering both software Connections and hardware Devices**
   (idea #3), plus a real, trimmed version of reference 3's system-health layout.
5. **"Do anything it has access to"** extends the existing `ask` orchestrator fallback into a
   real action path gated by the existing Level 1/2/3 approval flow — not a new system.
6. **Self-upgrade** = `continue-project`'s existing mechanism (load context, inspect repo,
   implement, test, update docs), pointed at JARVIS's own repo, triggered only by explicit
   command — not autonomous, not live runtime self-patching.

## Not yet decided / needs scoping before build starts

- Exact set of top-nav items (Dashboard/Chat/Skills/Memory/System confirmed by the references —
  Projects/Tasks/Activity/Integrations' fate not yet decided: folded into System, kept as their
  own nav items, or dropped from the nav and reachable another way).
- Whether this becomes one big milestone (visual system + nav change) or several small ones
  (e.g. "design tokens + Core restyle" then "nav migration" then "System/Settings real panels")
  — leaning toward several, per this project's own "one milestone at a time" rule.
- Real system-stats source for Performance Monitor (which Rust crate, refresh rate, cost to
  battery/CPU of polling it).
