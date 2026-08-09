import { THEMES, type Theme } from "../hooks/useTheme";

const THEME_LABEL: Record<Theme, string> = {
  "crimson-command": "Crimson Command",
  "neon-void": "Neon Void",
  "holographic-core": "Holographic Core",
  obsidian: "Obsidian",
};

export function ThemeSwitcher({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (t: Theme) => void;
}) {
  return (
    <div className="theme-switcher" role="radiogroup" aria-label="Theme">
      {THEMES.map((t) => (
        <button
          key={t}
          role="radio"
          aria-checked={t === theme}
          className={"theme-swatch" + (t === theme ? " active" : "")}
          data-theme={t}
          onClick={() => onChange(t)}
          title={THEME_LABEL[t]}
        >
          <span className="theme-swatch-dot" />
        </button>
      ))}
    </div>
  );
}
