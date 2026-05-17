/**
 * HTTP entry point.
 *
 * Three endpoints:
 *   GET  /health           — liveness probe
 *   POST /analyze          — multipart .zip upload
 *   POST /analyze-github   — { url, token? }
 *
 * The heavy lifting lives in `pipeline.ts` — this file is just the
 * I/O boundary.
 */

import cors from "cors";
import "dotenv/config";
import * as path from "path";
import express, { Request, Response, NextFunction } from "express";
import multer from "multer";
import { fromGitHub } from "./input/github-source";
import { fromZipBuffer } from "./input/local-source";
import { runAnalysis } from "./pipeline";
import { suggestForViolation } from "./ai/suggestForViolation";

// Also load .env from the workspace root — the backend's own folder
// usually doesn't have one in the monorepo layout.
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

/** Truthy check on form / query / body fields like ?ai=1, "true", "yes". */
function flag(v: unknown): boolean {
  if (typeof v !== "string") return Boolean(v);
  return /^(1|true|yes|on)$/i.test(v.trim());
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "rn-arch-evaluator", version: "0.2.0" });
});

app.post(
  "/analyze",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "Please upload a .zip archive as the 'file' field.",
        });
      }
      if (!/\.zip$/i.test(req.file.originalname || "")) {
        return res
          .status(400)
          .json({ error: "Only .zip archives are supported." });
      }
      const source = await fromZipBuffer(
        req.file.buffer,
        req.file.originalname.replace(/\.zip$/i, "")
      );
      const ai = flag(req.body?.ai) || flag(req.query?.ai);
      const result = await runAnalysis(source, { ai });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

app.post("/analyze-github", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url, token } = req.body ?? {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing 'url' field." });
    }
    const source = await fromGitHub(url, { token });
    const ai = flag(req.body?.ai) || flag(req.query?.ai);
    const result = await runAnalysis(source, { ai });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /violations/suggest
 * Body: {
 *   projectName, ruleId, ruleName, ruleDescription,
 *   violation: { file, line?, severity, message }
 * }
 *
 * Generates a project-aware fix suggestion for ONE violation via
 * Claude. The frontend calls this lazily when a user opens the
 * ViolationDetailPanel, so cost stays proportional to actual
 * interest rather than report size.
 */
app.post(
  "/violations/suggest",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body ?? {};
      const v = body.violation ?? {};

      if (
        typeof body.projectName !== "string" ||
        typeof body.ruleId !== "string" ||
        typeof body.ruleName !== "string" ||
        typeof body.ruleDescription !== "string" ||
        typeof v.file !== "string" ||
        typeof v.severity !== "string" ||
        typeof v.message !== "string"
      ) {
        return res.status(400).json({
          error:
            "Invalid request body. Expected projectName, ruleId, ruleName, " +
            "ruleDescription, violation:{file, severity, message, line?}.",
        });
      }

      const suggestion = await suggestForViolation({
        projectName: body.projectName,
        ruleId: body.ruleId,
        ruleName: body.ruleName,
        ruleDescription: body.ruleDescription,
        violation: {
          file: v.file,
          line: typeof v.line === "number" ? v.line : undefined,
          severity: v.severity,
          message: v.message,
        },
      });

      res.json({ suggestion });
    } catch (err) {
      next(err);
    }
  }
);

// Central error handler — single place that shapes the user-facing
// error message and never leaks secrets (e.g. the GitHub token).
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const message = err.message || "Internal server error.";
  const status = /not found|invalid|parse|empty|exceed/i.test(message)
    ? 400
    : 500;
  // eslint-disable-next-line no-console
  console.error("[analyze] error:", message);
  res.status(status).json({ error: message });
});

const PORT = Number(process.env.PORT || 8000);
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[rn-arch-evaluator] listening on http://localhost:${PORT}`);
});
