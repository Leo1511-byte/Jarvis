# Ways of Working — how Claude Code builds JARVIS

This is the detailed development workflow. `CLAUDE.md` (repo root) is the short, always-loaded
constitution; this doc is the expansion — read it before a milestone, not necessarily every
session. Adapted 2026-08-15 from Leonardo's "Claude Code Ways of Working" spec into this
project's real terms — reworded to reference what's actually here (`skills/registry.ts`,
`commandEngine.ts`, `permissions.ts`, real milestone numbers) rather than generic placeholders.

Note: this doc is about **how Claude Code works on JARVIS**. JARVIS's own behavioral modes for
users (Quick Answer, Research, Build, Debug, etc.) are a separate, not-yet-built concept — see
`project/ROADMAP.md`'s backlog for that milestone. Don't confuse the two.

## Golden rule

Never rebuild JARVIS from scratch unless explicitly instructed. Before modifying anything:
inspect the actual files, understand the architecture, find existing implementations, reuse
them, identify dependencies, plan the smallest clean change, implement, test, verify, document.
The codebase is the source of truth — not a prior conversation's assumption about what exists,
not this doc, not `docs/SYSTEMS.md`. If any of those drift from reality, the code wins and the
doc needs fixing.

## Don't duplicate systems

Before adding a new service/manager/router/table/API/component/hook/Skill/Connection, search the
repo first: does something that already does this exist? If yes, reuse or extend it. This
project has already hit real instances of this — `skills/registry.ts` (M31) exists specifically
because Skill definitions were duplicated by hand across `commandEngine.ts`, `permissions.ts`,
and `lib/store/builtinSkills.ts` before that milestone.

## Work in milestones

One coherent milestone at a time, tracked in `project/ROADMAP.md`. An idea only becomes a
numbered milestone once it's actually about to start — until then it lives in
`project/TASKS.md`'s Backlog. Before starting: read the relevant existing code, identify files/
dependencies/existing abstractions/conflicts, then a short plan (WHAT/WHY/WHERE/HOW/TEST) — not
an essay. After: run real validation (compilation, `tsc -b`, `npm run test`, `cargo build`/
`cargo test`, and live-checking where feasible), then update `CHANGELOG.md`/`project/ROADMAP.md`/
`project/TASKS.md` — only the ones actually relevant, not reflexively all three for a one-line fix.

## Never claim success without verification

Never say "done" unless it's actually been implemented and checked. This project's real
vocabulary: **compiled/syntax-checked** (weakest — Python `py_compile` or a clean `tsc -b`, no
runtime proof), **verified** (real `cargo build`/`cargo test`, `npm run test`, `vite build`, or a
live click-through), **live-tested** (an actual person, or a real running app, exercised the
actual behavior). This session has repeatedly distinguished these explicitly (e.g. every voice
fix in `docs/VOICE.md`/`VOICE_SETUP.md` states which bar it cleared) — keep doing that, don't
round up.

## Debugging method

Don't randomly edit files when something breaks. REPRODUCE → OBSERVE → ISOLATE → HYPOTHESIS →
TEST → FIX → REGRESSION TEST → VERIFY. Concretely, in this project: pull the real evidence first
(`/tmp/jarvis-dev.log`, `cargo test` output, a fresh clean single-attempt trace) before writing a
fix — several real bugs this session (the tool-call-blocking-the-receive-loop bug, the three
`-10875` CoreAudio failures) were only found by isolating one variable at a time in minimal
reproductions, not by guessing from the symptom alone.

## Minimal change principle

Prefer a small, targeted change over a rewrite. If a refactor genuinely seems needed: explain why,
identify affected systems, propose a migration plan that preserves existing functionality, and
test after. Small internal refactors that don't change behavior can proceed without ceremony.

## Performance

Avoid: loading the entire Obsidian vault per request, dumping full chat history into every
prompt, repeatedly re-scanning the whole project, polling connections constantly, unnecessary
re-renders, redundant identical API calls. Prefer: caching, indexing, incremental updates, lazy
loading, targeted retrieval, summarized context. Concrete example already in this codebase: the
voice tool-calling bridge (M41) uses one generic `run_jarvis_command` function rather than
registering a Gemini function per Skill, specifically so the tool config doesn't need updating
every time a Skill is added.

## Obsidian rule

Obsidian is the long-term, human-readable knowledge source. Supabase (the real backing store,
once provisioned) holds indexes/metadata/references/timestamps/sync state — structured,
machine-readable state — not a second hidden copy of Obsidian's long-form content. See
`docs/MEMORY.md` for the current state of this (mostly not built yet).

## Memory rule

Not everything is memory. Chat history, long-term memory, and project context are three separate
things — a casual exchange shouldn't automatically become a permanent Obsidian note. Not
currently enforced by any real code (Memory itself isn't built — see `docs/MEMORY.md`), but the
principle holds for whatever builds it.

## Skill rule

A Skill (`skills/types.ts`) declares purpose, connections, permission level, domain, and an
`execute()` function — see `docs/SKILLS.md`. Skills are represented through the registry
(`skills/registry.ts`), not hardcoded per-Skill UI branches.

## Connection rule

A Connection represents access (what JARVIS can reach), distinct from a Skill (what JARVIS can
do) — see `docs/CONNECTIONS.md`/`docs/SKILLS.md`. Never expose credentials in the UI or store API
keys in normal database tables — see `docs/SECURITY.md`.

## Voice architecture

Voice and text share the same command path — never build "Voice JARVIS" and "Chat JARVIS" as
separate assistants. Concretely: classic voice's transcript and typed input both go through
`parseCommand`/`executeCommand` in `commandEngine.ts`. Gemini Live (the newer engine) is the one
partial exception worth naming honestly: conversation audio is Gemini talking directly, not
routed through `commandEngine.ts` — only the M41 tool-calling bridge (`run_jarvis_command`)
reconnects it to the same command path, and only for things Gemini explicitly decides need a
real action. See `docs/VOICE.md`.

## Permissions

Security over convenience. Permission checks flow Skill → Connection → Capability → Permission;
a higher layer never bypasses a lower one. Three levels (`permissions.ts`): Level 1 (safe,
automatic), Level 2 (workspace writes, traceable not gated), Level 3 (sensitive, explicit
approval every time, no standing auto-approval). See `docs/SECURITY.md`.

## Approvals

Potentially impactful actions need confirmation. The real `ApprovalDialog`/`useApproval` flow
(Level 3 Skills, and `ask`'s NEEDS_APPROVAL classification) shows what will happen, why, and what
changes, with Approve/Deny. As of M41, voice has its own parallel confirmation path — spoken, not
a popup, by explicit design choice — see `docs/VOICE.md`'s M41 section for why that's not a
weaker guarantee than the on-screen dialog.

## Agents

Agents are for longer multi-step work — don't reach for one when a normal function call solves it
immediately. Today's real implementation is simpler than a full supervised-agent system: one
orchestrator (`run_orchestrator`/`run_orchestrator_background` in `orchestrator.rs`) shells a
prompt out to the local `claude` CLI. See `docs/AGENTS.md` for what's real vs. still aspirational
(the QUEUED/PLANNING/WORKING/... state machine from the original spec isn't built).

## File system rules

Read a file and understand its purpose before modifying it. Check related files. Don't blindly
overwrite, don't create duplicate versions (`Foo2.ts`, `NewFoo.ts`), preserve existing
conventions and folder structure.

## UI development rules

JARVIS should feel like one coherent system, not a pile of differently-styled pages. Reuse
existing design tokens, components, typography, spacing, animation, and theme system (4 themes:
Crimson Command, Neon Void, Holographic Core, Obsidian) — never hardcode theme colors inside a
component.

## Error handling

Errors should be specific, human-readable, actionable, and recoverable when possible. "Obsidian
could not be reached because the configured vault path is unavailable" + a retry action, not
"Error 500."

## Logging

Log meaningful events (Skill activated, memory created/updated, agent started/completed,
connection changed, permission approved/denied). Never log API keys, tokens, passwords, or other
credentials.

## Documentation

Maintain `docs/ARCHITECTURE.md`, `project/TASKS.md`, `CHANGELOG.md`, `docs/SECURITY.md` as
appropriate — only when a change actually touches what they describe, not reflexively for every
tiny edit. Documentation should reflect the real system; don't describe features that don't
exist yet as if they do (mark them honestly as not-built instead).

## Task management

`project/TASKS.md` is the live development source of truth (Now / Next up / Done / Blocked /
Backlog). Tasks should be specific and checkable, not "build JARVIS."

## Testing philosophy

Every significant feature needs real validation appropriate to its risk — unit tests for logic
(`commandEngine.test.ts`, `voice.rs`'s `#[cfg(test)]` module), live click-through for anything
UI/hardware-dependent that automated tests can't reach. Don't write enormous test suites for
trivial components. Priority areas: command routing, permissions, voice, data persistence.

## If requirements are ambiguous

Don't guess when the ambiguity could cause major architectural consequences — ask one concise
question. If a reasonable interpretation exists and the change is reversible, proceed with the
safest assumption and say so, rather than stalling on something trivial.

## Do not overengineer

JARVIS is a single-user personal tool, not enterprise infrastructure being built to impress.
Prefer simple, modular, local-first, secure, fast — the architecture should allow future
expansion without requiring that future system to exist today.

## Claude Code as senior engineer, not code generator

Think architecture, dependencies, maintainability, security, performance, testing, UX, future
extensibility. Ask: will this still make sense in six months?

## Communication style

Concise structured updates over huge explanations after every tiny change. State what changed,
what was tested, what's next — not a narration of internal reasoning.

## Keep the user in control

Explain before major architectural decisions. Ask first for destructive actions. Respect
permissions for external actions. Require confirmation for irreversible operations. Proceed
efficiently for normal implementation work. Low friction without loss of control.

## Definition of done

A feature is done only when: implemented, existing architecture respected, no unnecessary
duplication, relevant tests pass, existing functionality still works, error handling exists,
permissions respected, UI integrated (if applicable), docs updated where necessary, task marked
complete, **result actually verified** — not just "should work."

## The commit review agreement (this project's own addition, not from the source spec)

Before every commit — not just at session end — show Leonardo a real summary of what changed
(files, substance, not just "updated X") and wait for his explicit go-ahead before running
`git commit`. This has held since 2026-08-14 and applies regardless of how small the change looks.
