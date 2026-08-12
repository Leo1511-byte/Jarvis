-- Milestone 39 (self-upgrade skill) — adds the row 0004_skills.sql's seed
-- data was missing.
--
-- Real gap found while live-verifying M39: this Cowork session's app is
-- running against real Supabase (.env.local is configured), so
-- getStore() resolves to SupabaseStore, which reads the `skills` table
-- 0004_skills.sql seeded once -- not apps/desktop/frontend/src/skills/
-- registry.ts, which Milestone 31 made the single source of truth for
-- everything else (permissions.ts, commandEngine.ts, builtinSkills.ts's
-- LocalStore fallback). Adding a Skill to the registry was never enough
-- to make it show up in the live Skills view against a real Supabase
-- project -- confirmed live: Skills tab showed only the original six
-- until this migration runs. Run this after 0004_skills.sql, same as
-- every other migration (Leonardo runs it in the Supabase SQL editor).
insert into skills (id, name, description, permission_level, builtin) values
  ('self-upgrade', 'Self-Upgrade',
   'Modify JARVIS''s own repository -- inspect, implement, test, and document one change, the same discipline this project uses for every other milestone. Runs in the background (claude --bg). Level 3, unlike continue-project''s Level 2: this touches the app''s own running code, not an external project.',
   3, true)
on conflict (id) do nothing;

-- No skill_connections rows -- self-upgrade operates on the local
-- filesystem/git directly, same reasoning 0004_skills.sql already gives
-- for continue-project.
