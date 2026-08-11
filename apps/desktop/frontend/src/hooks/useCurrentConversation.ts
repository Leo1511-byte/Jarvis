import { useCallback, useEffect, useState } from "react";
import { getStore, type Conversation } from "../lib/store";

const STORAGE_KEY = "jarvis.currentConversationId";

/**
 * Milestone 21 (Chat backbone) — resolves (or lazily creates) the
 * conversation every command-bar/voice exchange gets persisted to. Only
 * the id is persisted in localStorage (same pattern as
 * useActiveProject.ts); the conversation row itself lives in the store
 * (local or Supabase) so it survives a reload and, once Supabase is the
 * active store, syncs like everything else.
 *
 * Auto-creates one conversation on first use so App.tsx always has
 * something real to write messages into. Milestone 22 addition: exposes
 * `selectConversation` so the new Chat view can switch to a different (or
 * newly created) conversation and have App.tsx -- which reads this same
 * hook instance -- immediately start persisting into it too, instead of
 * the two staying out of sync.
 */
export function useCurrentConversation() {
  const [conversation, setConversationState] = useState<Conversation | null>(null);

  const selectConversation = useCallback((next: Conversation) => {
    localStorage.setItem(STORAGE_KEY, next.id);
    setConversationState(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const store = getStore();
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        try {
          const existing = await store.listConversations();
          const found = existing.find((c) => c.id === savedId);
          if (found) {
            if (!cancelled) setConversationState(found);
            return;
          }
        } catch {
          // Fall through to creating a new one -- e.g. the saved id was
          // for a different store (local vs Supabase) than the one
          // currently active.
        }
      }
      try {
        const created = await store.createConversation();
        localStorage.setItem(STORAGE_KEY, created.id);
        if (!cancelled) setConversationState(created);
      } catch {
        // No conversation to persist into -- callers (App.tsx) treat a
        // null conversation as "don't persist this exchange" rather than
        // failing the command itself. Chat persistence is additive, not a
        // dependency of the command bar working at all.
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, []);

  return { conversation, selectConversation };
}
