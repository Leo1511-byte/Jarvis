# Handoff: voice crash recovery gap

Found while auditing the roadmap on 2026-08-10. Not fixed here because it needs
Rust changes I can't compile/test in the Cowork sandbox (no cargo/rustc there).

## The problem

1. `apps/desktop/backend/src/voice.rs` spawns `listen_loop.py` and `speak_daemon.py`
   as child processes, tracked in `VoiceState { listener: Mutex<Option<Child>>, ... }`.
2. If either child dies unexpectedly (crash, uncaught exception, killed by the OS),
   nothing detects it. The `Mutex` guard still holds `Some(child)` for a dead process.
3. `start_voice_listener`'s guard is `if guard.is_some() { return Ok(()) }` -- so once
   the stale handle is stuck, voice silently stays dead. The only recovery today is
   the user manually toggling the voice setting off and back on in the UI, which
   calls `stop_voice_listener` (releasing the guard) and then `start_voice_listener`
   again.
4. On the Python side, `System/voice/listen_loop.py`'s `main()` loop only catches
   `KeyboardInterrupt` in its outer try/except -- any other exception (mic
   disconnect, model load hiccup, etc.) crashes the whole process with no retry.

## Suggested fix (pick one or both)

- **Python**: widen `listen_loop.py`'s main loop to catch broad `Exception`, log it,
  and continue the loop instead of letting the process die. At minimum wrap the
  per-iteration work (not the whole `main()`) so one bad frame doesn't kill the
  listener.
- **Rust**: add crash detection in `voice.rs` -- e.g. periodically call
  `Child::try_wait()` on the tracked child; if it returns `Ok(Some(status))`
  (process exited) without the explicit stop command having been called, clear the
  `Mutex` and respawn automatically (maybe with backoff + a cap on retries so a
  persistently-crashing process doesn't loop forever). Emit a Tauri event so the
  frontend can show a "voice reconnected" or "voice needs attention" toast rather
  than silently doing nothing.

## Why this matters

Leonardo reported "I can't talk to it" as a live bug once already this session (root
cause was a different, now-fixed issue: `commandEngine.ts` had no fallback path to
the orchestrator for free-text input). This crash-recovery gap is the next most
likely way voice silently goes dark again, and it'd look identical from the user's
side -- voice just stops working with no error shown.

## Where this is tracked

Already logged in `ROADMAP.md` (M9 row), `TASKS.md` (open item), and `CHANGELOG.md`
("Found, documented, not yet fixed -- 2026-08-10"). Once this is fixed, update all
three plus this file can be deleted.
