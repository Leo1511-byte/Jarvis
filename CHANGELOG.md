# Changelog

## Unreleased

### Added — 2026-08-09
- Initial repo scaffold: `apps/`, `packages/{ui,core,agents,memory,tools,voice,permissions,
  database,integrations,automations}`, `shared/`, `config/`, `tests/`, `scripts/`, `docs/`.
- `.gitignore` covering `.env`, keys, tokens, credentials, and the existing vault's
  `System/voice/config.json`.
- Full docs set: `README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `TASKS.md`, `SECURITY.md`,
  `INSTALLATION.md`, `MCP_SETUP.md`, `VOICE_SETUP.md`, `OBSIDIAN_SETUP.md`,
  `DATABASE_SCHEMA.md`, `AUTOMATIONS.md`, `COMMANDS.md`, `AGENT_SYSTEM.md`, `UI_DESIGN.md`,
  `TESTING.md`, `TROUBLESHOOTING.md`, `SYSTEM_INSPECTION_PROMPT.md`.
- Git repository initialized.

### Added — 2026-08-09 (later)
- Milestone 1 (system inspection) completed via local Claude Code; report saved to
  `~/Documents/Obsidian Vault/System/SYSTEM_INSPECTION_REPORT.md`.
- Stack decided from real data: Tauri (Rust install pending, Milestone 3), Supabase Cloud,
  launchd/cron instead of n8n initially, local Claude Code confirmed as orchestrator.
- Vault path corrected to `~/Documents/Obsidian Vault`, confirmed by Leonardo.
- Risks logged: tight disk (~22 GiB free), prior unrelated "Jarvis"-named app remnants on disk,
  GitHub auth is HTTPS not SSH, two coexisting Claude Code installs, unverified mic permission
  state, repo currently sitting inside a Claude session artifacts folder (needs relocating).

### Added — 2026-08-09 (Milestone 3/4)
- `apps/desktop/frontend`: Vite + React + TypeScript app. Builds clean (`npm run build`
  verified in-session). Theme token system (`src/theme.css`) implementing Crimson Command,
  Neon Void, Holographic Core, and Obsidian, persisted via `localStorage`. `JarvisCore`
  component with all 10 spec states (idle through offline) as CSS animations, respecting
  `prefers-reduced-motion`. Sidebar nav shell (12 sections, no routing yet), disabled command
  bar placeholder, status panel that honestly reports "NOT WIRED YET" instead of faking
  connection state.
- `apps/desktop/backend`: Tauri v2 config (`Cargo.toml`, `tauri.conf.json`, `main.rs`).
  **Not compiled or verified** — written without a Rust toolchain available; see its README for
  the real verification steps before trusting it.

### Corrected vs. original spec
- Runtime split documented: Cowork (this session) cannot run local system inspection, access
  the microphone, or persist a background process. `ARCHITECTURE.md` now specifies a local
  Claude Code / Agent SDK process as the actual JARVIS runtime.
- `OBSIDIAN_SETUP.md` reconciles the spec's proposed vault structure with the vault that
  already exists at `/Users/leonardo/obsidian`, instead of creating a conflicting parallel
  structure.
