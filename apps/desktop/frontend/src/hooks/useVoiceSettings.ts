import { useCallback, useEffect, useState } from "react";

export interface VoiceSettings {
  micEnabled: boolean;
  wakeWordEnabled: boolean;
  inputDeviceId: string | null;
  outputDeviceId: string | null;
  pushToTalkShortcut: string;
}

const STORAGE_KEY = "jarvis.voiceSettings";

const DEFAULT_SETTINGS: VoiceSettings = {
  micEnabled: false,
  wakeWordEnabled: false,
  inputDeviceId: null,
  outputDeviceId: null,
  pushToTalkShortcut: "Option+Space",
};

function load(): VoiceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Settings persist across restarts (spec §37), same localStorage
 * pattern as useTheme. Turning micEnabled/wakeWordEnabled on here only
 * changes what the UI *says* is enabled -- it does not start any real
 * listening, because nothing in the Tauri backend calls the Python
 * voice scripts yet (see VOICE_SETUP.md "Not built yet"). Don't wire
 * these toggles to a fake "listening" animation before the real
 * backend exists -- that would violate spec principle #5.
 */
export function useVoiceSettings() {
  const [settings, setSettings] = useState<VoiceSettings>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = useCallback((patch: Partial<VoiceSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  return { settings, update };
}
