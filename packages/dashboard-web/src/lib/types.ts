/**
 * Local TS shapes that mirror the Postgres tables. Hand-written for now;
 * later we could codegen from the schema if the surface grows.
 */

export type IssueStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "wont_fix";

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenDimensions {
  width: number;
  height: number;
}

export interface ProjectRow {
  id: string;
  org_id: string;
  name: string;
  created_at: string;
  archived_at: string | null;
}

export interface AuditSessionRow {
  id: string;
  project_id: string;
  device_label: string | null;
  app_version: string | null;
  reviewer_label: string | null;
  submitted_at: string;
}

export interface IssueRow {
  id: string;
  session_id: string;
  project_id: string;
  client_id: string;
  note: string;
  category: string | null;
  screen_name: string;
  component_name: string;
  source_file: string | null;
  source_line: number | null;
  bounds: ElementBounds;
  screen_dims: ScreenDimensions;
  screenshot_path: string;
  captured_at: string;
  status: IssueStatus;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  /** Breadcrumb of component names, root → selected element. */
  hierarchy_path: string[] | null;
  /** Derived element kind: "text" / "button" / "image" / etc. */
  element_type: string | null;
  /** Device fingerprint at capture time — null for older issues. */
  os_name: string | null;
  os_version: string | null;
  device_brand: string | null;
  device_model: string | null;
}

/** Issue + its project joined for the inbox list. */
export interface IssueListItem extends IssueRow {
  project: { id: string; name: string } | null;
}
