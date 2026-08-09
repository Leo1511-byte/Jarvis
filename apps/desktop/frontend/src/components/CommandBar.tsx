import { useState } from "react";
import "./CommandBar.css";

/**
 * Wired to the real command engine (Milestone 5) via onSubmit — this
 * component itself just handles the input field, submit, and its own
 * empty-string guard, and defers to whatever parseCommand/executeCommand
 * results the caller passes back in.
 */
export function CommandBar({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <form
      className="command-bar"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
        setValue("");
      }}
    >
      <span className="command-bar-icon" aria-hidden="true">
        ›
      </span>
      <input
        className="command-bar-input"
        placeholder='Ask Jarvis anything… (try "switch to neon void" or "help")'
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <kbd className="command-bar-kbd">⌘K</kbd>
    </form>
  );
}
