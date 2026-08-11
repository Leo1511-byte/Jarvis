# Vision

First draft, 2026-08-11 — written by Leonardo and Claude (Cowork), to be reviewed and
restructured with Andrew John Lund (Leonardo's father, CEO of Inanomiq) once the team is ready
for that conversation. This is the starting point, not a locked spec — everything below should
be argued with, not just accepted.

## What JARVIS is

JARVIS is Leonardo's personal AI assistant, running locally on his own computer — not a cloud
product, not multi-user, not a company yet. The reference point is deliberate: Tony Stark's
JARVIS. Not a command-line tool that executes fixed tasks, but something Leonardo can actually
talk to, think out loud with, and build things alongside — a second mind embedded in his physical
and digital environment, not a chatbot bolted onto it.

Three roles it's meant to fill, all at once, not in sequence:

- **A workshop partner.** JARVIS should eventually reach past the screen — controlling a 3D
  printer, a robotic arm, and more hardware over time — so "build me a bracket" or "print this
  overnight" is a real, physical outcome, not just advice. This is the whole reason the Skills/
  Connections system exists: a Skill isn't only "check my email," it's the same abstraction for
  "home a robotic arm" or "start a print job," each with its own real-world risk and its own
  permission level.
- **A daily-life assistant.** Calendar, email, GitHub, memory (Obsidian), research, and — just
  as important to Leonardo specifically — school: tracking projects, helping him study, keeping
  his actual student life organized. This isn't a side feature; it's one of the three core jobs.
- **A presence, not a window.** Leonardo wants JARVIS visible across multiple monitors at once —
  several live windows on his own machine, not one app he has to alt-tab to. The interface should
  feel ambient and always-on, the way JARVIS felt to Tony Stark in his own workshop, not like a
  productivity app he opens when he remembers to.

## Who it's for, right now

Just Leonardo. There is no plan yet for other users, accounts, or a commercial product — that
question is explicitly open, not decided either way, and is one of the things Andrew's
involvement should help settle. Everything built so far (single-user RLS policies, no auth
system, no billing, no multi-tenancy) reflects "personal tool for one person," on purpose, and
shouldn't be over-engineered past that until there's an actual reason to.

## What "scale" means here

Two different things, and worth keeping separate:

1. **Scale of capability** — more hardware (3D printer, robotic arm, and whatever comes after),
   more monitors/windows, more of Leonardo's actual life routed through it (school, projects,
   research), deeper memory over time. This is scaling *what JARVIS can do*, and it's already
   underway (Milestones 1-29).
2. **Scale of the project itself** — right now this is Leonardo directing three different AI
   collaborators (see below) with no formal process. Andrew's role is explicitly this one: help
   turn "three AIs and a teenager improvising" into something structured enough to keep building
   on without collapsing under its own complexity — not (at least not yet) turning JARVIS into a
   company or a product for other people.

## Who's building it

| Who | Role |
|---|---|
| Leonardo | Owner, user, and final decision-maker. Everything routes through him. |
| Claude (Cowork, this session) | Design partner and builder for anything that doesn't need `cargo`, a microphone, or hardware access — architecture, planning, frontend, docs, most of the Chat/Memory/Skills/Connections work so far. |
| Local Claude Code | The actual JARVIS runtime on Leonardo's machine — the only tier with real filesystem, mic, and (eventually) hardware access. Does anything Cowork can't. |
| ChatGPT | Helps Leonardo draft specs and prompts before they come to Claude — the source of the Chat/Memory/Skills/Connections spec that produced Milestones 21-29. |
| Andrew John Lund (CEO, Inanomiq) | Not a day-to-day builder. Brought in later for restructuring, fixing a concrete objective, and figuring out how this scales — organizational and strategic, not implementation. |

No fixed process exists yet beyond "inspect before modifying, build one milestone at a time, test
and document everything, never fake a status" — the engineering discipline in `ARCHITECTURE.md`
and `SECURITY.md`. That discipline has held up for 29 milestones and is worth keeping regardless
of how the team structure evolves.

## Not goals (for now)

Explicit, so scope doesn't quietly creep:

- Not building for other users or accounts.
- Not chasing feature parity with general-purpose assistants (Siri, Alexa, etc.) — JARVIS's edge
  is being *Leonardo's*, deeply integrated with his own tools, vault, and hardware, not broad.
- Not committing to a specific business model, company structure, or funding path — that's
  explicitly deferred to the conversation with Andrew.
- Not building multi-window or hardware control speculatively ahead of a real milestone for each
  — they're named here as real destinations, not started until scoped like everything else.

## Open questions for the Andrew conversation

- Does this stay a personal tool indefinitely, or is there a real path to it becoming something
  Inanomiq builds on / others use? Neither answer is assumed here.
- What does "a concrete objective" actually look like for something this broad (workshop partner
  + daily assistant + ambient presence)? Is it one objective or three parallel tracks?
- How much process is actually needed at this size (one user, ~30 milestones in) versus how much
  would just slow Leonardo down?
- Any IP, safety, or liability considerations once real hardware (robotic arm especially) is
  actually being actuated by an AI-issued command, not just software actions.

## Where this lives

This file is meant to sit alongside `ARCHITECTURE.md`/`ROADMAP.md`/`SECURITY.md` as the "why,"
not the "how" — update it when the actual goal changes, not every time a milestone ships.
