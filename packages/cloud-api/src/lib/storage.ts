/**
 * Uploads a screenshot to the Supabase `screenshots` bucket.
 *
 * We're using service_role here, so the upload bypasses RLS and the
 * "Storage API quirks with anonymous users" that bit us when we tried
 * client-side uploads. This is exactly the kind of "trusted server
 * action" that service_role is meant for.
 *
 * Path convention: `<project_id>/<issue_id>.png`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { InternalError } from "./errors.js";

const BUCKET = "screenshots";

function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, "base64");
}

export async function uploadScreenshot(
  sb: SupabaseClient,
  projectId: string,
  issueId: string,
  base64: string
): Promise<string> {
  const path = projectId + "/" + issueId + ".png";
  const bytes = base64ToBuffer(base64);

  const { error } = await sb.storage.from(BUCKET).upload(path, bytes, {
    contentType: "image/png",
    // upsert true so retries (after a partial failure) are idempotent.
    upsert: true,
  });
  if (error) {
    throw new InternalError("Screenshot upload failed: " + error.message);
  }
  return path;
}
