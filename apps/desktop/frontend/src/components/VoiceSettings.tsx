import { useVoiceSettings } from "../hooks/useVoiceSettings";
import { useAudioDevices, type MicPermissionState } from "../hooks/useAudioDevices";

const PERMISSION_LABEL: Record<MicPermissionState, string> = {
  granted: "GRANTED",
  denied: "DENIED",
  prompt: "NOT YET REQUESTED",
  unknown: "UNKNOWN (unsupported on this platform)",
};

/**
 * Real settings (persisted), real device list, real permission status
 * where the platform supports reporting it. What's NOT real: toggling
 * "wake word enabled" here does not start any listening -- there's no
 * backend wired to it yet (VOICE_SETUP.md). The toggle is honest about
 * that in its own label rather than implying it does something it
 * doesn't.
 */
export function VoiceSettings() {
  const { settings, update } = useVoiceSettings();
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
        <span>Wake word ("Hey Jarvis") — not wired to a listener yet</span>
        <input
          type="checkbox"
          checked={settings.wakeWordEnabled}
          onChange={(e) => update({ wakeWordEnabled: e.target.checked })}
          disabled
          title="Requires the Python voice sidecar to be wired in first — see VOICE_SETUP.md"
        />
      </label>

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
