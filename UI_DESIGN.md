# UI Design (spec — not yet built)

No desktop app exists yet (Milestone 3). This captures the design decisions from the spec so
they're ready when Milestone 3/4 start.

## Themes (token system, not hardcoded per-component colors)

| Theme | Palette | Feel |
|---|---|---|
| Crimson Command | near-black, charcoal, deep red, crimson highlights, white text | tactical |
| Neon Void | black, deep purple, violet, lavender | mysterious/futuristic |
| Holographic Core | dark navy, electric blue, cyan, ice-white | classic AI/holographic |
| Obsidian | black, dark grey, white, minimal accents | professional/minimal |

Theme affects: buttons, borders, glows, charts, the Jarvis Core, active nav, status
indicators, animations, selection state. Persisted across restarts.

## Jarvis Core states

IDLE, WAKE WORD ACTIVE, LISTENING, PROCESSING, WORKING, WAITING FOR APPROVAL, SPEAKING,
SUCCESS, ERROR, OFFLINE. Animations subtle, respect `prefers-reduced-motion`.

## Layout

Dashboard: core, command input, current project, today's priorities, task summary, active
projects, recent activity, system status, memory status, connected tools, automations,
notifications, quick actions — not all at once if it crowds the view (spec §19 warns against
overcrowding explicitly).

Nav: Dashboard, Projects, Tasks, Memory, Research, Agents, Automations, Integrations, Activity,
Notifications, System, Settings. `Cmd+K` command palette.

## Not started

No frontend code exists. This is the reference doc for when it does.
