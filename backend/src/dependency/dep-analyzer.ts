/**
 * Dependency analyzer.
 *
 * Uses `madge` to build the dependency graph of the project and
 * extract circular dependency cycles. Madge understands module
 * resolution (extensions, index files, TS paths) far better than
 * anything we'd build from the raw import strings, which is why we
 * delegate to it rather than rolling our own.
 */

import madge from "madge";

export interface DependencyResult {
  circular: string[][];
  /** File count as seen by madge — useful as a sanity check. */
  moduleCount: number;
  /** True if madge failed (no graph), rules then fall back to low confidence. */
  failed: boolean;
  errorMessage?: string;
}

export async function analyzeDependencies(
  rootPath: string
): Promise<DependencyResult> {
  try {
    const res = await madge(rootPath, {
      fileExtensions: ["js", "jsx", "ts", "tsx"],
      excludeRegExp: [
        /node_modules/,
        /(^|\/)(android|ios|build|dist|coverage)\//,
        /\.d\.ts$/,
      ],
      detectiveOptions: {
        ts: { skipTypeImports: true, mixedImports: true },
        tsx: { skipTypeImports: true, mixedImports: true },
      },
    });
    return {
      circular: res.circular(),
      moduleCount: Object.keys(res.obj()).length,
      failed: false,
    };
  } catch (err) {
    return {
      circular: [],
      moduleCount: 0,
      failed: true,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}
