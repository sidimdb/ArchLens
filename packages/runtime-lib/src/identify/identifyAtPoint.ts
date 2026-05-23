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

/**
 * Interactive host components. For a UX audit, the reviewer almost
 * always means the tappable element — a button, a toggle — not its
 * inner <Text> label and not the whole screen that contains it. So
 * we treat these as first-class selectable targets even though they
 * are host primitives.
 */
const INTERACTIVE_NAMES = new Set([
  "Pressable",
  "TouchableOpacity",
  "TouchableHighlight",
  "TouchableWithoutFeedback",
  "TouchableNativeFeedback",
  "Button",
  "Switch",
  "TextInput",
]);

function isInteractive(entry: InspectorEntry): boolean {
  return !!entry.name && INTERACTIVE_NAMES.has(entry.name);
}

/**
 * Screen / page / navigator level components. These are user
 * components but they're too broad to be a useful annotation target
 * on their own — if we can find anything more specific, we prefer it.
 * Heuristic: RN screens conventionally end in Screen / Page / View
 * (as in HomeView) / Navigator / Tab.
 */
function isScreenLike(entry: InspectorEntry): boolean {
  const n = entry.name ?? "";
  return /(?:Screen|Page|Navigator|Tab)$/.test(n);
}

/**
 * Pick the best annotation target from the inspector hierarchy
 * (ordered root → leaf). Priority, in order:
 *
 *   1. Deepest specific user component WITH source — e.g. a custom
 *      <SaveButton> from SaveButton.tsx:42. Best case: specific AND
 *      carries the source file the developer needs. Screen-level
 *      components are excluded here so we don't grab the whole page.
 *   2. Deepest interactive host — <Pressable>, <Button>, <Switch>,
 *      etc. Catches bare buttons that aren't wrapped in a custom
 *      component, instead of falling all the way back to the screen.
 *   3. Deepest user component with source, INCLUDING screens — the
 *      original behavior; fires when the tap landed on bare screen
 *      content with nothing more specific around it.
 *   4. Any user component.
 *   5. The leaf, whatever it is.
 */
function pickBestEntry(hierarchy: InspectorEntry[]): InspectorEntry | null {
  if (hierarchy.length === 0) return null;

  // Pass 1: deepest specific (non-screen) user component with source.
  for (let i = hierarchy.length - 1; i >= 0; i--) {
    const entry = hierarchy[i]!;
    if (
      isUserComponent(entry) &&
      entry.source?.fileName &&
      !isScreenLike(entry)
    ) {
      return entry;
    }
  }

  // Pass 2: deepest interactive host element.
  for (let i = hierarchy.length - 1; i >= 0; i--) {
    if (isInteractive(hierarchy[i]!)) return hierarchy[i]!;
  }

  // Pass 3: deepest user component with source (screens included).
  for (let i = hierarchy.length - 1; i >= 0; i--) {
    const entry = hierarchy[i]!;
    if (isUserComponent(entry) && entry.source?.fileName) return entry;
  }

  // Pass 4: any user component, even without source.
  for (let i = hierarchy.length - 1; i >= 0; i--) {
    if (isUserComponent(hierarchy[i]!)) return hierarchy[i]!;
  }

  // Pass 5: leaf, even if it's a host primitive.
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

// ---------------------------------------------------------------------------
// Hierarchy traversal (live element inspector)
// ---------------------------------------------------------------------------
//
// Instead of collapsing the inspector hierarchy down to a single
// auto-picked entry, `identifyHierarchyAtPoint` returns the whole
// chain of meaningful ancestors — leaf-most first — so the UI can let
// the reviewer step "up" (broader) and "down" (more specific) just
// like a browser's element inspector. Each candidate carries its own
// measured bounds so the highlight box can redraw at every level.

/** Result of a hierarchy probe. */
export interface HierarchyPick {
  /** Candidates ordered leaf → root. Index 0 = most specific. */
  candidates: ElementInfo[];
  /** Index of the auto-selected "best" candidate to start on. */
  bestIndex: number;
}

/**
 * Host primitives that are still meaningful UX targets in their own
 * right (a text label, an image). Combined with interactive hosts and
 * user components, these form the set of levels worth stepping
 * through — plain layout wrappers (View, ScrollView, SafeAreaView…)
 * are filtered out so traversal feels intentional.
 */
const MEANINGFUL_HOSTS = new Set<string>([
  ...INTERACTIVE_NAMES,
  "Text",
  "Image",
  "ImageBackground",
]);

function isMeaningful(entry: InspectorEntry): boolean {
  if (isUserComponent(entry)) return true;
  return entry.name ? MEANINGFUL_HOSTS.has(entry.name) : false;
}

function frameToBounds(frame: {
  left: number;
  top: number;
  width: number;
  height: number;
}): ElementBounds {
  return {
    x: frame.left,
    y: frame.top,
    width: frame.width,
    height: frame.height,
  };
}

/**
 * Resolve a single entry's on-screen bounds. Prefers a fresh
 * `measure()` (gives page coordinates), then the entry's own static
 * `frame`, then the supplied fallback. Capped at 120ms so a slow or
 * silent measure can't stall the whole probe.
 */
function measureEntry(
  entry: InspectorEntry,
  fallback: ElementBounds
): Promise<ElementBounds> {
  return new Promise((resolve) => {
    const fromFrame = entry.frame ? frameToBounds(entry.frame) : fallback;
    if (typeof entry.measure !== "function") {
      resolve(fromFrame);
      return;
    }
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve(fromFrame);
    }, 120);
    try {
      entry.measure((_x, _y, width, height, pageX, pageY) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (
          typeof pageX === "number" &&
          typeof pageY === "number" &&
          width > 0 &&
          height > 0
        ) {
          resolve({ x: pageX, y: pageY, width, height });
        } else {
          resolve(fromFrame);
        }
      });
    } catch {
      clearTimeout(timer);
      resolve(fromFrame);
    }
  });
}

/**
 * Pick the starting index within a filtered (root → leaf) list, using
 * the same priority order as `pickBestEntry`. Returns a root→leaf
 * index; the caller flips it to the leaf→root ordering it returns.
 */
function pickBestIndexRootToLeaf(filtered: InspectorEntry[]): number {
  // Pass 1: deepest specific (non-screen) user component with source.
  for (let i = filtered.length - 1; i >= 0; i--) {
    const e = filtered[i]!;
    if (isUserComponent(e) && e.source?.fileName && !isScreenLike(e)) return i;
  }
  // Pass 2: deepest interactive host.
  for (let i = filtered.length - 1; i >= 0; i--) {
    if (isInteractive(filtered[i]!)) return i;
  }
  // Pass 3: deepest user component with source (screens included).
  for (let i = filtered.length - 1; i >= 0; i--) {
    const e = filtered[i]!;
    if (isUserComponent(e) && e.source?.fileName) return i;
  }
  // Pass 4: any user component.
  for (let i = filtered.length - 1; i >= 0; i--) {
    if (isUserComponent(filtered[i]!)) return i;
  }
  // Pass 5: the leaf.
  return filtered.length - 1;
}

async function buildHierarchyPick(
  data: InspectorResult,
  x: number,
  y: number
): Promise<HierarchyPick> {
  const single = (): HierarchyPick => ({
    candidates: [degradedFallback(x, y)],
    bestIndex: 0,
  });

  const hierarchy = data.hierarchy ?? [];
  let filtered = hierarchy.filter(isMeaningful);
  if (filtered.length === 0 && hierarchy.length > 0) {
    filtered = [hierarchy[hierarchy.length - 1]!];
  }
  if (filtered.length === 0) return single();

  const fallbackBounds: ElementBounds = {
    x: x - 16,
    y: y - 16,
    width: 32,
    height: 32,
  };
  const dataFallback = data.frame ? frameToBounds(data.frame) : fallbackBounds;

  const boundsList = await Promise.all(
    filtered.map((e) => measureEntry(e, dataFallback))
  );

  const rootToLeaf: ElementInfo[] = filtered.map((e, i) => ({
    componentName: e.name ?? "unknown",
    fileName: e.source?.fileName,
    lineNumber: e.source?.lineNumber,
    bounds: boundsList[i]!,
  }));

  const bestRoot = pickBestIndexRootToLeaf(filtered);

  // Return leaf → root so index 0 is the most specific element.
  const candidates = [...rootToLeaf].reverse();
  const bestIndex = rootToLeaf.length - 1 - bestRoot;

  return { candidates, bestIndex };
}

/**
 * Probe the full ancestor chain at a screen point. Always resolves —
 * on web, missing inspector, or detached ref it returns a single
 * coordinates-only candidate so the caller can still proceed.
 */
export function identifyHierarchyAtPoint(
  rootRef: RefObject<View | null>,
  x: number,
  y: number
): Promise<HierarchyPick> {
  return new Promise((resolve) => {
    const single = (): HierarchyPick => ({
      candidates: [degradedFallback(x, y)],
      bestIndex: 0,
    });

    const fn = loadInspector();
    if (!fn || !rootRef.current) {
      resolve(single());
      return;
    }

    let settled = false;
    const safeResolve = (v: HierarchyPick): void => {
      if (settled) return;
      settled = true;
      resolve(v);
    };

    const timeoutId = setTimeout(() => safeResolve(single()), 700);

    try {
      fn(rootRef.current, x, y, (data) => {
        clearTimeout(timeoutId);
        buildHierarchyPick(data, x, y).then(safeResolve, () =>
          safeResolve(single())
        );
      });
    } catch {
      clearTimeout(timeoutId);
      safeResolve(single());
    }
  });
}
