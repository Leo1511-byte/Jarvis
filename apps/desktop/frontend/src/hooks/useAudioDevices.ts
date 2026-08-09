import { useEffect, useState } from "react";

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
}

export type MicPermissionState = "granted" | "denied" | "prompt" | "unknown";

/**
 * Real device enumeration via navigator.mediaDevices -- this works in
 * Tauri's webview (standard Web API, not something that needs the
 * unwired Rust audio bridge). Device labels are blank until mic
 * permission has been granted at least once; that's the browser's
 * privacy behavior, not a bug here.
 */
export function useAudioDevices() {
  const [inputs, setInputs] = useState<AudioDeviceInfo[]>([]);
  const [outputs, setOutputs] = useState<AudioDeviceInfo[]>([]);
  const [permission, setPermission] = useState<MicPermissionState>("unknown");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!navigator.mediaDevices?.enumerateDevices) {
        return;
      }
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        setInputs(
          devices
            .filter((d) => d.kind === "audioinput")
            .map((d) => ({ deviceId: d.deviceId, label: d.label || "Unnamed input" }))
        );
        setOutputs(
          devices
            .filter((d) => d.kind === "audiooutput")
            .map((d) => ({ deviceId: d.deviceId, label: d.label || "Unnamed output" }))
        );
      } catch {
        // Device enumeration can fail if the platform doesn't support it
        // at all -- leave lists empty rather than fabricate entries.
      }
    }

    async function loadPermission() {
      try {
        const status = await navigator.permissions?.query({
          name: "microphone" as PermissionName,
        });
        if (cancelled || !status) return;
        setPermission(status.state as MicPermissionState);
        status.onchange = () => setPermission(status.state as MicPermissionState);
      } catch {
        // Permissions API for "microphone" isn't supported on every
        // platform (notably WebKit historically). Report unknown
        // honestly instead of guessing.
        setPermission("unknown");
      }
    }

    load();
    loadPermission();
    navigator.mediaDevices?.addEventListener?.("devicechange", load);
    return () => {
      cancelled = true;
      navigator.mediaDevices?.removeEventListener?.("devicechange", load);
    };
  }, []);

  return { inputs, outputs, permission };
}
