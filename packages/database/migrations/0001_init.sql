-- JARVIS initial schema — Milestone 7/8 tables only, per DATABASE_SCHEMA.md's
-- "first-pass tables" (don't over-engineer the database, spec §14).
-- Run this in the Supabase SQL editor once you've created a project —
-- Cowork cannot create the project or run this for you (account creation
-- is outside what Claude does on your behalf).

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  repo_url text,
  obsidian_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'done', 'cancelled')),
  priority text check (priority in ('low', 'medium', 'high')),
  deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists task_dependencies (
  task_id uuid references tasks(id) on delete cascade,
  depends_on_task_id uuid references tasks(id) on delete cascade,
  primary key (task_id, depends_on_task_id)
);

create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  type text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_project_id on tasks(project_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_activity_events_project_id on activity_events(project_id);

-- Row Level Security: enabled with a permissive single-user policy for
-- now (this is a personal app with one user). Tighten this before ever
-- exposing it beyond your own machine.
alter table projects enable row level security;
alter table tasks enable row level security;
alter table task_dependencies enable row level security;
alter table activity_events enable row level security;
alter table settings enable row level security;

create policy "allow all for authenticated" on projects for all using (true) with check (true);
create policy "allow all for authenticated" on tasks for all using (true) with check (true);
create policy "allow all for authenticated" on task_dependencies for all using (true) with check (true);
create policy "allow all for authenticated" on activity_events for all using (true) with check (true);
create policy "allow all for authenticated" on settings for all using (true) with check (true);
