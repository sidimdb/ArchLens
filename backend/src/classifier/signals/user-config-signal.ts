/**
 * User-config signal.
 *
 * If the evaluated project ships an `.evaluator.json` (or the user
 * passes a config through the API / CLI), it can override any other
 * signal. The config lists, per layer, an array of path globs or
 * substrings that must be treated as that layer.
 *
 * Example config:
 *   {
 *     "layers": {
 *       "screen":  ["src/features/*\/page.tsx"],
 *       "service": ["src/data-access/**"]
 *     }
 *   }
 *
 * We keep matching simple (substring + optional `*` wildcard) to
 * avoid pulling in a glob dependency for the MVP.
 */

import { ClassificationSignal, EvaluatorConfig, Layer, ScannedFile } from "../../types";

function globToRegExp(pattern: string): RegExp {
  // Escape regex specials, then turn `**` into `.*` and `*` into `[^/]*`.
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "::DOUBLESTAR::")
    .replace(/\*/g, "[^/]*")
    .replace(/::DOUBLESTAR::/g, ".*");
  return new RegExp("^" + escaped + "$");
}

export function userConfigSignal(
  file: ScannedFile,
  config: EvaluatorConfig | undefined
): ClassificationSignal | null {
  if (!config || !config.layers) return null;
  const normalizedPath = file.path.replace(/\\/g, "/");

  for (const [layer, patterns] of Object.entries(config.layers) as Array<
    [Layer, string[] | undefined]
  >) {
    if (!patterns || patterns.length === 0) continue;
    for (const pat of patterns) {
      const normalized = pat.replace(/\\/g, "/");
      const isGlob = normalized.includes("*");
      const hit = isGlob
        ? globToRegExp(normalized).test(normalizedPath)
        : normalizedPath.includes(normalized);
      if (hit) {
        return {
          source: "userConfig",
          layer,
          confidence: "high",
          reason: `matches user config '${pat}' for layer '${layer}'`,
        };
      }
    }
  }
  return null;
}
