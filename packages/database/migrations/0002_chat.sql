-- Milestone 21 (Chat backbone) — see CHAT_MEMORY_SKILLS_CONNECTIONS_PLAN.md.
-- Scoped to just conversations/messages, same "first-pass tables only" rule
-- 0001_init.sql followed -- skills/connections tables come with their own
-- milestones (23/24) and their own migration, not bundled in speculatively.
-- Run this in the Supabase SQL editor, same as 0001_init.sql — Cowork/local
-- Claude Code write the SQL, Leonardo runs it against the real project.

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'jarvis')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation_id on messages(conversation_id);

-- Same permissive single-user RLS policy as 0001_init.sql (personal app,
-- one user) -- tighten before ever exposing this beyond your own machine.
alter table conversations enable row level security;
alter table messages enable row level security;

create policy "allow all for authenticated" on conversations for all using (true) with check (true);
create policy "allow all for authenticated" on messages for all using (true) with check (true);
