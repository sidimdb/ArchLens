/**
 * POST /v1/audit-sessions
 *
 * The single device-facing endpoint of the API. Receives one audit
 * session (a batch of issues captured by one reviewer in one go),
 * validates the project key in the `X-ArchLens-Key` header, uploads
 * each screenshot to Supabase Storage, and inserts each issue row.
 *
 * Per-issue failures don't abort the batch — they're returned in the
 * response so the SDK can mark individual rows for retry while the
 * good ones stay synced.
 *
 * Idempotency: re-submitting the same (project, clientId) is a no-op
 * (returns the existing issue id) — safe to retry the entire batch
 * after a network blip.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Env } from "../env.js";
import { getServiceSupabase } from "../supabase.js";
import { validateProjectKey } from "../lib/project-key.js";
import { uploadScreenshot } from "../lib/storage.js";
import { BadRequestError, UnauthorizedError } from "../lib/errors.js";
import type {
  IssueResult,
  SubmitAuditSessionResponse,
} from "../types.js";

const BoundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
});

const ScreenDimsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});

const IssueSchema = z.object({
  clientId: z.string().min(1).max(120),
  note: z.string().max(4000).default(""),
  category: z.string().max(40).nullable().optional(),
  screenName: z.string().min(1).max(120).default("unknown"),
  componentName: z.string().min(1).max(160).default("unknown"),
  sourceFile: z.string().max(500).nullable().optional(),
  sourceLine: z.number().int().positive().nullable().optional(),
  bounds: BoundsSchema,
  screenDimensions: ScreenDimsSchema,
  capturedAt: z.string().datetime({ offset: true }),
  // Up to ~6MB base64 ≈ ~4.5MB binary. Anything bigger should be
  // resized client-side before submit.
  screenshotBase64: z.string().min(1).max(8_000_000),
  // Component-name breadcrumb (root → selected element). Optional
  // for backwards-compat with older SDKs that don't send it.
  hierarchyPath: z.array(z.string().max(160)).max(40).optional(),
  elementType: z.string().max(40).nullable().optional(),
  // Device fingerprint. All optional / nullable so an older SDK or
  // a bare-RN customer without expo-device still submits cleanly.
  osName: z.string().max(40).nullable().optional(),
  osVersion: z.string().max(40).nullable().optional(),
  deviceBrand: z.string().max(80).nullable().optional(),
  deviceModel: z.string().max(120).nullable().optional(),
});

const SessionSchema = z.object({
  deviceLabel: z.string().max(200).optional(),
  appVersion: z.string().max(80).optional(),
  reviewerLabel: z.string().max(120).optional(),
  issues: z.array(IssueSchema).min(1).max(100),
});

export function registerAuditRoutes(app: FastifyInstance, env: Env): void {
  const sb = getServiceSupabase(env);

  app.post("/v1/audit-sessions", async (req, reply) => {
    // ---- Auth ----------------------------------------------------
    const rawKey = req.headers["x-archlens-key"];
    const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;
    if (!key) {
      throw new UnauthorizedError("Missing X-ArchLens-Key header.");
    }
    const identity = await validateProjectKey(sb, key);

    // ---- Body ----------------------------------------------------
    const parsed = SessionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.issues
          .map((i) => i.path.join(".") + ": " + i.message)
          .join("; ")
      );
    }
    const { issues, deviceLabel, appVersion, reviewerLabel } = parsed.data;

    // ---- Open a session -----------------------------------------
    const sessionInsert = await sb
      .from("audit_sessions")
      .insert({
        project_id: identity.projectId,
        device_label: deviceLabel ?? null,
        app_version: appVersion ?? null,
        reviewer_label: reviewerLabel ?? null,
      })
      .select("id")
      .single();
    if (sessionInsert.error || !sessionInsert.data) {
      req.log.error(
        { err: sessionInsert.error },
        "could not create audit_sessions row"
      );
      throw new Error("Failed to open audit session.");
    }
    const sessionId: string = sessionInsert.data.id;

    // ---- Upload + insert per issue ------------------------------
    const results: IssueResult[] = [];
    for (const issue of issues) {
      try {
        // Idempotency: if this client_id already exists for this
        // project, return the existing issue id and skip the upload.
        const existing = await sb
          .from("issues")
          .select("id")
          .eq("project_id", identity.projectId)
          .eq("client_id", issue.clientId)
          .maybeSingle();
        if (existing.data) {
          results.push({
            clientId: issue.clientId,
            status: "synced",
            issueId: existing.data.id,
          });
          continue;
        }

        const path = await uploadScreenshot(
          sb,
          identity.projectId,
          issue.clientId,
          issue.screenshotBase64
        );

        const inserted = await sb
          .from("issues")
          .insert({
            session_id: sessionId,
            project_id: identity.projectId,
            client_id: issue.clientId,
            note: issue.note,
            category: issue.category ?? null,
            screen_name: issue.screenName,
            component_name: issue.componentName,
            source_file: issue.sourceFile ?? null,
            source_line: issue.sourceLine ?? null,
            bounds: issue.bounds,
            screen_dims: issue.screenDimensions,
            screenshot_path: path,
            captured_at: issue.capturedAt,
            hierarchy_path: issue.hierarchyPath ?? [],
            element_type: issue.elementType ?? null,
            os_name: issue.osName ?? null,
            os_version: issue.osVersion ?? null,
            device_brand: issue.deviceBrand ?? null,
            device_model: issue.deviceModel ?? null,
          })
          .select("id")
          .single();
        if (inserted.error || !inserted.data) {
          throw new Error(
            inserted.error?.message ?? "Insert returned no row"
          );
        }
        results.push({
          clientId: issue.clientId,
          status: "synced",
          issueId: inserted.data.id,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);
        req.log.warn(
          { err, clientId: issue.clientId },
          "issue submit failed"
        );
        results.push({
          clientId: issue.clientId,
          status: "failed",
          error: message,
        });
      }
    }

    const response: SubmitAuditSessionResponse = { sessionId, results };
    return reply.status(201).send(response);
  });
}
