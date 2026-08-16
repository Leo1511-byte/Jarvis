# Memory — Obsidian + long-term knowledge

Current-state reference, 2026-08-15. Written honestly: this is the biggest gap between the
original vision and what's actually built.

## What's real

- **The vault**: `~/Documents/Obsidian Vault`, confirmed as the real path (not
  `/Users/leonardo/obsidian`, which is empty — see the correction history if this ever regresses).
  Not part of this git repo; edits there are direct filesystem changes, not commits.
- **Reachability**: the local `claude` CLI process has direct filesystem access to the vault. The
  `check-memory` Skill (`skills/registry.ts`) asks it to search the vault directly — no app-side
  indexing, no vault-reading code in this repo at all. That's the entire "Memory" surface that
  exists today.
- **Voice scripts** live under the vault's `System/voice/` folder (`config.json` with real API
  keys, `gemini_live_listen.py`, `aec_bridge/`) — see `docs/VOICE.md`. This is infrastructure
  storage, not the knowledge-memory system the rest of this doc is about.

## What's not built

Everything the original vision describes as "Memory" beyond that one Skill:
- A visual intelligence layer over Obsidian (recent memory, decisions, projects, research,
  relationships, source links) — `MemoryView.tsx` exists as a route but is not backed by a real
  index.
- Memory search — no search index exists; `check-memory` works by asking `claude` to search
  fresh each time, not via any app-maintained index.
- Automatic classification of what's worth remembering (chat history vs. long-term memory vs.
  project context) — no code enforces this distinction; there's no automatic memory-write path
  from Chat at all right now.
- Milestone 33 ("Memory index," carried over from M27) — scoped, never started. Needs real vault
  filesystem scanning and (per `docs/ARCHITECTURE.md`'s ownership rule) a place in Supabase for
  the index/metadata, with long-form content staying in Obsidian.

## Ownership rule (from `docs/ARCHITECTURE.md`, repeated here since it matters for Memory
specifically)

Obsidian owns knowledge: notes, research summaries, decisions, lessons, plans. Supabase owns
structured, machine-readable state: indexes, timestamps, relationships. If a piece of data could
live in either, decide once and don't duplicate it — don't turn the database into a second hidden
Obsidian.
