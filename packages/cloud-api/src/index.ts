/**
 * ArchLens Cloud API — entry point.
 *
 * Boots a Fastify server, validates env vars, registers routes, and
 * wires a single error handler so every thrown ApiError serializes
 * to a consistent JSON response. Unknown errors become 500s with a
 * generic message (the real one is still logged).
 */

// Load .env BEFORE any other import that might read process.env.
import "dotenv/config";

import Fastify from "fastify";
import cors from "@fastify/cors";
import { loadEnv } from "./env.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerAuditRoutes } from "./routes/audit.js";
import { ApiError } from "./lib/errors.js";

async function main(): Promise<void> {
  const env = loadEnv();

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport:
        process.env.NODE_ENV === "production"
          ? undefined
          : {
              target: "pino-pretty",
              options: { colorize: true, translateTime: "HH:MM:ss" },
            },
    },
    // The screenshots can be ~500 KB each; up to 100 per batch.
    bodyLimit: 100 * 1024 * 1024, // 100 MB
  });

  await app.register(cors, {
    origin:
      env.ALLOWED_ORIGINS === "*"
        ? true
        : env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()),
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-ArchLens-Key"],
  });

  // Global error handler: known ApiErrors → typed JSON; everything
  // else → 500 with the detail logged but not returned.
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ApiError) {
      return reply
        .status(err.statusCode)
        .send({ error: { code: err.code, message: err.message } });
    }
    req.log.error({ err }, "unhandled error");
    return reply
      .status(500)
      .send({ error: { code: "internal", message: "Internal server error." } });
  });

  registerHealthRoute(app);
  registerAuditRoutes(app, env);

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  app.log.info("ArchLens cloud API listening on port " + env.PORT);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
