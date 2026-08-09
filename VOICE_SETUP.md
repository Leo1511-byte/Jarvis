# Voice Setup

## Corrected 2026-08-09

Earlier drafts of this doc (and the pre-existing Jarvis skill) claimed a working ElevenLabs TTS
bridge already existed at `System/voice/speak_daemon.py`. It didn't — Milestone 6's real
inspection of `~/Documents/Obsidian Vault` found no `System/voice/` folder at all. This is the
first time any of it has actually been written.

## Stack decided

| Layer | Choice | Why |
|---|---|---|
| Wake word ("Hey Jarvis") | **openWakeWord**, running locally | Fully open-source, no account/API key required (unlike Porcupine's free tier), runs on-device so raw audio never leaves the machine to catch the wake phrase (spec §30). Trade-off: slightly lower accuracy than Porcupine's commercial models, acceptable for a personal assistant with retry-friendly UX. |
| STT | **faster-whisper**, local, `small` or `base` model | Runs on-device (privacy, no per-request cost), works offline, reasonable latency on an M4. Trade-off: first run downloads a model file (~150–500 MB depending on size) — check free disk space first, it was ~22 GiB at last inspection and may be lower now after the Rust/npm installs. |
| TTS | **ElevenLabs**, cloud, behind a provider interface | Cloud is justified here (spec §71: "cloud may be used where justified") — quality matters more for output than the wake-word privacy concern does, and it's genuinely used to *reply*, not to continuously listen. Kept behind an interchangeable interface (spec §34) so a local TTS engine (e.g. Piper) can swap in later without touching call sites. |
| Command routing | Same `commandEngine.ts` as typed input (spec §32) | STT output gets handed to the exact same `parseCommand`/`executeCommand` pair the command bar uses — no separate voice-only behavior. |

## Voice chosen (2026-08-09)

**"Jon - Calm Presence"** (ElevenLabs voice ID `enzbGixeo55iqn1QxbbC`) is JARVIS's voice —
already in Leonardo's ElevenLabs voice library (confirmed by opening ElevenLabs' Voice Lab
directly via the Claude in Chrome extension and copying the ID off that exact voice card, not
just trusting the ID he provided at face value). Set as the default in `config.example.json` and
as `speak_daemon.py`'s fallback if `config.json` ever omits it — so a fresh `config.json` copy
already speaks in the right voice as soon as an API key is added, no extra step needed. This is a
voice selection, not a credential — safe to commit, unlike the API key next to it in
`config.json` (which stays gitignored and unread by Claude, per the guardrails in `JARVIS.md`).
Still not verified end-to-end against the real ElevenLabs *text-to-speech* API or through a
speaker — that needs `config.json` with a real key, run locally.

## What's built now (unverified — no microphone or audio hardware in the Cowork sandbox that wrote this)

In `~/Documents/Obsidian Vault/System/voice/`:
- `wake_listener.py` — openWakeWord loop, prints a detection event on "Hey Jarvis"
- `transcribe.py` — faster-whisper wrapper, records a few seconds after wake, returns text
- `speak_daemon.py` — the ElevenLabs bridge (queue/done pattern), formalized for real this time
- `requirements.txt`, `config.example.json`, `README.md` with real setup steps

None of this has been run. Per the same honesty rule applied to the Tauri backend
(`apps/desktop/backend/README.md`): don't mark Milestone 9 done in `TASKS.md` until you've
actually run it and it actually works.

## UI (built and verified — `npm run build`/`test` pass)

Voice settings panel in the frontend: wake-word enabled toggle, master mic toggle, input/output
device selection (populated from `navigator.mediaDevices`, not hardcoded), push-to-talk
shortcut, permission status display. All state-only right now — no live audio wired to Rust yet
(see "Not built" below).

## Not built yet

- **The actual Rust-side audio bridge.** The Python scripts above run standalone; nothing in
  `apps/desktop/backend` calls them yet. Wiring options: (a) Tauri shells out to the Python
  scripts as a sidecar process, or (b) rewrite the wake-word/STT loop in Rust using `cpal`. (a)
  is faster to ship and matches the existing ElevenLabs bridge pattern; (b) is more "native" but
  a bigger lift. Recommend (a) for V1.
- Follow-up conversation mode, configurable timeout, spoken interruption ("Jarvis, stop") — all
  depend on the above existing first.
- Startup greeting, activation sound, speech speed/volume settings — small additions once the
  rest works.
