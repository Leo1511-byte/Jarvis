import { useCallback, useEffect, useState } from "react";

export const THEMES = [
  "crimson-command",
  "neon-void",
  "holographic-core",
  "obsidian",
] as const;

export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = "jarvis.theme";
const DEFAULT_THEME: Theme = "holographic-core";

function isTheme(value: string | null): value is Theme {
  return !!value && (THEMES as readonly string[]).includes(value);
}

/**
 * Theme persists across restarts via localStorage (spec §17).
 * Once Milestone 7 (Supabase) lands, this should read/write the
 * `settings` table instead so it syncs across devices — localStorage
 * is the correct choice for now, not a placeholder to feel bad about.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);

  return { theme, setTheme, themes: THEMES };
}
