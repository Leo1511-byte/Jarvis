-- Milestone 23 (Connections registry) — see CHAT_MEMORY_SKILLS_CONNECTIONS_PLAN.md.
-- Identity + capability metadata only, per the plan's SECURITY CONSIDERATIONS
-- section -- this table never stores credentials. Live status
-- (connected/unverified/not-wired) is computed in the frontend the same way
-- StatusPanel.tsx already does (see hooks/useInTauri.ts), never read from
-- here -- a DB row can't observe whether something's actually been clicked
-- through live, so it doesn't get to claim it.
-- Run this in the Supabase SQL editor, same as 0001_init.sql/0002_chat.sql.

create table if not exists connections (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists connection_capabilities (
  id uuid primary key default gen_random_uuid(),
  connection_id text not null references connections(id) on delete cascade,
  capability text not null,
  read_only boolean not null default true,
  unique (connection_id, capability)
);

create index if not exists idx_connection_capabilities_connection_id
  on connection_capabilities(connection_id);

alter table connections enable row level security;
alter table connection_capabilities enable row level security;

create policy "allow all for authenticated" on connections for all using (true) with check (true);
create policy "allow all for authenticated" on connection_capabilities for all using (true) with check (true);

-- Seed data: the six connections already real in this app (MCP_SETUP.md).
-- Mirrors apps/desktop/frontend/src/lib/store/builtinConnections.ts by
-- hand -- fixed, known-in-advance metadata, not something the UI creates.
insert into connections (id, name) values
  ('calendar', 'calendar'),
  ('gmail', 'gmail'),
  ('github', 'github'),
  ('obsidian', 'obsidian'),
  ('web', 'web'),
  ('supabase', 'supabase')
on conflict (id) do nothing;

insert into connection_capabilities (connection_id, capability, read_only) values
  ('calendar', 'read-events', true),
  ('gmail', 'read-email', true),
  ('github', 'read-prs-issues', true),
  ('obsidian', 'read-vault', true),
  ('obsidian', 'write-notes', false),
  ('web', 'search-and-summarize', true),
  ('supabase', 'read-structured-state', true),
  ('supabase', 'write-structured-state', false)
on conflict (connection_id, capability) do nothing;
