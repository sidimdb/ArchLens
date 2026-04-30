/**
 * Navigation-registration signal.
 *
 * This is the strongest non-path signal we have. We look at every
 * file that acts as a react-navigation container (detected by
 * `createStackNavigator`/`Stack.Navigator` JSX) and emit a signal
 * for every identifier it registers via `component={X}`. Those
 * identifiers ARE screens by definition, regardless of where they
 * live in the project.
 *
 * We resolve identifiers to files by matching against each file's
 * default-exported name, AST facts captured earlier.
 *
 * This is the key fix for projects that don't use `/screens/` —
 * they still have a navigator that registers screens by name, and
 * that gives us ground truth.
 */

import { AstFacts, ClassificationSignal } from "../../types";

/**
 * Given all AST facts for the project, return a map of
 * `file path → navigation signal` for every file that is
 * registered as a screen somewhere.
 *
 * Also returns the set of files that itself declares a navigator
 * (for the navigation layer signal), so the classifier doesn't
 * mis-label them as screens just because they define the graph.
 */
export function collectNavigationSignals(
  astByPath: Map<string, AstFacts>
): Map<string, ClassificationSignal> {
  const signals = new Map<string, ClassificationSignal>();

  // Set of identifiers registered anywhere as screens.
  const registeredNames = new Set<string>();
  for (const facts of astByPath.values()) {
    for (const name of facts.navigationRegistrations) {
      registeredNames.add(name);
    }
  }
  if (registeredNames.size === 0) return signals;

  // Build reverse index: defaultExportName → file path.
  // If two files export the same default name (unlikely but possible)
  // the last one wins; that's fine for a best-effort heuristic.
  const byExport = new Map<string, string>();
  for (const [path, facts] of astByPath) {
    if (facts.defaultExportName) {
      byExport.set(facts.defaultExportName, path);
    }
  }

  for (const name of registeredNames) {
    const targetPath = byExport.get(name);
    if (!targetPath) continue;
    // Don't overwrite a navigator file's own screen-registration.
    const targetFacts = astByPath.get(targetPath);
    if (targetFacts && targetFacts.navigatorFactoryCalls > 0) continue;

    signals.set(targetPath, {
      source: "navigation",
      layer: "screen",
      confidence: "high",
      reason: `registered as a screen via component={${name}} in a navigator`,
    });
  }

  return signals;
}
