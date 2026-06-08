/**
 * Thin wrappers around the Supabase JS calls used by the dashboard.
 * Centralizing them keeps the route components focused on rendering.
 */

import { supabase } from "../supabase";
import type {
  IssueListItem,
  IssueRow,
  IssueStatus,
  ProjectRow,
} from "./types";

/** All issues for projects the signed-in user belongs to. */
export async function fetchIssues(): Promise<IssueListItem[]> {
  const { data, error } = await supabase
    .from("issues")
    .select("*, project:projects(id, name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as IssueListItem[];
}

/** A single issue + project, used for the detail view. */
export async function fetchIssue(id: string): Promise<IssueListItem | null> {
  const { data, error } = await supabase
    .from("issues")
    .select("*, project:projects(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as IssueListItem | null;
}

/** Update only triage fields — RLS + trigger block content edits. */
export async function updateIssueStatus(
  id: string,
  status: IssueStatus
): Promise<void> {
  const { error } = await supabase
    .from("issues")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Permanently delete an issue. Allowed only for org admins by the
 * `issues_delete` RLS policy — non-admins get a permission error.
 */
export async function deleteIssue(id: string): Promise<void> {
  const { error } = await supabase.from("issues").delete().eq("id", id);
  if (error) throw error;
}

/** Short-lived signed URL for a screenshot (private bucket). */
export async function signScreenshot(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("screenshots")
    .createSignedUrl(path, 60 * 5); // 5 minutes
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Projects the user can see (used for filtering / settings). */
export async function fetchProjects(): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProjectRow[];
}

/** Just so TS doesn't complain about an unused export. */
export type { IssueRow };
