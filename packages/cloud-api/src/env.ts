/**
 * Strongly-typed environment configuration.
 *
 * We validate the env at startup with Zod so a misconfigured deploy
 * fails immediately and loudly — instead of returning 500s later
 * because some required value was an empty string.
 */

import { z } from "zod";

const Schema = z.object({
  PORT: z
    .string()
    .default("3000")
    .transform((s) => Number.parseInt(s, 10))
    .pipe(z.number().int().positive()),
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(40, "SUPABASE_SERVICE_ROLE_KEY looks too short — paste the full JWT"),
  ALLOWED_ORIGINS: z.string().default("*"),
});

export type Env = z.infer<typeof Schema>;

export function loadEnv(): Env {
  const parsed = Schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => "  - " + i.path.join(".") + ": " + i.message)
      .join("\n");
    // Throw a clear error rather than dumping the raw Zod issue array.
    throw new Error(
      "Invalid environment configuration:\n" +
        issues +
        "\n\nSee .env.example for the required variables."
    );
  }
  return parsed.data;
}
