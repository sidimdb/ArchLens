/**
 * Browser-side Supabase client.
 *
 * Unlike the device SDK, the dashboard talks to Supabase **directly**
 * — that's exactly what Supabase Auth + Row-Level Security were built
 * for. The user signs in, gets an `authenticated` JWT, and every read
 * is filtered server-side by RLS so they only see their org's data.
 *
 * The anon key is *meant* to be public — the security model lives in
 * RLS, not in keeping this string secret.
 */

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env and fill them in."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
