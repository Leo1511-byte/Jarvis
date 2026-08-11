import { useState, type FormEvent } from "react";
import type { Conversation, Message } from "../lib/store";

/**
 * Milestone 22 — the real Chat tab Leonardo asked for. Deliberately not a
 * new AI system: every message here goes through the exact same
 * parseCommand/executeCommand path the command bar and voice already use
 * (via the `onSubmit` prop, which App.tsx wires straight to its existing
 * `handleCommand`). What's new is purely the view -- full persisted
 * history instead of the Dashboard's rolling last-6 Command Log, plus a
 * switcher for the `conversations` Milestone 21 already made real.
 */
export function ChatView({
  conversation,
  conversations,
  messages,
  onSelectConversation,
  onNewConversation,
  onSubmit,
}: {
  conversation: Conversation | null;
  conversations: Conversation[];
  messages: Message[];
  onSelectConversation: (c: Conversation) => void;
  onNewConversation: () => void;
  onSubmit: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setDraft("");
  }

  return (
    <div style={{ display: "flex", gap: "var(--space-4)", minHeight: 0, flex: 1 }}>
      <div className="panel" style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <h3 className="panel-title">Conversations</h3>
        <button type="button" className="jc-btn-inline" onClick={onNewConversation}>
          + New chat
        </button>
        {conversations.length === 0 ? (
          <p className="empty-state">Nothing yet — this is the first one.</p>
        ) : (
          <ul className="status-list">
            {conversations.map((c) => {
              const isActive = conversation?.id === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelectConversation(c)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: isActive ? "var(--accent-soft)" : "transparent",
                      color: isActive ? "var(--accent)" : "var(--text)",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      padding: "6px 8px",
                      fontSize: 13,
                      cursor: isActive ? "default" : "pointer",
                    }}
                  >
                    {c.title ?? "New conversation"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="panel" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <h3 className="panel-title">
          {conversation?.title ?? "Chat"}
        </h3>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {messages.length === 0 ? (
            <p className="empty-state">
              Nothing here yet — say or type anything below. Same engine as the command bar and
              voice, it just remembers now.
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  background: m.role === "user" ? "var(--accent-soft)" : "var(--bg-panel-raised)",
                  color: m.role === "user" ? "var(--accent)" : "var(--text)",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 12px",
                  fontSize: 13,
                }}
              >
                {m.content}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="command-bar" style={{ marginTop: "var(--space-4)" }}>
          <input
            className="command-bar-input"
            placeholder='Message JARVIS… same commands as the command bar work here too'
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="jc-btn-inline">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
