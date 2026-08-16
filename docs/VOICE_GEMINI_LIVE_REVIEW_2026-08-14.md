# Gemini Live voice engine — design & problem review (2026-08-14)

Written to support a step-back, deep-research pass rather than another one-bug-at-a-time patch.
Five real bugs have been found and fixed sequentially over 2026-08-13/14 (blocking I/O,
session-killing echo match, single-turn-only receive loop, VAD/wake-word sensitivity, and now a
language-switching report) — each fix was correct for the symptom it targeted, but the pattern of
"fix one thing, a new thing breaks" is itself a signal worth treating as data, not noise. This doc
lays out the full system as built, the hardware it runs on, and the complete problem history in
one place.

## 1. What this is trying to do

Leonardo saw a demo of Gemini 3 doing continuous, low-latency, interruptible voice conversation
and wants JARVIS to feel the same way, replacing (optionally — it's a per-user toggle, not a
rip-out) the original wake-word → fixed 5s record → Whisper transcribe → `claude -p` call →
speak-the-whole-reply pipeline, which is turn-based and slow (12–44s measured round trip) by
design, not by bug.

## 2. Hardware this runs on

Confirmed live on this machine, 2026-08-14:

| | |
|---|---|
| Model | MacBook Air, Model Identifier `Mac16,12` |
| Chip | Apple M4, 10 cores (4P + 6E) |
| Memory | 16 GB |
| OS | macOS 26.5.2 (build 25F84) |
| Default input | **MacBook Air Microphone** (built-in), 1 channel, **48000 Hz native** |
| Default output | **MacBook Air Speakers** (built-in), 2 channel, **44100 Hz native** |

Leonardo has tested with both this built-in mic/speaker pair and wired Jabra headphones (the
headphones test isolated the echo/no-AEC issue — see §4.3 — but did not eliminate all problems).

**Notable mismatch, not yet investigated as a root cause:** the built-in devices' native sample
rates (48000 Hz in, 44100 Hz out) do not match the rates this code requests from PortAudio via
`sounddevice` (`MIC_SAMPLE_RATE = 16000`, `OUTPUT_SAMPLE_RATE = 24000` — Gemini Live's required
wire format). `sounddevice`/PortAudio is asked to open the stream *at* 16000/24000 directly rather
than at the device's native rate with app-level resampling, which means either (a) the OS's
CoreAudio HAL is doing the resampling transparently and correctly, or (b) there's a rate-conversion
path here that's never been specifically verified. This has not been diagnosed as connected to any
symptom below — flagged here because it's a real hardware/software seam nobody has looked at
directly yet, and sample-rate mismatches are a classic source of exactly the kind of garbled/
misheard audio that could plausibly look like "the model behaved strangely" (e.g. mis-hearing
language) rather than "the audio pipeline is subtly wrong."

## 3. Software architecture as built

### 3.1 Two independent engines, selected per-user

`config.json`'s `voice_engine` field: `"classic"` (default) or `"gemini_live"`. Toggled in Voice
Settings → "Conversation engine" in the app. This review is about the `gemini_live` engine only;
`classic` is unrelated code, unaffected, and not reported broken.

### 3.2 Classic engine (for contrast, not the subject of this review)

Two long-running Python processes (`listen_loop.py` wake-word+Whisper, `speak_daemon.py`
ElevenLabs/`say` TTS) coordinating through a shared `speaking.flag` file on disk to avoid the mic
picking up JARVIS's own voice. Two self-listening bugs found and fixed 2026-08-13, unrelated to
the Gemini Live work.

### 3.3 Gemini Live engine — full current design

Single file: `~/Documents/Obsidian Vault/System/voice/gemini_live_listen.py` (not part of the git
repo — the whole `System/voice/` tree, including `config.json` with real API keys, lives in
Leonardo's Obsidian vault, which is not a git repository at all).

**Model in use:** `gemini_live_model` in `config.json` is currently
`"gemini-3.1-flash-live-preview"`. **This has never been confirmed against Google's own model
catalog** — it was written from memory/inference during the initial build, not looked up. This
matters directly for the language bug (see §5) because Gemini Live's language-handling contract is
documented as being fundamentally different between "native audio" model variants (which can
auto-switch languages mid-conversation and are steered via `system_instruction`) and
"non-native-audio"/cascaded variants (which respect `speech_config.language_code` directly). Which
category `gemini-3.1-flash-live-preview` actually falls into — or whether it exists under that
exact name at all in the current API — has not been verified.

**SDK:** `google-genai` Python package, confirmed installed at **v2.18.0** in the project's `uv`
venv (`System/voice/.venv`). Not verified whether the config shapes and field names used in this
code (sourced via web fetch against `ai.google.dev` at various points on 2026-08-13) are correct
for this specific installed SDK version — the docs were fetched live, but never cross-checked
against this exact package version's actual Python type definitions (e.g.
`google.genai.types.LiveConnectConfig`, `SpeechConfig`, etc.), and the code builds config as plain
dicts rather than the SDK's typed config objects, so a silently-ignored/misspelled key would not
raise an error, just be dropped.

**Flow:**
1. `main()` loads `openWakeWord`'s `hey_jarvis` model once, then loops:
   `wait_for_wake_word()` → `asyncio.run(run_live_session(config))` → repeat.
2. `wait_for_wake_word()`: blocking `sd.RawInputStream` at 16kHz/mono/int16, 80ms chunks, requires
   `WAKE_CONSECUTIVE_FRAMES_REQUIRED = 3` consecutive chunks scoring >0.5 before firing (added
   2026-08-13 to filter noise transients — not applied to the classic engine, which hasn't shown
   this symptom).
3. `run_live_session()`: opens `client.aio.live.connect(model=..., config=live_config)`. Current
   `live_config`:
   ```python
   live_config = {
       "response_modalities": ["AUDIO"],
       "input_audio_transcription": {},
       "output_audio_transcription": {},
       "realtime_input_config": {
           "automatic_activity_detection": {
               "start_of_speech_sensitivity": "START_SENSITIVITY_LOW",
               "end_of_speech_sensitivity": "END_SENSITIVITY_LOW",
           }
       },
   }
   ```
   No `speech_config`, no `language_code`, no `system_instruction` — nothing constrains output
   language at all right now. This is the gap behind the currently-unfixed bug (§5).
4. Mic capture (`sd.RawInputStream` callback → `asyncio.Queue` → `session.send_realtime_input()`)
   and speaker playback (`session.receive()` → `queue.Queue` → dedicated `threading.Thread` calling
   blocking `sd.RawOutputStream.write()`) run concurrently. Playback was deliberately moved off the
   asyncio event loop (§4.1) because PortAudio writes block.
5. `session.receive()` is wrapped in `while not ended: async for response in session.receive():`
   because the generator was found to complete per-turn, not per-session (§4.2 fix, second fix in
   that same discovery — see below, `is_end_phrase()`).
6. Session ends on: 45s silence timeout, or an `is_end_phrase()` match on the live
   `input_transcription` text (near-exact match against `END_PHRASES`, not substring — fixed
   2026-08-13 after a substring match was killing sessions on echoed partial phrases).
7. No tool-calling — Gemini can talk but can't run JARVIS Skills mid-conversation. Deliberately
   out of scope for now (marked in the file where it would go).
8. No acoustic echo cancellation. Plain PortAudio streams for both directions, no CoreAudio
   voice-processing tap. This is a disclosed, still-open limitation, not something claimed fixed.

## 4. Bugs found and fixed so far, in order (all real, all confirmed by Leonardo's own live tests)

### 4.1 Blocking I/O froze the event loop
`output_stream.write()` (blocking) was called directly inside the same `async def` that also read
network data and sent mic audio — one PortAudio write stalled the entire event loop, matching both
"doesn't answer" and "cuts off" symptoms. Fixed: playback moved to a dedicated thread fed by a
thread-safe queue. **Verified: syntax-checked only at the time**, later implicitly exercised by
subsequent live tests that got further (see 4.2, 4.3) — i.e. this fix appears to have actually
worked, since later bugs were different in kind.

### 4.2 Echo + over-eager end-phrase substring match killed sessions
Built-in speakers/mic, no headphones: JARVIS's own voice was picked up by the mic, transcribed by
Gemini as if the user said it, and a naive `any(phrase in text.lower() for phrase in END_PHRASES)`
substring check matched an echoed phrase mid-sentence, closing the whole session (not just
flushing audio). Fixed with a near-exact-match `is_end_phrase()`. Root echo condition (no AEC) is
explicitly **not** fixed by this, only the specific crash-on-substring-match bug is.

### 4.3 `session.receive()` is a per-turn generator, not a per-session stream
One exchange worked, then follow-ups got total silence — the generator was completing naturally
after the model finished speaking once, and nothing re-entered it. Fixed by wrapping in an outer
`while not ended:` loop. This test (with headphones on) also confirmed the echo theory in 4.2 was
at least partially right, since the wake word worked cleanly with the acoustic path removed.

### 4.4 VAD oversensitive to background noise / wake word oversensitive to noise transients
Leonardo, unprompted: "listening to every noise, when it only should listen to voices." Two
changes: Gemini's own `automatic_activity_detection` sensitivities lowered from documented HIGH
default to LOW on both start/end of speech; local wake-word detection required 3 consecutive
above-threshold chunks instead of 1. **Neither independently confirmed against a real session** —
the nested `realtime_input_config` shape came from the API *reference doc*, not a working code
example, unlike the top-level fields.

### 4.5 (Current, unresolved) Sometimes responds in Spanish
Leonardo: "sometimes it changes the language to spanish, this voice setup is terrible." No fix
implemented yet — research was in progress (see §5) when this review was requested. This is the
proximate trigger for stepping back rather than making a sixth sequential point-fix.

## 5. The open problem: language switching to Spanish

What's confirmed so far (via web search, not yet cross-checked against the installed SDK or the
actual model in use):
- Gemini Live's language behavior differs by model family. "Non-native-audio" (cascaded TTS)
  models reportedly respect `speech_config.language_code` directly. "Native audio" models can
  switch languages mid-conversation on their own and are better constrained via
  `system_instruction` text telling them explicitly what language(s) to use.
- This code currently sets **neither** `speech_config` nor `system_instruction` — output language
  is fully unconstrained.
- It is not currently known which family `gemini-3.1-flash-live-preview` belongs to, or whether
  that model identifier is even correct/current.

**Update, checked directly against the installed SDK (2026-08-14):** ran
`types.LiveConnectConfig.model_fields.keys()` against the actual installed `google-genai` v2.18.0
in `System/voice/.venv`. Confirmed real, top-level fields include `speech_config`,
`system_instruction`, `realtime_input_config`, `input_audio_transcription`,
`output_audio_transcription`, `response_modalities`, `tools`, among others. `SpeechConfig`'s own
fields are `voice_config`, `language_code`, `multi_speaker_voice_config`.
`AutomaticActivityDetection`'s fields are `disabled`, `start_of_speech_sensitivity`,
`end_of_speech_sensitivity`, `prefix_padding_ms`, `silence_duration_ms` — so the §4.4 VAD fix's
field names were correct. This rules out "the config keys don't exist in this SDK version" as an
explanation for either the VAD fix's uncertainty or the language bug — the fields are real and
correctly named. It does **not** confirm the *nested* dict values (plain `dict` vs. the SDK's
typed `SpeechConfig`/`AutomaticActivityDetection` objects) are actually being parsed correctly at
the API boundary rather than being accepted-but-ignored — Pydantic v2 (which this SDK uses) will
generally coerce or reject a plain dict passed where a nested model is expected, but this has not
been proven with a real session, only inferred from the field names existing.

**RESOLVED, 2026-08-14 — research completed:**
1. `gemini-3.1-flash-live-preview` is confirmed real and current: Google's newest audio-to-audio
   (native-audio) realtime model, with function calling/vision/web-search built in, priced at
   $0.75/1M input + $4.50/1M output tokens. **It is native-audio, not cascaded.**
2. ~~SDK config shape~~ — resolved, fields are real (unchanged from above).
3. **Resolved definitively**, straight from `ai.google.dev`'s Live API capabilities doc: *"Native
   audio output models automatically choose the appropriate language and don't support explicitly
   setting the language code."* So `speech_config.language_code` was never going to work for this
   model — not a bug, a documented non-feature for this model family. The correct, documented
   mechanism is `system_instruction`: *"You can also restrict the languages it speaks in by
   specifying it in the system instructions."* **Implemented 2026-08-14** — see `VOICE_SETUP.md`.
4. Still an open, secondary possibility (echo-fed mis-transcription contributing to odd responses)
   but no longer the primary theory, since #3 above supplies a direct, documented, sufficient
   explanation on its own. Not further investigated — the `system_instruction` fix should be tried
   first, live.
5. Sample-rate mismatch: deprioritized. Confirmed via `ai.google.dev` that Gemini's own wire
   protocol wants 16kHz in (auto-resampled from other rates) / 24kHz out always — exactly what this
   code already sends; the device-native-rate question is a separate, earlier hop (CoreAudio/
   PortAudio) that was never implicated by anything found.

**New finding this same session, resolving §8's backlog item on real AEC:** built it —
`System/voice/aec_bridge/`, a native Swift/`AVAudioEngine` helper using CoreAudio's
`VoiceProcessingIO` (confirmed via Apple's own forum guidance and AVAudioEngine docs; not reachable
from `sounddevice`/PortAudio at all). Full build/debug history in `VOICE_SETUP.md`'s 2026-08-14
section — three real CoreAudio -10875 failures fixed by isolating causes in minimal test programs
against this machine's actual hardware. Engine starts cleanly and negotiates real device formats;
actual captured-audio behavior end-to-end could not be verified from this session (microphone TCC
permission is scoped to the Claude Code app process, not a real Terminal session) — needs
Leonardo's own live test, gated behind `config.json`'s new `audio_backend` field so the proven
`sounddevice` path stays the default until then.

## 6. Pattern worth naming directly

Five real, distinct bugs from five consecutive live tests against a from-scratch real-time
streaming integration is not necessarily a sign the approach is wrong — this is a genuinely
complex protocol (bidirectional audio streaming, server-side VAD, per-turn generators, echo
physics) built without ever having a microphone available in the sessions that wrote most of this
code, verified only by `python3 -m py_compile` until Leonardo's live tests. But the *last two*
fixes (4.4, and whatever 4.5 becomes) share a common weakness the first three didn't: they rely on
config fields whose exact shape was never confirmed against either a real session or the installed
SDK's own types, only against documentation prose. That's the concrete thing worth fixing about the
*process*, independent of any single bug: before the next config-shape fix ships, check it against
`google.genai.types` in the actual installed venv, not just against fetched docs.
