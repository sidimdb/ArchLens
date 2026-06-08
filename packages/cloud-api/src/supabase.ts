/**
 * The single Supabase client used by the API. Created with the
 * service_role key, so it bypasses Row-Level Security — appropriate
 * because every request to this API has already been authenticated
 * by us (project-key check) before any Supabase call is made.
 *
 * Never expose this client or its key to any HTTP response. It only
 * lives in memory on the server.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "./env.js";

let cached: SupabaseClient | null = null;

export function getServiceSupabase(env: Env): SupabaseClient {
  if (cached) return cached;
  cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      // We're not maintaining a user session — this client always acts
      // with service_role privileges.
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { "X-Client-Info": "archlens-cloud-api" },
    },
  });
  return cached;
}
