-- Milestone 24 (Skills data model) — see CHAT_MEMORY_SKILLS_CONNECTIONS_PLAN.md
-- and apps/desktop/frontend/src/lib/store/builtinSkills.ts's doc comment for
-- the scope decision this represents: a descriptive registry of the six
-- commands commandEngine.ts already runs, not a replacement of them.
-- commandEngine.ts's prompt logic is untouched by this migration.
-- Run this AFTER 0003_connections.sql (skill_connections references
-- connections). Same pattern as the prior migrations: Cowork writes the
-- SQL, Leonardo runs it in the Supabase SQL editor.

create table if not exists skills (
  id text primary key,
  name text not null,
  description text not null,
  permission_level int not null check (permission_level in (1, 2, 3)),
  builtin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists skill_connections (
  skill_id text not null references skills(id) on delete cascade,
  connection_id text not null references connections(id) on delete cascade,
  primary key (skill_id, connection_id)
);

create index if not exists idx_skill_connections_skill_id on skill_connections(skill_id);

alter table skills enable row level security;
alter table skill_connections enable row level security;

create policy "allow all for authenticated" on skills for all using (true) with check (true);
create policy "allow all for authenticated" on skill_connections for all using (true) with check (true);

-- Seed data: mirrors builtinSkills.ts by hand. permission_level matches
-- apps/desktop/frontend/src/permissions.ts's permissionLevelFor exactly.
insert into skills (id, name, description, permission_level, builtin) values
  ('research', 'Research',
   'Look into a topic and write findings as a new note in the Obsidian vault, mentioning the active project if one is set.',
   1, true),
  ('continue-project', 'Continue Project',
   'Load a project''s context, inspect its repo, implement the next concrete step, test it, and update docs. Runs in the background (claude --bg).',
   2, true),
  ('check-calendar', 'Check Calendar', 'Read-only summary of upcoming calendar events.', 1, true),
  ('check-email', 'Check Email', 'Read-only summary of anything urgent or unread in the inbox.', 1, true),
  ('check-github', 'Check GitHub', 'Read-only summary of open PRs or issues assigned to you.', 1, true),
  ('check-memory', 'Check Memory', 'Read-only summary of recent activity in the Obsidian vault.', 1, true)
on conflict (id) do nothing;

-- continue-project intentionally has no rows here -- it operates on the
-- local filesystem/git directly, which isn't one of the registered
-- Connections (see builtinSkills.ts).
insert into skill_connections (skill_id, connection_id) values
  ('research', 'web'),
  ('research', 'obsidian'),
  ('check-calendar', 'calendar'),
  ('check-email', 'gmail'),
  ('check-github', 'github'),
  ('check-memory', 'obsidian')
on conflict (skill_id, connection_id) do nothing;
