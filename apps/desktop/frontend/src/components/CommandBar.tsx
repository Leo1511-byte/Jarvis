import { useState } from "react";
import "./CommandBar.css";

/**
 * Visual shell only. Not wired to the command engine yet (Milestone 5) —
 * submitting currently does nothing but echo, on purpose, rather than
 * pretending to understand a command it can't act on.
 */
export function CommandBar() {
  const [value, setValue] = useState("");

  return (
    <form
      className="command-bar"
      onSubmit={(e) => {
        e.preventDefault();
        setValue("");
      }}
    >
      <span className="command-bar-icon" aria-hidden="true">
        ›
      </span>
      <input
        className="command-bar-input"
        placeholder="Ask Jarvis anything… (command engine not wired yet — Milestone 5)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled
      />
      <kbd className="command-bar-kbd">⌘K</kbd>
    </form>
  );
}
