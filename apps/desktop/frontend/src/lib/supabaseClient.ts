import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * null until VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY are set (see
 * .env.example). Callers must check for null rather than assume a
 * client exists -- there is no Supabase project provisioned yet, and
 * this file must not pretend otherwise (spec principle #5).
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}
