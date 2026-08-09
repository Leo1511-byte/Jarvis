# Voice Setup

## What exists today

A working TTS bridge, already built into your Obsidian vault: `System/voice/speak_daemon.py`
watches `System/voice/queue/`, speaks new text via ElevenLabs (your own API key, kept in
`System/voice/config.json`, never read by Claude), and archives spoken files to
`System/voice/done/`. There's no STT or wake-word component yet — that daemon only speaks, it
doesn't listen.

## What Milestone 9 needs to add

- **Wake word ("Hey Jarvis")** — local detection preferred, so raw audio isn't streamed to the
  cloud just to catch the wake phrase. Candidate approaches (openWakeWord, Porcupine, or
  similar) get evaluated once `SYSTEM_INSPECTION_PROMPT.md` reports available audio APIs and
  hardware.
- **STT** — needs to feed the same command engine as typed text (one command path, not two
  parallel behaviors).
- **TTS** — the ElevenLabs bridge already works; the question is whether the future desktop app
  reuses it directly or wraps it behind an interchangeable provider interface (spec §34
  requires the interface either way, so a competitor provider can swap in later).
- **Follow-up mode, push-to-talk, interruption, mic privacy controls** — all UI-side work once
  the desktop app exists (Milestone 3+).

## Do not build yet

Nothing here starts before Milestone 9, and Milestone 9 doesn't start before the desktop app
shell (Milestone 3) exists to host the mic controls and visible state (spec §31: microphone
state must always be visible in the UI — there's no UI yet).
