# System Inspection Prompt — run this locally, not in Cowork

This is Milestone 1 from the JARVIS spec. It has to run in a **Claude Code session on your
actual Mac**, in this repo's directory, because it needs real access to your filesystem,
installed tools, and hardware — none of which Cowork can see. Read-only. Don't let it install
or modify anything; if it needs to run a command to check a version, that's fine, but no
installs, no config changes.

Copy everything below the line into Claude Code and run it.

---

Inspect this machine and this repo. Do not install or modify anything — this is read-only
reconnaissance for Milestone 1 of the JARVIS project (see `docs/ARCHITECTURE.md` and `project/ROADMAP.md`
in this repo for context).

Determine and report:

**System:** OS and version, CPU architecture, available RAM, available storage.

**Claude:** Claude Code version, location of its config, any existing MCP servers already
configured (list names and status, don't dump secrets).

**Obsidian:** is it installed; what vault(s) exist; specifically confirm whether
`/Users/leonardo/obsidian` exists and roughly what's in it (top-level folders only, don't dump
file contents).

**Development tools:** Node.js version, npm version, Python version, Git version, available
package managers (brew, etc.).

**Audio:** available microphone devices, audio APIs/frameworks accessible from this OS
(CoreAudio, etc.), whether any permission prompts would be needed for mic access.

**GitHub:** existing `gh` CLI auth status, existing SSH keys configured for GitHub (don't print
key contents, just confirm existence and which host they're for).

**Docker:** installed and running, version if so.

**Database/automation tools already present:** any existing Postgres, SQLite tooling, n8n
installation, or similar.

**Existing env files:** list filenames of any `.env`-style files found in common project
directories (just filenames/paths, never contents).

**Existing project directories:** any directories that look like active software projects near
this repo, just for orientation — don't inspect their contents.

Produce the report using this structure, filling in only what you actually found — write
"not found" or "unknown" rather than guessing:

```
SYSTEM
CLAUDE
OBSIDIAN
AUDIO
DEVELOPMENT TOOLS
MCP
GITHUB
DATABASE
AUTOMATION OPTIONS
MISSING COMPONENTS
RISKS
RECOMMENDED STACK
```

For RECOMMENDED STACK, base the recommendation on what you actually found (available RAM/CPU,
existing Node/Python setup, whether Docker is present) rather than defaulting to the spec's
suggested stack (React/TypeScript, Tauri, Supabase, n8n) if something about this machine makes
a different choice clearly better. Explain the tradeoff either way.

When done, either paste the report back into the Cowork session that generated this repo, or
save it as `System/SYSTEM_INSPECTION_REPORT.md` in the Obsidian vault so it persists.
