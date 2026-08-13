import type { VoiceSettings as VoiceSettingsData } from "../hooks/useVoiceSettings";
import { useAudioDevices, type MicPermissionState } from "../hooks/useAudioDevices";

const PERMISSION_LABEL: Record<MicPermissionState, string> = {
  granted: "GRANTED",
  denied: "DENIED",
  prompt: "NOT YET REQUESTED",
  unknown: "UNKNOWN (unsupported on this platform)",
};

/**
 * Real settings (persisted), real device list, real permission status
 * where the platform supports reporting it. `settings`/`update` are
 * lifted to App.tsx (Milestone 9 wiring) so the same toggle state also
 * drives useVoiceListener's start/stop of the Rust-side voice process --
 * both "Microphone enabled" and "Wake word" must be on for it to listen.
 */
export function VoiceSettings({
  settings,
  update,
}: {
  settings: VoiceSettingsData;
  update: (patch: Partial<VoiceSettingsData>) => void;
}) {
  const { inputs, outputs, permission } = useAudioDevices();

  return (
    <div className="panel">
      <h3 className="panel-title">Voice</h3>

      <div className="status-row">
        <span>Microphone permission</span>
        <span className="status-badge status-not-wired">{PERMISSION_LABEL[permission]}</span>
      </div>

      <label className="voice-toggle-row">
        <span>Microphone enabled</span>
        <input
          type="checkbox"
          checked={settings.micEnabled}
          onChange={(e) => update({ micEnabled: e.target.checked })}
        />
      </label>

      <label className="voice-toggle-row">
        <span>Wake word ("Hey Jarvis")</span>
        <input
          type="checkbox"
          checked={settings.wakeWordEnabled}
          onChange={(e) => update({ wakeWordEnabled: e.target.checked })}
          disabled={!settings.micEnabled}
          title={
            settings.micEnabled
              ? "Starts the wake-word listener — needs the Python venv set up, see VOICE_SETUP.md"
              : "Enable the microphone above first"
          }
        />
      </label>

      <div className="voice-field">
        <span>Conversation engine</span>
        <select
          value={settings.voiceEngine}
          onChange={(e) => update({ voiceEngine: e.target.value as VoiceSettingsData["voiceEngine"] })}
        >
          <option value="classic">Classic (wake word → Claude → speak)</option>
          <option value="gemini_live">Gemini Live (real-time, interruptible)</option>
        </select>
      </div>

      <div className="voice-field">
        <span>Input device</span>
        <select
          value={settings.inputDeviceId ?? ""}
          onChange={(e) => update({ inputDeviceId: e.target.value || null })}
        >
          <option value="">System default</option>
          {inputs.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="voice-field">
        <span>Output device</span>
        <select
          value={settings.outputDeviceId ?? ""}
          onChange={(e) => update({ outputDeviceId: e.target.value || null })}
        >
          <option value="">System default</option>
          {outputs.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="status-row">
        <span>Push-to-talk</span>
        <span className="status-badge status-not-wired">{settings.pushToTalkShortcut} (not bound yet)</span>
      </div>
    </div>
  );
}
