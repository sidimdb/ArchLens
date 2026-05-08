/**
 * Element identification: given a touch point on the screen, figure
 * out which React component lives there, where its source file is,
 * and what its bounding box looks like.
 *
 * # How this works
 *
 * React Native ships an in-app inspector (the one you see when you
 * shake the device → "Show Inspector"). Internally it uses a private
 * helper, `getInspectorDataForViewAtPoint`, that:
 *
 *   1. Walks the host view tree from the root, finds the deepest
 *      view whose frame contains (x, y).
 *   2. Walks that view's React fiber upward, collecting every
 *      ancestor component and its `_debugSource` (the file:line the
 *      JSX came from, populated by `@babel/plugin-transform-react-jsx-source`
 *      in dev builds).
 *   3. Returns a hierarchy array, leaf-most first, with names and
 *      sources.
 *
 * We import that helper, run it for the tapped point, and pick the
 * deepest USER component (skipping host primitives like View/Text
 * and library wrappers without source info). That's the component
 * the reviewer actually meant to annotate.
 *
 * # Why this is a private import
 *
 * `getInspectorDataForViewAtPoint` is not part of the React Native
 * public API. The deep import path can change between RN versions.
 * We wrap the call in try/catch and gracefully degrade — if the
 * inspector helper isn't available, we still capture the screenshot
 * with a coordinates-only annotation (componentName: "unknown").
 *
 * Tested against React Native 0.76+. Older RN versions may break.
 */

import type { RefObject } from "react";
import type { View } from "react-native";
import type { ElementBounds, ElementInfo } from "../state/context";

/**
 * The shape returned by RN's inspector helper. We type it loosely —
 * the real type lives in RN's internals and we don't want to break
 * across minor versions.
 */
interface InspectorEntry {
  name?: string;
  source?: { fileName?: string; lineNumber?: number };
  measure?: (
    cb: (
      x: number,
      y: number,
      width: number,
      height: number,
      pageX: number,
      pageY: number
    ) => void
  ) => void;
  frame?: { left: number; top: number; width: number; height: number };
}

interface InspectorResult {
  hierarchy?: InspectorEntry[];
  /** Some RN versions return frame separately. */
  frame?: { left: number; top: number; width: number; height: number };
}

/**
 * Signature in RN 0.79+ takes a HostInstance (or null to start from
 * the root). In RN ≤0.78 it took a numeric tag. We pass `null` /
 * `undefined` which works in both: legacy versions ignored falsy
 * values and walked from root anyway.
 */
type InspectorFn = (
  rootHostInstance: unknown | null,
  x: number,
  y: number,
  cb: (data: InspectorResult) => void
) => void;

/** Lazy-load RN's inspector helper. Cache the result (or its absence). */
let inspectorFn: InspectorFn | null | undefined;

function loadInspector(): InspectorFn | null {
  if (inspectorFn !== undefined) return inspectorFn;

  // The inspector helper lives under different paths depending on
  // the RN version. We try the modern (0.79+) path first, then
  // fall back to the legacy (≤0.78) one. Each require is a string
  // literal — Metro rejects dynamic require(variable) calls.

  // Modern: RN 0.79+ moved it under src/private.
  try {
    const mod = require("react-native/src/private/devsupport/devmenu/elementinspector/getInspectorDataForViewAtPoint");
    const fn = (mod && (mod.default || mod)) as InspectorFn;
    if (typeof fn === "function") {
      inspectorFn = fn;
      return inspectorFn;
    }
  } catch {
    /* fall through */
  }

  // Legacy: RN ≤0.78.
  try {
    const mod = require("react-native/Libraries/Inspector/getInspectorDataForViewAtPoint");
    const fn = (mod && (mod.default || mod)) as InspectorFn;
    if (typeof fn === "function") {
      inspectorFn = fn;
      return inspectorFn;
    }
  } catch {
    /* fall through */
  }

  inspectorFn = null;
  return inspectorFn;
}

/**
 * Return true if a hierarchy entry looks like a user-defined
 * component (PascalCase) rather than a host primitive (lowercase
 * "View", "Text", "TextInput", "ScrollView"...).
 *
 * Host primitives in RN are exposed with PascalCase names too
 * (`View`, `Text`, etc.) so we use a small explicit denylist instead
 * of a regex. The point isn't to be perfect — it's to prefer the
 * component the reviewer actually meant to annotate, not its
 * <View> wrapper.
 */
const HOST_NAMES = new Set([
  "View",
  "Text",
  "TextInput",
  "ScrollView",
  "FlatList",
  "SectionList",
  "Image",
  "ImageBackground",
  "Pressable",
  "TouchableOpacity",
  "TouchableHighlight",
  "TouchableWithoutFeedback",
  "TouchableNativeFeedback",
  "Switch",
  "ActivityIndicator",
  "Modal",
  "SafeAreaView",
  "KeyboardAvoidingView",
  "RefreshControl",
  "StatusBar",
  "RCTView",
  "RCTText",
]);

function isUserComponent(entry: InspectorEntry): boolean {
  if (!entry.name) return false;
  if (HOST_NAMES.has(entry.name)) return false;
  // Rule out anonymous function names that some libraries leave behind.
  if (entry.name === "Anonymous" || entry.name === "Component") return false;
  return true;
}

/** Pick the most specific user component in the hierarchy. */
function pickBestEntry(hierarchy: InspectorEntry[]): InspectorEntry | null {
  if (hierarchy.length === 0) return null;

  // Walk leaf → root, return the first user component with source info.
  for (let i = hierarchy.length - 1; i >= 0; i--) {
    const entry = hierarchy[i]!;
    if (isUserComponent(entry) && entry.source?.fileName) return entry;
  }

  // Fallback 1: any user component, even without source.
  for (let i = hierarchy.length - 1; i >= 0; i--) {
    const entry = hierarchy[i]!;
    if (isUserComponent(entry)) return entry;
  }

  // Fallback 2: leaf, even if it's a host primitive.
  return hierarchy[hierarchy.length - 1] ?? null;
}

/**
 * Identify the component at a given screen-relative point.
 *
 * @param rootRef     A ref to the host app's root View. We need its
 *                    native tag so the inspector knows where to start
 *                    walking.
 * @param x, y        Touch coordinates in the same coordinate space
 *                    as the root View (typically pageX / pageY from
 *                    a touch event).
 *
 * @returns Element info, or null if identification failed entirely.
 *          Always returns null on web — RN's inspector is iOS/Android
 *          only.
 */
export function identifyAtPoint(
  rootRef: RefObject<View | null>,
  x: number,
  y: number
): Promise<ElementInfo | null> {
  return new Promise((resolve) => {
    const fn = loadInspector();
    if (!fn) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          "[archlens] inspector helper not available — annotations " +
            "will fall back to coordinates-only. RN private API may " +
            "have moved between versions."
        );
      }
      resolve(degradedFallback(x, y));
      return;
    }

    // RN 0.81's getInspectorDataForViewAtPoint reads
    // `__internalInstanceHandle` off the first argument and crashes
    // if it's null. We must pass the actual host instance — that's
    // what RN attaches to the ref's `.current` of a host primitive
    // <View> in dev builds.
    const hostInstance = rootRef.current;
    if (!hostInstance) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          "[archlens] root view ref isn't attached yet — falling " +
            "back to coordinates-only annotation."
        );
      }
      resolve(degradedFallback(x, y));
      return;
    }

    let settled = false;
    const safeResolve = (v: ElementInfo | null): void => {
      if (settled) return;
      settled = true;
      resolve(v);
    };

    // Some RN builds occasionally never invoke the callback. Cap the
    // wait at 500ms and fall back rather than hanging the UI.
    const timeoutId = setTimeout(
      () => safeResolve(degradedFallback(x, y)),
      500
    );

    try {
      fn(hostInstance, x, y, (data) => {
        clearTimeout(timeoutId);
        const hierarchy = data.hierarchy ?? [];

        if (__DEV__ && hierarchy.length === 0) {
          // eslint-disable-next-line no-console
          console.warn(
            "[archlens] inspector returned an empty hierarchy at (" +
              x +
              "," +
              y +
              "). The new RN architecture may not expose component " +
              "metadata in this build."
          );
        }

        const best = pickBestEntry(hierarchy);
        if (!best) {
          safeResolve(degradedFallback(x, y));
          return;
        }

        const fallbackBounds: ElementBounds = {
          x: x - 16,
          y: y - 16,
          width: 32,
          height: 32,
        };

        const dataFrame = data.frame ?? best.frame;
        const bounds: ElementBounds = dataFrame
          ? {
              x: dataFrame.left,
              y: dataFrame.top,
              width: dataFrame.width,
              height: dataFrame.height,
            }
          : fallbackBounds;

        safeResolve({
          componentName: best.name ?? "unknown",
          fileName: best.source?.fileName,
          lineNumber: best.source?.lineNumber,
          bounds,
        });
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          "[archlens] inspector call threw: " +
            (err instanceof Error ? err.message : String(err))
        );
      }
      safeResolve(degradedFallback(x, y));
    }
  });
}

/**
 * Produced when we can't identify the component (older RN, missing
 * source maps, etc.). The annotation still goes through — the
 * reviewer's note is the meaningful content; the component info is
 * a nice-to-have on top.
 */
function degradedFallback(x: number, y: number): ElementInfo {
  return {
    componentName: "unknown",
    bounds: { x: x - 16, y: y - 16, width: 32, height: 32 },
  };
}
