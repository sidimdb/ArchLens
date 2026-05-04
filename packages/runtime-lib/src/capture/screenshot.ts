/**
 * Thin wrapper around `react-native-view-shot`. We isolate the
 * capture mechanism here so the rest of the library doesn't care
 * which library or native API actually does it — if Expo ships a
 * better screencapture API later, we swap it inside this file.
 *
 * The exported function returns a base64-encoded PNG with no
 * data-URI prefix. The Markdown export later prepends
 * `data:image/png;base64,` when embedding inline.
 */

import type { RefObject } from "react";
import type { View } from "react-native";

interface ViewShotModule {
  captureRef: (
    view: unknown,
    options: {
      format?: "png" | "jpg";
      quality?: number;
      result?: "tmpfile" | "base64" | "data-uri";
    }
  ) => Promise<string>;
}

/**
 * Lazy-load view-shot. Cached. If the module isn't available
 * (developer didn't install it / Expo Go limitations), we throw a
 * clear error rather than crashing.
 */
let viewShot: ViewShotModule | null | undefined;

function loadViewShot(): ViewShotModule | null {
  if (viewShot !== undefined) return viewShot;

  try {
    const mod = require("react-native-view-shot");
    viewShot = (mod && (mod.default || mod)) as ViewShotModule;
  } catch {
    viewShot = null;
  }

  return viewShot;
}

export class ScreenshotUnavailableError extends Error {
  constructor() {
    super(
      "react-native-view-shot is not available. Install it in your app: " +
        "`npm install react-native-view-shot`. In Expo, you may also need a " +
        "custom development build — Expo Go does not ship native modules " +
        "by default."
    );
    this.name = "ScreenshotUnavailableError";
  }
}

/**
 * Capture the entire host app's view tree as a base64 PNG.
 *
 * @param rootRef Ref to the View we want to capture. Typically the
 *                root View inside <ArchLensProvider>, which contains
 *                the whole host app. The FAB and overlay live as
 *                siblings of that view, so they don't end up in the
 *                screenshot — exactly what we want.
 *
 * @returns Base64 PNG data, no data-URI prefix.
 */
export async function captureScreenshot(
  rootRef: RefObject<View | null>
): Promise<string> {
  const lib = loadViewShot();
  if (!lib) throw new ScreenshotUnavailableError();

  if (!rootRef.current) {
    throw new Error(
      "Cannot capture screenshot: ArchLens root ref is not attached. " +
        "Did <ArchLensProvider> mount correctly?"
    );
  }

  const base64 = await lib.captureRef(rootRef.current, {
    format: "png",
    quality: 0.9,
    result: "base64",
  });

  return base64;
}
