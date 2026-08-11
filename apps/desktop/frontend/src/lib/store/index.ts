import { isSupabaseConfigured } from "../supabaseClient";
import { LocalStore } from "./localStore";
import { SupabaseStore } from "./supabaseStore";
import type { JarvisStore } from "./types";

export type {
  JarvisStore,
  Project,
  Task,
  NewProjectInput,
  NewTaskInput,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  Conversation,
  Message,
  MessageRole,
  NewMessageInput,
} from "./types";

/**
 * The one place that decides which store backs the app. Real logic,
 * tested in index.test.ts: falls back to the local store honestly
 * when Supabase isn't configured, rather than crashing or silently
 * no-op'ing. Once you've provisioned Supabase (see .env.example) this
 * switches automatically -- no code change needed elsewhere.
 */
export function getStore(): JarvisStore {
  return isSupabaseConfigured() ? new SupabaseStore() : new LocalStore();
}
