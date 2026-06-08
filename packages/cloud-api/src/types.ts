/**
 * Wire types shared between the API and the runtime SDK.
 *
 * Keep this file dependency-free so the SDK can copy the types (or we
 * publish them in a small shared package later) without dragging in
 * Fastify, Zod, etc.
 */

export interface IssueBoundsPayload {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenDimensionsPayload {
  width: number;
  height: number;
}

export interface SubmitIssuePayload {
  /** Stable on-device id (the annotation id). Used for idempotency. */
  clientId: string;
  note: string;
  category?: string | null;
  screenName: string;
  componentName: string;
  sourceFile?: string | null;
  sourceLine?: number | null;
  bounds: IssueBoundsPayload;
  screenDimensions: ScreenDimensionsPayload;
  capturedAt: string; // ISO timestamp
  /** Raw base64 PNG (without the `data:image/png;base64,` prefix). */
  screenshotBase64: string;
  /** Component-name breadcrumb, root → selected element. */
  hierarchyPath?: string[];
  /** Derived element kind: text / button / image / input / etc. */
  elementType?: string | null;
  /** Device fingerprint at capture time. */
  osName?: string | null;
  osVersion?: string | null;
  deviceBrand?: string | null;
  deviceModel?: string | null;
}

export interface SubmitAuditSessionRequest {
  deviceLabel?: string;
  appVersion?: string;
  reviewerLabel?: string;
  issues: SubmitIssuePayload[];
}

export interface IssueResult {
  clientId: string;
  status: "synced" | "failed";
  issueId?: string;
  error?: string;
}

export interface SubmitAuditSessionResponse {
  sessionId: string;
  results: IssueResult[];
}
