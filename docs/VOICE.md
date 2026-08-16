# Voice — current architecture

Clean current-state reference, 2026-08-15. For the full chronological build history — every bug
found, every fix, what's verified vs. not — see `VOICE_SETUP.md` (repo root; kept there
deliberately, not moved into `docs/`, since it's a dated log rather than a static reference and
several other docs already link to it by that name).

## Two engines, one selector

`config.json`'s `voice_engine` (`~/Documents/Obsidian Vault/System/voice/`, not part of this git
repo): `"classic"` (default) or `"gemini_live"`. Chosen per-user in Voice Settings — mutually
exclusive, not run simultaneously. Both spawn through the same Rust plumbing
(`apps/desktop/backend/src/voice.rs`): one listener slot, one crash-recovery monitor, one
line-based JSON stdout protocol (`VoiceEvent`).

## Classic engine

```
wake word (openWakeWord) → fixed-length recording → faster-whisper transcription
  → commandEngine.ts (parseCommand/executeCommand) → ElevenLabs/`say` TTS
```

Two processes (`listen_loop.py`, `speak_daemon.py`) coordinating through a shared `speaking.flag`
file on disk to avoid the mic picking up JARVIS's own voice. Turn-based, ~12-44s round trip
measured live. This is the same command path typed input uses — see
`docs/WAYS_OF_WORKING.md`'s voice architecture rule.

## Gemini Live engine (M40+)

```
wake word gates opening a session → real-time bidirectional audio (Gemini Live API)
  → Gemini speaks directly, OR calls run_jarvis_command (M41) → commandEngine.ts → spoken result
```

Single process (`gemini_live_listen.py`) handles mic capture and speaker playback — no
flag-file coordination needed, since there's no second process to coordinate with. Session stays
open for natural back-and-forth until a silence timeout or an end phrase.

**Conversation vs. action, the real distinction:** ordinary conversation audio is Gemini talking
directly — not routed through `commandEngine.ts` at all, just persisted to Chat as transcripts.
Only when Gemini decides something needs a real action does it call the one registered tool,
`run_jarvis_command` (free text, same shape as the command bar) — that's the M41 bridge, and it's
the only point where Gemini Live actually touches the rest of the app.

**Level 3 confirmation is spoken, not a popup** — a deliberate design choice, not a limitation.
When `run_jarvis_command` hits something requiring approval, the bridge tells Gemini a spoken
confirmation question instead of opening `ApprovalDialog`. The actual go/no-go on the next turn is
decided by `gemini_live_listen.py`'s own deterministic near-exact yes/no phrase match — never by
trusting Gemini's own read of an ambiguous reply. See `VOICE_SETUP.md`'s 2026-08-14 section for
the full reasoning and the real IPC this needed (Rust piping the listener's stdin for the first
time, a `ToolBridge` class decoupled from the per-wake-word-cycle event loop).

**Real acoustic echo cancellation** (`aec_bridge/`, native Swift/`AVAudioEngine`) exists as an
opt-in backend (`config.json`'s `audio_backend`) because plain Python audio libraries can't reach
CoreAudio's VoiceProcessingIO — only native code can. Headphones remain the fallback workaround
on the default `sounddevice` backend.

## What's not built

Push-to-talk (shortcut is displayed in settings, not bound). Startup greeting/activation sound.
Spoken interruption for the classic engine ("Jarvis, stop" — real for Gemini Live via Live's own
interruption signal, not for classic). `aec_bridge` device selection (always uses system default).
