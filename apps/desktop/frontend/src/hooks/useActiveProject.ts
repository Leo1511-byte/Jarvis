import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "jarvis.activeProjectId";

/**
 * Which project JARVIS should treat as "the one we're working on right
 * now" -- used to give commands like `research <topic>` (see
 * commandEngine.ts's CommandContext.activeProject) real project context
 * instead of always writing to the vault-wide Notes/ folder with no
 * association (a gap ROADMAP.md's M16 row named explicitly).
 *
 * Distinct from Project.status ("active" / "paused" / "archived", each
 * project's own independent lifecycle field, see lib/store/types.ts) --
 * this is a single UI-level selection of one project, not a project
 * property, and multiple projects can have status "active" at once while
 * at most one is ever "the" active project here.
 *
 * Persists via localStorage, same pattern as useTheme.ts/useVoiceSettings.ts
 * -- same future note applies: once Supabase's `settings` table is used
 * for cross-device sync, this should move there too.
 */
export function useActiveProject() {
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );

  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem(STORAGE_KEY, activeProjectId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeProjectId]);

  const setActiveProjectId = useCallback((id: string | null) => {
    setActiveProjectIdState(id);
  }, []);

  return { activeProjectId, setActiveProjectId };
}
