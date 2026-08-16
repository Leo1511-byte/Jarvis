# Database Schema

## Status (2026-08-09)

The schema below is **real, written SQL** — `packages/database/migrations/0001_init.sql` — not
just a sketch. It has never been run, because no Supabase project exists yet (Cowork can't
create one on your behalf). Run it via the Supabase SQL editor once you've created a project —
see `INSTALLATION.md` step 3. The client code (`apps/desktop/frontend/src/lib/store/`) already
targets this exact shape and is ready the moment the project exists.

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
this machine and disk is tight (~22 GiB free). See `docs/ARCHITECTURE.md` for the reasoning.

## Explicitly not done yet

The actual Supabase project doesn't exist. Until it does, the app runs on a local-storage
adapter (`localStore.ts`) implementing the identical `JarvisStore` interface — see
`docs/ARCHITECTURE.md` and `project/ROADMAP.md` Milestone 8.
