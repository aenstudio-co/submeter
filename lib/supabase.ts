import { createClient } from "@supabase/supabase-js";

// Server-only. Never import this from a "use client" file.
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
