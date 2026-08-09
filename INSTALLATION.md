# Installation

## Step 0 — you are here

This repo exists. Nothing else is installed yet. Do not install anything before Milestone 1
(system inspection) is done for real — that inspection determines the stack decision in
`ARCHITECTURE.md`.

## Step 1 — real system inspection (do this now)

Open a Claude Code session **on your Mac** (not Cowork) in this repo's directory and run the
prompt in `SYSTEM_INSPECTION_PROMPT.md`. It will report on your OS, hardware, Node/Python/Git
versions, existing Claude Code config and MCP servers, Obsidian install and vault paths,
microphone/audio setup, GitHub auth, Docker, and existing database/automation tools — without
installing or changing anything.

Bring the resulting report back to this project (paste it into Obsidian's `System/memory.md`
or hand it to Cowork) so the architecture doc can be finalized with real numbers instead of
assumptions.

## Step 2 — desktop app (Milestone 3)

```
cd apps/desktop/frontend && npm install
cd ../backend && cargo tauri icon <a 1024x1024 png>   # only needed once
cargo tauri dev
```

## Step 3 — Supabase (Milestone 7)

The code is written and waiting; only the account/project creation is left, and that has to be
you — Claude doesn't create accounts on your behalf.

1. Go to https://supabase.com, sign up/log in, create a new project (free tier is fine for a
   personal app).
2. In the SQL editor, run `packages/database/migrations/0001_init.sql`.
3. Project Settings → API — copy the Project URL and the `anon` `public` key.
4. In `apps/desktop/frontend/`, copy `.env.example` to `.env.local` and paste those two values
   in.
5. Restart `npm run dev` / `cargo tauri dev`. `getStore()` in `src/lib/store/index.ts` switches
   from local storage to Supabase automatically once those env vars are set — no code change.
6. Verify it actually works: create a project in the app, then check the `projects` table in
   Supabase's table editor to confirm it landed there.

## Step 4 — voice (Milestone 9)

See `~/Documents/Obsidian Vault/System/voice/README.md` for the exact steps (dependency
install, ElevenLabs key, testing each script standalone). Not done automatically — those
scripts have never been run.

## Step 5 onward

Not written yet — deliberately. GitHub write actions, Calendar/Email OAuth, and n8n (if it ever
gets reconsidered) get documented here as each milestone actually starts.
