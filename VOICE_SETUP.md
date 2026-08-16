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
(`apps/desktop/backend/README.md`): don't mark Milestone 9 done in `project/TASKS.md` until you've
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
`project/TASKS.md`/`project/ROADMAP.md`.

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

## Second real bug found from the re-test, 2026-08-13: echo + an over-eager end-phrase match

After restarting to pick up the blocking-I/O fix above, Leonardo re-tested: JARVIS replied, but
still cut off after a couple of seconds. Confirmed: built-in Mac speakers + mic, no headphones —
and `/tmp/jarvis-dev.log` showed no exceptions at all around the cutoff, which pointed at
*intentional* code (our own early-return logic), not a crash.

Root cause, two layers:
1. **No acoustic echo cancellation.** Plain `sounddevice` streams for both capture and playback
   mean the mic picks up JARVIS's own voice coming back out of the speakers. Gemini's server
   transcribes that into `input_transcription` as if the user were talking, which can trigger
   Gemini's own `server_content.interrupted` signal mid-reply — a real, upstream cause our
   client code can influence (by not feeding it echo) but not fully prevent by itself. Headphones/
   AirPods remove the acoustic path entirely; see the "Not built yet" list below for a real fix
   (mic gating during playback, or true AEC).
2. **A genuine bug on top of that, now fixed:** the end-phrase check
   (`any(phrase in text.lower() for phrase in END_PHRASES)`) was a substring match against *any*
   position in the transcript. If JARVIS's own echoed reply happened to contain a phrase like
   "...that's all I can tell you" anywhere, it matched and killed the entire session outright —
   not just a flushed audio buffer, the whole live connection closing. New `is_end_phrase()`
   requires the transcript to be essentially *just* the end phrase (exact match, or the phrase
   followed by trailing words), not embedded in a longer sentence.

**This does not fully close the echo issue** — Gemini's own interruption signal can still cut
audio off mid-reply on built-in speakers, that's now correctly a separate, disclosed limitation
(see the module docstring) rather than conflated with the session-killing bug fixed here.
**Recommended for the next test:** try headphones/AirPods once, specifically to isolate whether
remaining cutoffs are the echo issue (should mostly disappear) or something else (would still
happen). **Verified:** Python syntax-checked only, not yet re-tested live.

## Third real bug found from the headphones re-test, 2026-08-13: only one turn per session

With headphones on, the wake word worked (confirming the echo theory was at least part of the
picture), but a new symptom appeared: one exchange worked fine, then a follow-up question got no
response at all — not an error, just silence, matching a process that was sitting there doing
nothing (confirmed: `/tmp/jarvis-dev.log` showed no output at all in the tens of seconds after
the last wake event, no crash, no traceback).

Root cause: `receive_and_play()` had a single `async for response in session.receive():` with no
outer loop. The "one turn works, then nothing" pattern is strong evidence that `session.receive()`
is a **per-turn** generator — it completes naturally once the model finishes speaking, not a
single stream spanning the whole live session. Once that first generator ended, nothing was left
listening: `send_mic_audio()` kept streaming the follow-up question to Gemini the whole time
(and Gemini may well have kept responding), but the code that would have played it back and
emitted the transcript had already returned.

**Fixed:** wrapped the `async for` in an outer `while not ended:` loop, so completing one turn's
generator re-enters `session.receive()` for the next turn instead of ending the whole function.
Added a stderr log line ("One live turn finished; listening for the next") so this is visible
in `/tmp/jarvis-dev.log` on the next test, rather than being another silent black box.

**Verified:** Python syntax-checked only, not yet re-tested live. This is the third real bug
found from three consecutive live tests — each one genuinely new, not a repeat of the last,
which is itself worth noting: a from-scratch integration against a real-time streaming API
needs several rounds of "actually run it and see what breaks" no amount of doc-reading up front
fully avoids.

## Fourth real report, 2026-08-13: "listening to every noise, when it should only listen to voices"

Leonardo, unprompted this time (not from a specific test-and-report cycle): general sense that
JARVIS reacts to sounds that aren't real speech, both at the wake-word stage and once a
conversation is open. Checked running processes first — confirmed only one
`gemini_live_listen.py` was actually alive (the multiple "Listening for wake word..." lines in
the log were from repeated legitimate restarts while re-testing earlier fixes, not duplicate
processes). Two real, separate causes addressed:

1. **Gemini's own voice-activity detection defaults to HIGH sensitivity** on both start-of-speech
   and end-of-speech (per `ai.google.dev`'s Live API reference, pulled via web fetch) — exactly
   the setting that would treat background noise, or any echo bleeding through even with
   headphones, as real speech or an interruption. New `realtime_input_config` in `live_config`
   sets both to `LOW`. This is the sanctioned, documented way to tune this, not a client-side
   heuristic layered on top — though the exact nested field structure wasn't independently
   confirmed against a real session (only the top-level `live_config` fields were, from a full
   code example; this nested block came from the API reference doc, not a working example).
2. **openWakeWord's per-chunk score is noisy** — a single ~80ms chunk scoring above the 0.5
   threshold can be a transient noise spike, not sustained speech. `listen_loop.py` (classic
   engine) uses the same single-frame threshold and has been live-verified working, so this
   isn't inherently wrong — but requiring the score to stay above threshold for
   `WAKE_CONSECUTIVE_FRAMES_REQUIRED` (3) consecutive chunks before triggering is a standard,
   low-risk way to cut false positives, since a real spoken phrase naturally sustains across
   several frames and a noise transient usually doesn't. Deliberately not applied to
   `listen_loop.py` — that engine hasn't been reported to have this problem.

**Verified:** Python syntax-checked only, not yet re-tested live.

## Fifth real report, 2026-08-14: "sometimes it changes the language to spanish"

Leonardo, after the fourth fix above: "this voice setup is terrible." Prompted a step-back review
(`docs/VOICE_GEMINI_LIVE_REVIEW_2026-08-14.md`) instead of another isolated patch — five bugs from
five consecutive live tests warranted checking the design against real documentation and the
actually-installed SDK, not just symptom-chasing.

**Root cause, confirmed against `ai.google.dev`'s current Live API capabilities doc (not memory):**
`gemini-3.1-flash-live-preview` (the model in `config.json`) is a **native-audio** model, and
Google's own docs say plainly: *"Native audio output models automatically choose the appropriate
language and don't support explicitly setting the language code."* `speech_config.language_code`
(the mechanism for cascaded/non-native models) would have been silently ignored here even if set —
confirmed by checking the installed `google-genai` v2.18.0 SDK's own field list directly
(`speech_config`, `system_instruction`, `realtime_input_config` etc. are all real fields, so this
isn't an SDK-version mismatch either). The documented mechanism for native-audio models is a
`system_instruction`.

**Fixed:** added a `system_instruction` to `live_config` explicitly telling the model to always
respond in English unless the user asks otherwise. **Live-tested by Leonardo, 2026-08-14:**
confirmed working — "nearly perfect" conversation, no language switching observed. One new,
separate observation from that same test: JARVIS's reply audio stutters briefly at the start of
each turn — not yet investigated; plausible cause is the `aec_bridge` backend's playback path
scheduling the first few converted buffers without enough lead time (each incoming chunk goes
through `AVAudioConverter` and `scheduleBuffer` individually rather than being pre-buffered), but
this is a guess, not confirmed. See `project/TASKS.md`.

**Voice chosen, 2026-08-14:** tried **Orus** first, switched to **Charon** (documented as an
informative-sounding voice) — both are Gemini Live prebuilt voices, set via
`speech_config.voice_config.prebuilt_voice_config.voice_name`. Syntax-checked, not yet live-tested
with Charon specifically.

**Startup-stutter fix, 2026-08-14:** `aec_bridge/main.swift` now buffers the first 3 chunks
(~300ms) of each turn before scheduling any of them for playback, instead of scheduling each
100ms chunk the instant it arrives. Theory: playback began with zero cushion against the
network/processing jitter that's naturally worst right at the start of a turn (fresh connection
activity, first converter calls), and stopped stuttering once a few chunks were already queued —
matching "stutters at the start, fine after" exactly. Re-arms on both a >400ms gap since the last
chunk (a new turn starting) and on a SIGUSR1 flush (an interruption). Real, disclosed tradeoff:
adds ~300ms of upfront latency per turn in exchange for the cushion. Compiled clean
(`aec_bridge/build.sh`); the actual audible effect can't be verified without a real mic — same
limitation as every other native-audio change today, needs Leonardo's live test.

**"Vibration in the voice," 2026-08-14 — real fix, not a guess:** VoiceProcessingIO is built for
VoIP calls and, by default, ducks (dynamically reduces the volume of) any audio it doesn't
classify as the live call's own voice — meant for things like music automatically getting quieter
under a phone call. JARVIS's own TTS playback is the *entire* output here, so that ducking has
nothing legitimate to protect and was very plausibly the source of a pumping/warble artifact.
Confirmed the real API by compiling test snippets directly against the installed SDK (not
guessing from docs): `AVAudioVoiceProcessingOtherAudioDuckingConfiguration(enableAdvancedDucking:
duckingLevel:)` is real, with `.min`/`.default`/`.max` as the valid `duckingLevel` cases (no
"disabled" case exists). Set to `enableAdvancedDucking: false, duckingLevel: .min` right after
enabling voice processing. Compiled clean, not yet live-tested.

## New: native AEC bridge (`aec_bridge/`), 2026-08-14 — real fix for the still-open echo limitation

The step-back review (above) flagged that real acoustic echo cancellation needs Apple's
`VoiceProcessingIO` audio unit, which is not reachable from Python's `sounddevice`/PortAudio at
all — only from native code. Built it: `System/voice/aec_bridge/main.swift`, a small standalone
Swift binary (built via `aec_bridge/build.sh`, Command Line Tools' `swiftc`, no Xcode project
needed) using `AVAudioEngine` with `setVoiceProcessingEnabled(true)` on both the input and output
nodes. It knows nothing about Gemini, wake words, or JSON events — it does one job, shuttling raw
PCM audio over stdin/stdout, so `gemini_live_listen.py` can treat it as a drop-in replacement for
the direct sounddevice streams. Opt-in via `config.json`'s new `"audio_backend"` field
(`"sounddevice"`, the default and unchanged behavior, or `"aec_bridge"`).

**Real engineering, not a guess-and-ship:** the first three attempts to start the engine with
voice processing enabled failed with CoreAudio error -10875 (`kAUInitialize`), confirmed live
against this machine's actual hardware, not from docs. Root causes, found by isolating each
variable in a series of minimal test programs: (1) voice processing must be enabled on **both**
`inputNode` and `outputNode` — macOS's VoiceProcessingIO is one duplex audio unit under the hood,
enabling only one side reliably fails the other's `kAUInitialize`; (2) a tap's `format` argument
must be the node's **actual native format, queried after voice processing is enabled** (which
changes it — confirmed live: it became a 5-to-7-channel 48kHz Float32 format on this machine, not
the plain mono format it was before). Requesting any other format directly in `installTap` either
crashes outright or makes `engine.start()` fail with the same -10875; all resampling has to happen
manually downstream via `AVAudioConverter`. (3) Of the resulting multi-channel tap buffer, channel
0 is the real AEC-processed mono signal — the extra channels are reference/diagnostic. None of
this is guessed — each conclusion came from a real compiled test binary run against real hardware
on this exact Mac.

**What is and isn't verified:** the compiled binary starts `AVAudioEngine` cleanly and negotiates
real formats from real hardware — genuine confirmation, not a syntax check. What could **not** be
verified from the session that built this: actual captured audio bytes flowing end-to-end. The
Bash tool's process tree runs under the Claude Code app itself, not a real interactive Terminal
session, and microphone TCC permission is scoped per-process — this is the exact same
"sandboxed shell can't reach CoreAudio" limitation already documented elsewhere in this file for
the sounddevice path, now confirmed for this one too. **First real test needs Leonardo, run
interactively**, so macOS can show the microphone permission prompt for the new binary. One
incident from this same debugging session, disclosed in full: while trying to *inspect* (not
change) the current microphone TCC grant, `tccutil reset Microphone` was run by mistake — this
resets mic permission for every app on the Mac, not just this one. Flagged to Leonardo immediately
when it happened; the only consequence is that previously-permitted apps (Zoom, browsers, etc.)
will re-prompt for mic access next time they're used — nothing was deleted or exposed.

**Not yet done:** `aec_bridge` doesn't honor `config.json`'s `input_device`/`output_device`
selection (always uses the system default input/output) — the sounddevice backend does. Low
priority until the backend itself is confirmed working end-to-end with real audio.

## Milestone 41, 2026-08-14 — the tool-calling bridge: voice can now (in theory) run real commands

Leonardo, live-tested: "the voice and the actual jarvis app don't work together... if i tell it to
check the current status, it can't." Real, expected gap — no tools were registered in the Gemini
Live session at all, by design, until this milestone. His proposed flow (tell Gemini something →
Gemini asks JARVIS → JARVIS answers → Gemini tells the user) is exactly Gemini Live's real,
documented function-calling mechanism, confirmed directly against the installed SDK before writing
any code (`types.LiveConnectConfig.tools`, `Tool.function_declarations`, `FunctionCall`/
`FunctionResponse` fields, `session.send_tool_response()`/`session.send_client_content()` — all
real, both coroutines, checked via `inspect` against the actual installed `google-genai` package,
not assumed from docs).

**Design, one generic tool not one per feature:** `run_jarvis_command`, taking free text — the
same shape a person would type into the command bar — registered in `live_config["tools"]`. When
Gemini calls it, `ToolBridge` (new class in `gemini_live_listen.py`) emits
`{"event":"tool_call","id":...,"command":...,"pre_approved":false}` on stdout and awaits a matching
result on stdin. The frontend runs the text through `runVoiceCommand` (new, `commandEngine.ts`),
which calls the *same* `executeCommand` every other input surface uses — not a parallel execution
system — and replies with `{"status":"done"|"needs_confirmation"|"error","text":...}`, written back
onto the Python process's stdin via a new Tauri command, `send_voice_tool_result`.

**Level 3 confirmation is spoken, not a popup — Leonardo's explicit design decision** made before
any code was written: a screen popup defeats the point of a hands-free voice mode. When
`runVoiceCommand` finds a Level 3 Skill or a NEEDS_APPROVAL `ask`, it never opens the real
`ApprovalDialog` — it returns a spoken confirmation question instead, which `ToolBridge` sends back
to Gemini as the tool response's text, and Gemini asks it out loud. The user's *next* turn is
checked by `gemini_live_listen.py`'s own `is_confirmation_yes`/`is_confirmation_no` — a strict
near-exact match against yes/no phrasing, mirroring `is_end_phrase()`'s existing pattern — not by
asking Gemini whether it thinks the user agreed. This was a deliberate choice, discussed explicitly
before implementation: trusting the model's own read of an ambiguous reply would be a real,
if subtle, weakening of the same guarantee an on-screen click currently gives. Confirmed execution
calls `runVoiceCommandConfirmed` (auto-approves internally, since the real yes/no decision already
happened in Python) and its result is delivered back into the live conversation via
`session.send_client_content()`, prompting Gemini to speak the actual result rather than a canned
line.

**Real IPC in a new direction, needed real design work, not just plumbing:** `voice.rs`'s listener
child previously never had its stdin piped (unused until now) — `spawn_listener_child` now returns
`(Child, ChildStdin)`, both stored in `VoiceState`, so `send_voice_tool_result` can find it. On the
Python side, a real bug was caught before it shipped: `main()`'s wake-word loop calls
`asyncio.run(run_live_session(...))` fresh on *every* wake-word cycle, meaning a new event loop is
created and later closed each time. An `asyncio.Future` (or a loop reference) captured once when
`ToolBridge` is constructed would belong to whichever loop happened to exist at that moment, not
necessarily the current session's — scheduling a callback on a stale, closed loop raises. Fixed by
having the one persistent stdin-reader thread push onto a plain, loop-agnostic `queue.Queue`, and
adding `drain_results()` — a task started fresh *inside* every `run_live_session` call, on that
session's own current loop — to resolve that session's pending futures from the queue. `VoiceEvent`
gained a `ToolCall { id, command, pre_approved }` variant.

**Verified:** real `cargo build`/`cargo test` (25 Rust tests, 1 new — `parses_a_tool_call_event`),
73 frontend tests (6 new, in `commandEngine.test.ts` — covering a Level 1/2 command running
straight through, a Level 3 Skill flagged for confirmation without executing or calling
`runOrchestrator`/`runOrchestratorBackground`, that same Skill actually running once "confirmed,"
and the equivalent SAFE/NEEDS_APPROVAL pair for `ask`), `tsc -b`/`vite build` clean, Python
syntax-checked. **Not yet verified:** an actual spoken tool call, end to end, with real audio — the
same limitation as every other native-audio change this session. Needs Leonardo's live test; see
`project/TASKS.md`.

## Real bug found and fixed on first live test, 2026-08-14: cuts off after one command

Leonardo tried it: worked once, then the whole `gemini_live_listen.py` process visibly restarted
(a fresh "Listening for wake word..." line, meaning a new Python interpreter, not just looping
back internally) — with no traceback anywhere in `/tmp/jarvis-dev.log`. No traceback is the
important clue: it rules out a Python exception and points at something external (a dropped
connection, not a crash).

**Root cause, found on review rather than more blind live-testing:** `tool_bridge.call()` is a
real network round trip (Python → Rust → frontend → `commandEngine.ts` → possibly a real
`claude -p` call, which can take several seconds) — and it was being `await`ed *directly inside*
`async for response in session.receive():`, in both the tool-call handler and the confirmation
handler. That holds the live connection's receive generator suspended for the whole round trip,
during which nothing is being read from Gemini at all. This is the exact same class of mistake as
2026-08-13's blocking-I/O fix (documented above) — never make the thing reading the connection
wait on slow external work — just with a slow `await` this time instead of a blocking sync call,
and in new code that hadn't been live-tested yet.

**Fixed:** both handlers now run as background `asyncio.create_task()`s instead of inline awaits,
so `receive_and_play`'s loop keeps consuming the connection while the round trip happens
concurrently. The background tasks live in a list one scope up (`run_live_session`, not
`receive_and_play`) specifically so the existing session-cleanup `finally:` blocks can cancel them
on session end instead of leaking them past the session that spawned them.

**Known, disclosed simplification, not fixed:** `pending_confirmation` is one shared variable per
session, not tracked per in-flight call — if Gemini somehow issued two tool calls needing
confirmation in close succession, a second would silently overwrite the first's pending state.
Low-probability given the tool's own description tells Gemini to wait for the user's answer before
doing anything else, and Live's own turn-taking generally serializes function calls — not fixed
now, flagged here so it isn't quietly forgotten if it ever actually causes a problem.

**Verified:** real `cargo build`/`cargo test` (still 25 Rust tests), 73 frontend tests, `tsc -b`,
Python syntax-checked. **Not yet verified:** whether this was the complete fix — needs another live
test. Temporary diagnostic logging left in `voice.rs` (`start_voice_listener`/`stop_voice_listener`/
`emit_status` now `eprintln!` when called) to make it unambiguous on the next test if a frontend-
triggered restart is *also* happening — remove once this is confirmed resolved.

## Not built yet

- Follow-up conversation mode, configurable timeout, spoken interruption ("Jarvis, stop") — now
  real for the `gemini_live` engine (2026-08-13 above); still true of the `classic` engine.
- Startup greeting, activation sound, speech speed/volume settings.
- Push-to-talk (the shortcut is displayed in settings but not bound to anything).
- `aec_bridge`'s device selection (`input_device`/`output_device` from `config.json`) — always
  uses the system default right now (see the 2026-08-14 section above).
- Real acoustic echo cancellation for `gemini_live` on built-in speakers/mic — **built**
  (`aec_bridge/`, 2026-08-14 above), but not yet live-tested end to end with real audio, so
  headphones remain the confirmed workaround until it is.
