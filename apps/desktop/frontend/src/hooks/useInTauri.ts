import { useEffect, useState } from "react";

/**
 * Milestone 23 extraction: this detection used to live only inside
 * StatusPanel.tsx's `useSystems`. Pulled out so the new Connections view
 * can gate its own "connected" claims on the same real check (genuinely
 * running inside Tauri, not a plain browser preview) instead of a second,
 * possibly-drifting copy of the same three lines -- see
 * CHAT_MEMORY_SKILLS_CONNECTIONS_PLAN.md's "REUSABLE COMPONENTS" section
 * ("built on StatusPanel's existing detection logic rather than a second
 * implementation").
 */
export function useInTauri(): boolean {
  const [inTauri, setInTauri] = useState(false);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    setInTauri(typeof w.__TAURI_INTERNALS__ !== "undefined" || typeof w.__TAURI__ !== "undefined");
  }, []);

  return inTauri;
}
