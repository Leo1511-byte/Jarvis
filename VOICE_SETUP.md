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

## Wired into Tauri, 2026-08-10

`apps/desktop/backend/src/voice.rs` spawns the Python scripts via `std::process::Command` —
the same pattern `orchestrator.rs` already uses for the `claude` CLI — rather than Tauri's
`tauri-plugin-shell` sidecar mechanism. That mechanism is built for cross-compiled standalone
binaries bundled per target triple; these scripts run inside a project-local `uv` venv
(`System/voice/.venv`), which doesn't fit that shape and would need PyInstaller-style freezing
to work as a true "sidecar." Direct process spawning needed no new Cargo dependencies and
matches the existing code style.

- **`listen_loop.py`** (new) combines `wake_listener.py`'s detection and `transcribe.py`'s
  recording+whisper into one continuous process, looping back to listening after each
  transcript — chosen over wrapping the single-shot `wake_listener.py` in a shell loop because
  it gives Rust one long-running child process to manage instead of having to re-spawn and
  re-sequence two scripts per cycle. Emits one JSON object per line on stdout
  (`{"event":"wake","score":...}` / `{"event":"transcript","text":...}` /
  `{"event":"error","message":...}`); status/progress text goes to stderr so Rust's line
  reader only ever has to handle JSON or blank lines. `wake_listener.py`/`transcribe.py` are
  untouched and still individually runnable, per their own docstrings.
- `voice.rs` exposes 5 Tauri commands: `start_voice_listener`/`stop_voice_listener` (spawn/kill
  `listen_loop.py`, forwarding parsed events to the frontend as a `voice-event` Tauri event),
  `start_speak_daemon`/`stop_speak_daemon` (spawn/kill `speak_daemon.py`), and `queue_speech`
  (writes a `.txt` file into `System/voice/queue/` for the daemon to pick up — the Rust side of
  the same queue/done pattern the daemon already implements).
- Frontend: `useVoiceListener` (new hook) starts/stops the listener + speak daemon as the
  Voice settings panel's "Microphone enabled" **and** "Wake word" toggles both go on, and
  routes `transcript` events straight into `commandEngine.ts`'s `parseCommand`/`executeCommand`
  — the exact same path the typed command bar uses, per spec §32, with no separate voice-only
  command logic. The response is also queued to `speak_daemon` via `queue_speech` so it gets
  spoken aloud. `JarvisCore`'s existing `listening`/`speaking` states (built in Milestone 4,
  unused until now) get set on wake/response.
- **Verified:** `cargo test` — 7 new Rust unit tests for `parse_voice_line` (wake/transcript
  /error events, blank lines, malformed JSON, unrecognized event tags), all passing alongside
  the 3 existing orchestrator tests. `cargo tauri dev` hot-reloaded every change (Rust and
  frontend) with no compile errors. `npm run test` (31 tests), `tsc -b`, `vite build` all still
  pass.
- **Confirmed live, 2026-08-10** (Leonardo, `cargo tauri dev` run from his own Terminal — an
  assistant's sandboxed shell genuinely cannot reach CoreAudio, confirmed not assumed): said
  "Hey Jarvis" for real, wake word detected, recorded, transcribed, routed through
  `commandEngine.ts`, spoken back via `say`. Four real bugs found and fixed along the way in
  this one session:
  1. Missing `apps/desktop/backend/capabilities/default.json` blocked `event.listen()`
     entirely (Tauri's ACL system denies anything not explicitly granted).
  2. openWakeWord's score is numpy `float32`, which `json.dumps()` can't serialize.
  3. A wake-phrase-inclusive transcript ("hey jarvis status") matched no command pattern —
     `commandEngine.ts`'s `normalize()` now strips a leading wake phrase.
  4. A React 18 StrictMode dev-mode double-invoke leaked a duplicate `voice-event` listener,
     so every transcript was handled (and spoken) twice.
  5. **Feedback loop**: JARVIS's own spoken replies were picked up by the still-listening mic,
     re-triggering detection and cascading into repeated errors. Fixed with a file-based mute
     flag (`speaking.flag` in this directory) — `speak_daemon.py` sets it before speaking and
     clears it (with a short tail for room echo) after; `listen_loop.py` waits for it to clear
     before reopening the wake-word stream each loop, with a staleness timeout in case either
     side crashes mid-speech.
  All fixed, covered by tests where testable (10 Rust + 4 frontend for the parsing/routing
  bugs; the feedback-loop fix is file-coordination between two long-running scripts that
  needs a live mic to really exercise, same as the rest of this pipeline).

## Two more self-listening bugs found and fixed, 2026-08-13

Leonardo reported JARVIS still occasionally "listens to its own voice and starts conversating
with itself," despite the 2026-08-10 feedback-loop fix above. Diagnosed from code (no mic
access in the session that found this — see each fix's own verification note):

1. **Permanent-deafness gap in the staleness check.** `listen_loop.py`'s `speaking.flag`
   staleness timeout (`SPEAKING_FLAG_MAX_AGE_SECONDS`) only ever ran inside
   `wait_while_speaking()`, called once before a wake-listening stream opens. But
   `wake_callback` re-checks the flag on every ~80ms audio chunk for as long as that stream
   stays open, using a bare `.exists()` check with no age limit. If the flag went stale *while
   a stream was already open* (`speak_daemon.py` dies mid-speech after `listen_loop.py` had
   already resumed listening), the per-chunk check would skip prediction forever — no wake word
   is ever detected, so the loop never gets back to `wait_while_speaking()` to notice the flag
   is stale and clear it. Voice goes permanently deaf until a manual restart. Fixed by pulling
   the age-aware logic into one `is_actively_speaking()` function used by both call sites.
   **Verified:** Python syntax-checked (`python3 -m py_compile`); the actual audio behavior
   still needs a real mic to exercise, same limitation as the original fix.
2. **No guard against a second full app instance.** Nothing stopped a second launch (e.g.
   double-clicking the Desktop launcher while JARVIS was already running) from spawning its own
   independent `listen_loop.py`/`speak_daemon.py` pair — both sharing the *one*
   `speaking.flag` file this whole coordination scheme depends on. `speak_daemon.py`
   unconditionally deletes that flag on its own startup (to clear anything left by a crashed
   prior run) — so a second instance starting while the first was mid-speech would instantly
   un-mute every listener while JARVIS was still talking, feeding its own voice back into
   itself. Fixed with `tauri-plugin-single-instance` (`main.rs`): a second launch attempt now
   focuses the existing window instead of starting a new one. **Verified:** `cargo build`
   succeeded (real compile, not a handoff — see `CLAUDE.md`'s note on `cargo` being reachable in
   this session once `PATH` included `~/.cargo/bin`); a second `open ~/Desktop/Jarvis.app` while
   the first was running did not spawn a second `target/debug/jarvis` process. Caveat: in dev
   mode specifically, Vite's own port-1420 conflict would likely have blocked a second instance
   too, so this test didn't cleanly isolate the plugin's own effect — it's a real, correctly-
   targeted fix for the coordination hazard found in the code, not a confirmed reproduction of
   Leonardo's exact reported incident.

Also found and cleared: a stale `speaking.flag` sitting on disk with no process alive to have
set it (confirms flags do get abandoned when a process is killed abruptly, e.g. via `pkill`
during testing/restarts) — harmless once fix #1 above is in place, but deleted by hand this time
since no `listen_loop.py` was running to hit the fixed code path.

## Gemini Live engine added, 2026-08-13 — real-time, interruptible conversation

Leonardo compared JARVIS's voice to a Gemini Live demo: continuous, low-latency, and genuinely
interruptible, vs. our wake word → fixed 5s record → whisper → a `claude -p` call (measured
12-44s in this project's own benchmark) → speak the whole reply. That gap isn't a bug in the
classic pipeline, it's what a turn-based design fundamentally is — confirmed via web search that
Claude itself has no real-time speech-to-speech mode yet. Closing it needed a different engine
entirely, not a tuning pass on the old one.

**New: `voice_engine` in `config.json`** — `"classic"` (default, unchanged, still
`listen_loop.py`/`speak_daemon.py`) or `"gemini_live"` (new `gemini_live_listen.py`). Selected
per-user in the app (Voice settings → "Conversation engine"), not a code change.

**Architecture, and why it structurally can't have the two 2026-08-13 bugs above:** the classic
pipeline is two independent long-running processes coordinating through a shared `speaking.flag`
file on disk — exactly the mechanism that caused both bugs above. A Gemini Live session is
bidirectional over one connection (server-side turn detection decides when the user is
interrupting vs. the model still has the floor), so `gemini_live_listen.py` is a *single*
process handling both mic capture and speaker playback — there's no second process to
coordinate with, so that whole bug class doesn't apply here. Wake-word detection (openWakeWord,
reused as-is from `listen_loop.py`) still gates when a live session opens — Leonardo's explicit
choice over push-to-talk or always-on, balancing cost/privacy against the demo's hands-free feel
— then the session stays open for natural back-and-forth until a ~45s silence timeout or an end
phrase ("that's all," "stop listening," etc.) in the live transcript.

**Scope, deliberately narrow:** real-time conversation only. Gemini can talk *with* you, but
can't yet run a JARVIS Skill (check your calendar, research something, self-upgrade, ...)
mid-conversation — no tools are registered in the Live session config. That bridge (Gemini
calling into the same approval-gated `commandEngine.ts` path the command bar/Chat/Skills tab
already use, not a parallel execution system) is real, separately-scoped work — see
`TASKS.md`/`ROADMAP.md`.

**Rust side (`voice.rs`):** the listener slot/monitor/crash-recovery infrastructure is reused for
both engines rather than duplicated — `start_voice_listener` now takes an `engine` argument and
picks which script to spawn; `VoiceEvent` gained `LiveSessionStart`/`LiveTranscript { role, text
}`/`LiveSessionEnd` variants (`gemini_live_listen.py`'s own JSON-line-per-stdout-line protocol,
same convention `listen_loop.py` established). **Verified:** real `cargo build`/`cargo test`
(24 Rust tests passing, 2 new), not a handoff — see `CLAUDE.md`'s note on `cargo` being reachable
in this Cowork session.

**Frontend:** new "Conversation engine" selector in Voice settings (`VoiceSettings.tsx`,
persisted like every other voice setting); `useVoiceListener` passes the engine through and
handles the three new event types by persisting each live turn straight to Chat (no fixed
"you asked, JARVIS answered" pair the way the classic Command Log expects — one message per
turn instead, same destination everything else voice produces already uses). Classic engine's
behavior is completely unchanged. **Verified:** 67 frontend tests passing (unchanged — no new
command-engine behavior), `tsc -b`/`vite build` clean, and live-checked in a browser tab against
the actual running app: the selector renders both options and persists the choice correctly.

**Not yet verified, and can't be from this session:** an actual Gemini Live conversation, end to
end, with real audio hardware and a real API key. `gemini_live_listen.py` was written against
the Gemini Live API's real, current documentation (pulled via web fetch specifically because a
fast-moving realtime API isn't something worth guessing at from training data) — audio format
(16-bit PCM, 16kHz in / 24kHz out), the `google-genai` SDK's async session pattern, and the tool-
calling message shapes are all sourced from `ai.google.dev`, not memory. But "matches the docs"
and "works end-to-end with real audio" are two different claims, and only the first one is made
here. One specific known uncertainty, called out in the code: the interruption signal's exact
field name (`server_content.interrupted`) wasn't independently confirmed against a real session.
Leonardo has a Gemini API key already — needs adding to `config.json`'s `gemini_api_key`, then a
real live test.

## Real bug found from the first live test, 2026-08-13: blocking I/O froze the event loop

Leonardo added his API key and tried it: "most of the time it doesn't answer, or when
answering it cuts off." Root cause, found from code (still no mic in this session):
`receive_and_play()`'s original version called `output_stream.write()` — a **blocking** call
that waits for sound-card buffer space — directly inside the same `async def` that also reads
`session.receive()` (the network) and drives `send_mic_audio()`. All three share one asyncio
event loop. Every blocking write froze *everything* until it returned: no more audio could be
read from Gemini, no mic audio could be sent, the silence-timeout check couldn't run either.
That matches both symptoms exactly — apparent non-answers (stalled mid-response) and cut-off
audio (the stall could outlast the server's own pacing).

`mic_callback` never had this problem — sounddevice runs it on its own C-level callback thread,
not on the asyncio loop, so its blocking-safe by construction. The output side needed the same
treatment and didn't have it. **Fixed**: playback now runs on a dedicated Python thread reading
from a thread-safe `queue.Queue`; `receive_and_play()` only ever does a non-blocking `.put()`
onto that queue, never touches the sound card directly. Interruption handling (flush the queue)
updated to match — a `FLUSH` sentinel instead of aborting/recreating the stream inline.

**Verified:** Python syntax-checked only (`python3 -m py_compile`) — still no mic in this
session to confirm the fix actually resolves the reported symptom. Leonardo re-testing next.

## Not built yet

- Follow-up conversation mode, configurable timeout, spoken interruption ("Jarvis, stop") — now
  real for the `gemini_live` engine (2026-08-13 above); still true of the `classic` engine.
- Startup greeting, activation sound, speech speed/volume settings.
- Push-to-talk (the shortcut is displayed in settings but not bound to anything).
- The tool-calling bridge letting Gemini Live run JARVIS Skills mid-conversation (see the
  2026-08-13 section above).
