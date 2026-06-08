/**
 * Project-key validation.
 *
 * Looks up `projects.key_hash` and compares against the plaintext key
 * via the same bcrypt-style `crypt()` we used when the key was minted.
 * The hash compare is done in the database to keep the cost-config
 * coupled with how the hash was produced.
 *
 * Returns the project_id + org_id when valid, or throws Unauthorized.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { UnauthorizedError } from "./errors.js";

export interface ProjectIdentity {
  projectId: string;
  orgId: string;
}

export async function validateProjectKey(
  sb: SupabaseClient,
  key: string
): Promise<ProjectIdentity> {
  if (!key) {
    throw new UnauthorizedError("Missing project key.");
  }

  // We compare in SQL so the bcrypt config used at mint time is reused
  // automatically. `crypt(plaintext, stored_hash) = stored_hash` is the
  // bcrypt verify idiom.
  const { data, error } = await sb.rpc("validate_project_key", {
    p_project_key: key,
  });

  if (error) {
    // Treat any RPC error as auth failure rather than leaking server
    // internals to the client. The full error is logged upstream.
    throw new UnauthorizedError();
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.project_id) {
    throw new UnauthorizedError();
  }

  return { projectId: row.project_id, orgId: row.org_id };
}
