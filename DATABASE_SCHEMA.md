# Database Schema (proposed — not yet provisioned)

No Supabase project exists yet. This is the draft schema from the spec (§14), trimmed to what
Milestone 7/8 actually need first — not every table up front (spec principle #20).

## Ownership rule

Obsidian owns knowledge: notes, research summaries, decisions, lessons, plans. Supabase owns
structured, machine-readable state: task status, timestamps, automation runs, activity,
relationships. If a piece of data could live in either, decide once here and don't duplicate it.

## First-pass tables (Milestone 7/8)

```sql
projects (
  id, name, description, status, repo_url, obsidian_path,
  created_at, updated_at
)

tasks (
  id, project_id -> projects, title, description, status,
  priority, deadline, created_at, updated_at, completed_at
)

task_dependencies (
  task_id -> tasks, depends_on_task_id -> tasks
)

activity_events (
  id, project_id -> projects, type, summary, created_at
)

settings (
  key, value, updated_at
)
```

## Later tables (Milestone 10+, add when their milestone starts)

`agent_runs`, `agent_messages`, `tool_connections`, `tool_permissions`, `automations`,
`automation_runs`, `notifications`, `memory_index`, `project_context`, `integration_status`,
`research_jobs`.

## Decided (2026-08-09)

**Supabase Cloud (free tier)**, not self-hosted/Docker Postgres — Docker isn't installed on
this machine and disk is tight (~22 GiB free). See `ARCHITECTURE.md` for the reasoning.

## Explicitly not doing yet

Provisioning the actual Supabase project, writing migrations, or wiring a client — that starts
with Milestone 7, not before.
