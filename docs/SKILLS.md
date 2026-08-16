# Skills — what JARVIS knows how to do

Current-state reference, 2026-08-15. Skill ≠ Connection: a Skill is an *ability*
("research a topic"); a Connection is *access* ("the Web"). Never mix the two — see
`docs/CONNECTIONS.md`.

## The interface (`apps/desktop/frontend/src/skills/types.ts`)

```ts
interface Skill {
  id: string;
  name: string;
  description: string;
  permissionLevel: 1 | 2 | 3;
  domain: "software" | "hardware";
  connectionIds: string[];
  execute(ctx: SkillContext, input?: unknown): Promise<string>;
}
```

`domain` exists so a hardware Skill (3D printer, robotic arm) has a real place to slot in once a
device is actually reachable — none exists yet, this is deliberately not speculative beyond the
type itself.

## The registry (`skills/registry.ts`)

Single source of truth since Milestone 31 — `permissions.ts`, `commandEngine.ts`'s Skill
dispatch, and `lib/store/builtinSkills.ts` all derive from this array instead of each hand-
maintaining their own copy (the pre-M31 state, which drifted).

Seven real Skills today:

| Skill | Level | Connections | What it does |
|---|---|---|---|
| `research` | 1 | Claude, Web, Obsidian | Researches a topic, writes findings to `Notes/` |
| `continue-project` | 2 | Claude Code, GitHub, Local Files, Obsidian | Loads context, inspects the repo, implements the next step, tests, reports (background job) |
| `check-calendar` | 1 | Calendar | Reads upcoming events, explicitly read-only |
| `check-email` | 1 | Gmail | Reads inbox, explicitly read-only |
| `check-github` | 1 | GitHub | Reads PRs/issues via `gh`, explicitly read-only |
| `check-memory` | 1 | Obsidian | Searches the vault directly (local `claude` has filesystem access) |
| `self-upgrade` | 3 | Claude Code, GitHub, Local Files, Obsidian | Modifies JARVIS's own repository (background job) — Level 3, unlike `continue-project`, because a bad change breaks the running app itself |

All seven route through the orchestrator (`orchestrator.rs`'s `run_orchestrator`/
`run_orchestrator_background`) with a purpose-built prompt per Skill — not a distinct agent
process, model, or persona per Skill. See `docs/AGENTS.md` for why that's been sufficient so far.

## Execution path

`commandEngine.ts`'s `executeCommand` dispatches to `runSkill(id, ctx, input)`, which looks up
the registry entry and calls `skill.execute(skillCtx, input)`. `runSkill` itself never touches
`ctx.requestApproval` — Level 3 gating for built-in Skills happens *before* `executeCommand` is
even called, in `App.tsx`'s `handleCommand` (checks `permissionLevelFor(command.kind) === 3` and
shows `ApprovalDialog` first). This matters if you're adding new Skill-related code: don't assume
`skill.execute()` itself enforces permissions — it doesn't, by design, the caller does.

## Adding a Skill

1. Add an entry to `skills/registry.ts` with a real `execute()` — no placeholder/fake Skills.
2. If it needs a new Connection, add that to `builtinConnections.ts` first (see
   `docs/CONNECTIONS.md`).
3. Set `permissionLevel` honestly — 3 if it's destructive/sensitive/irreversible, 2 if it writes
   but is traceable/recoverable, 1 if it's read-only.
4. `permissions.ts`, `commandEngine.ts`, `SkillsView.tsx` pick it up automatically — no
   per-Skill UI wiring needed (this is the whole point of the M31 registry redesign).
5. Add a real test in `commandEngine.test.ts` covering both the parse and the permission gating
   if it's Level 3.

## Custom/user-authored Skills

Not built. The original vision describes a user being able to say "create a skill that does X"
and JARVIS generating a registry entry itself — genuinely not implemented, no code path for it.
