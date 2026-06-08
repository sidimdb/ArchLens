/**
 * GET /health — liveness probe for uptime monitors and load balancers.
 * Intentionally trivial: no DB call, just confirms the process is up.
 */

import type { FastifyInstance } from "fastify";

export function registerHealthRoute(app: FastifyInstance): void {
  app.get("/health", async () => ({
    ok: true,
    service: "archlens-cloud-api",
    time: new Date().toISOString(),
  }));
}
