/**
 * Content signal — derived purely from AST facts.
 *
 * These are the cheapest reliable inferences we can draw without
 * looking at paths or names:
 *
 *   - A file that calls `createContext()` is almost certainly state.
 *   - A file that calls a navigator factory (`createStackNavigator`
 *     etc.) is navigation.
 *   - A file with JSX + a React hook pattern is UI (component/screen),
 *     but content alone can't tell them apart — folder/filename do.
 *   - A file with network calls and NO JSX is a service.
 *
 * We emit at most ONE signal per file to keep scoring predictable.
 * If multiple apply, the first match (highest priority) wins.
 */

import { AstFacts, ClassificationSignal } from "../../types";

export function contentSignal(facts: AstFacts): ClassificationSignal | null {
  // Navigation beats everything: createStackNavigator / createBottomTabNavigator / …
  if (facts.navigatorFactoryCalls > 0) {
    return {
      source: "content",
      layer: "navigation",
      confidence: "high",
      reason: `${facts.navigatorFactoryCalls} navigator factory call(s) (createStackNavigator et al.)`,
    };
  }

  // State via createContext — typical of `XyzContext.tsx`.
  if (facts.createContextCalls > 0) {
    return {
      source: "content",
      layer: "state",
      confidence: "high",
      reason: `${facts.createContextCalls} createContext() call(s)`,
    };
  }

  // Service: network calls AND no JSX (rule 5 also cares about this).
  if (facts.networkCalls.length > 0 && !facts.hasJsx) {
    return {
      source: "content",
      layer: "service",
      confidence: "medium",
      reason: `${facts.networkCalls.length} HTTP call(s) and no JSX`,
    };
  }

  // File with JSX but no other cue → component (low, a folder/filename
  // signal, if any, will override). We don't fire when facts are empty
  // because of a parse error.
  if (facts.hasJsx && !facts.parseError) {
    return {
      source: "content",
      layer: "component",
      confidence: "low",
      reason: "file contains JSX",
    };
  }

  return null;
}
