/**
 * Best-effort detection of the host app's current screen / route.
 *
 * If the app uses `@react-navigation/native`, we read the current
 * route name from its global navigation ref. If not, or if the ref
 * isn't ready, we return "unknown" — the annotation still goes
 * through, just without a screen label.
 *
 * We don't take a hard dependency on react-navigation. The library
 * is loaded lazily and any failure is swallowed.
 */

interface NavigationRef {
  isReady: () => boolean;
  getCurrentRoute: () => { name?: string } | undefined;
}

interface ReactNavigationModule {
  createNavigationContainerRef: () => NavigationRef;
}

let cachedRef: NavigationRef | null | undefined;

function loadRef(): NavigationRef | null {
  if (cachedRef !== undefined) return cachedRef;
  try {
    const mod = require("@react-navigation/native") as ReactNavigationModule;
    if (typeof mod.createNavigationContainerRef !== "function") {
      cachedRef = null;
      return cachedRef;
    }
    // The ref returned here is independent of the host app's ref —
    // we can't easily share theirs. Reading from a fresh ref returns
    // undefined unless the host app passes their ref to us. For
    // Phase 2, we return "unknown" if the host hasn't opted in.
    cachedRef = null;
  } catch {
    cachedRef = null;
  }
  return cachedRef;
}

/**
 * Returns the current screen name. Phase 2 always returns "unknown"
 * unless the host app explicitly registers a navigation ref via
 * `setNavigationRef()` below — most apps don't, and we don't want
 * to require it.
 */
export function getCurrentScreenName(): string {
  // If a host app has called setNavigationRef, use that.
  if (registeredRef && registeredRef.isReady()) {
    const route = registeredRef.getCurrentRoute();
    return route?.name ?? "unknown";
  }
  // Otherwise probe the lazy-loaded ref (which currently returns
  // null — kept here so future versions can hook in without changes).
  loadRef();
  return "unknown";
}

let registeredRef: NavigationRef | null = null;

/**
 * Optional opt-in for host apps that want screen names in their
 * exported reports. Pass the ref returned by
 * `createNavigationContainerRef()` and attach it to your
 * NavigationContainer.
 *
 * Example:
 *   const ref = createNavigationContainerRef();
 *   setNavigationRef(ref);
 *   <NavigationContainer ref={ref}>...
 */
export function setNavigationRef(ref: NavigationRef | null): void {
  registeredRef = ref;
}
