-- Milestone 26 — see CHAT_MEMORY_SKILLS_CONNECTIONS_PLAN.md. Extends the
-- activity_events table 0001_init.sql already created (SECURITY.md's
-- Level 2 "every action must be traceable" rule) rather than a parallel
-- skill_runs table -- this is the first migration to actually add columns
-- to an existing table instead of only creating new ones. Both new columns
-- are nullable: plenty of activity_events rows (if any ever get written by
-- something other than a Skill run) won't have a skill or conversation.
-- Run this AFTER 0002_chat.sql (conversations) and 0004_skills.sql
-- (skills), since the new foreign keys reference both.

alter table activity_events
  add column if not exists skill_id text references skills(id) on delete set null;

alter table activity_events
  add column if not exists conversation_id uuid references conversations(id) on delete set null;

create index if not exists idx_activity_events_skill_id on activity_events(skill_id);
create index if not exists idx_activity_events_conversation_id on activity_events(conversation_id);
