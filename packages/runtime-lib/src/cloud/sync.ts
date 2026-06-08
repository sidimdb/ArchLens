/**
 * Sync pipeline — sends pending annotations to the ArchLens cloud API.
 *
 * The device side is intentionally tiny: one HTTPS POST to our API,
 * which validates the project key and handles all Supabase work
 * server-side (with service_role). The device knows nothing about
 * Supabase — no auth, no storage, no SDK.
 *
 * Flow per "Submit to dashboard" press:
 *   1. Build a `SubmitAuditSessionRequest` payload from the pending
 *      annotations.
 *   2. POST it to `<apiUrl>/v1/audit-sessions` with the project key
 *      in the `X-ArchLens-Key` header.
 *   3. The API responds with a sessionId + per-issue `synced`/`failed`
 *      outcomes. We flip the UI badges accordingly.
 *
 * Idempotent: re-submitting an annotation with the same id is a no-op
 * server-side, so retrying after a partial failure is safe.
 */

import type { Annotation } from "../state/context";
import { getDeviceInfo } from "../integrations/device";

export interface CloudConfig {
  /** Base URL of the ArchLens cloud API, e.g. "https://api.archlens.io". */
  apiUrl: string;
  /** The project key created in the dashboard. */
  projectKey: string;
  /** Optional human label shown next to the audit session in the dashboard. */
  reviewerLabel?: string;
  /** Optional app version string (helps correlate fixes to builds). */
  appVersion?: string;
  /** Optional device label, e.g. "iPhone 15 · iOS 17.5". */
  deviceLabel?: string;
}

export type IssueSyncStatus = "submitting" | "synced" | "failed";

export interface IssueSyncProgress {
  annotationId: string;
  status: IssueSyncStatus;
  error?: string;
}

export interface SyncBatchResult {
  /** Server-issued session id this batch was attached to. */
  sessionId: string;
  /** Per-annotation outcome, in input order. */
  perIssue: IssueSyncProgress[];
}

interface ApiIssueResult {
  clientId: string;
  status: "synced" | "failed";
  issueId?: string;
  error?: string;
}

interface ApiResponse {
  sessionId: string;
  results: ApiIssueResult[];
}

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function toIssuePayload(ann: Annotation): Record<string, unknown> {
  // Same fingerprint for every issue in a batch, but submitted per
  // issue so the dashboard can filter by device without a join.
  const device = getDeviceInfo();
  return {
    clientId: ann.id,
    note: ann.note,
    category: ann.category ?? null,
    screenName: ann.screenName,
    componentName: ann.element.componentName,
    sourceFile: ann.element.fileName ?? null,
    sourceLine: ann.element.lineNumber ?? null,
    bounds: ann.element.bounds,
    screenDimensions: ann.screenDimensions,
    capturedAt: new Date(ann.capturedAt).toISOString(),
    screenshotBase64: ann.screenshotBase64,
    hierarchyPath: ann.hierarchyPath ?? [],
    elementType: ann.elementType ?? null,
    osName: device.osName,
    osVersion: device.osVersion,
    deviceBrand: device.deviceBrand,
    deviceModel: device.deviceModel,
  };
}

/**
 * Submit a batch of annotations to the cloud. Returns the new session
 * id plus a per-issue outcome list. Caller updates state by id.
 *
 * Throws on whole-batch failures (network, auth). Per-issue failures
 * are reported through the result and `onProgress`, not by throwing.
 */
export async function submitAnnotationsToCloud(
  annotations: Annotation[],
  config: CloudConfig,
  onProgress?: (p: IssueSyncProgress) => void
): Promise<SyncBatchResult> {
  if (!config.apiUrl || !config.projectKey) {
    throw new Error(
      "Cloud sync is not configured (missing apiUrl / projectKey)."
    );
  }

  // Emit a "submitting" event for each so badges flip live.
  for (const ann of annotations) {
    onProgress?.({ annotationId: ann.id, status: "submitting" });
  }

  const url = stripTrailingSlash(config.apiUrl) + "/v1/audit-sessions";
  const body = {
    deviceLabel: config.deviceLabel ?? null,
    appVersion: config.appVersion ?? null,
    reviewerLabel: config.reviewerLabel ?? null,
    issues: annotations.map(toIssuePayload),
  };

  // 20s hard timeout so an unreachable API doesn't hang the submit
  // forever — we want a clear "failed" the user can retry.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ArchLens-Key": config.projectKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (err) {
    clearTimeout(timeoutId);
    const message =
      "Network error reaching ArchLens API: " +
      (err instanceof Error ? err.message : String(err));
    for (const ann of annotations) {
      onProgress?.({
        annotationId: ann.id,
        status: "failed",
        error: message,
      });
    }
    throw new Error(message);
  }

  if (!response.ok) {
    let message = "API returned " + response.status;
    try {
      const body = (await response.json()) as ApiErrorBody;
      if (body.error?.message) message = body.error.message;
    } catch {
      /* leave the generic status-code message */
    }
    for (const ann of annotations) {
      onProgress?.({
        annotationId: ann.id,
        status: "failed",
        error: message,
      });
    }
    throw new Error(message);
  }

  const data = (await response.json()) as ApiResponse;

  const perIssue: IssueSyncProgress[] = data.results.map((r) => {
    const p: IssueSyncProgress = {
      annotationId: r.clientId,
      status: r.status,
      error: r.error,
    };
    onProgress?.(p);
    return p;
  });

  return { sessionId: data.sessionId, perIssue };
}
