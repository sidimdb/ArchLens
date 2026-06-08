/**
 * Screenshot + element-highlight overlay.
 *
 * Renders the clean PNG (the file we actually store) with a blue box
 * drawn on top using the issue's `bounds` + `screen_dims`. Scales the
 * preview to fit within both a max-width AND a max-height so the
 * whole image is visible without scrolling on a typical laptop
 * window. Phones are taller than wide, so without the height cap the
 * preview was overflowing the viewport.
 */

import { useEffect, useState } from "react";
import { signScreenshot } from "../lib/queries";
import type { ElementBounds, ScreenDimensions } from "../lib/types";
import { Spinner } from "./Spinner";

export function ScreenshotPreview({
  screenshotPath,
  bounds,
  screenDims,
  maxWidth = 320,
  maxHeight = 600,
}: {
  screenshotPath: string;
  bounds: ElementBounds;
  screenDims: ScreenDimensions;
  maxWidth?: number;
  maxHeight?: number;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setUrl(null);
    setFailed(false);
    void signScreenshot(screenshotPath).then((u) => {
      if (!alive) return;
      if (u) setUrl(u);
      else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [screenshotPath]);

  // Fit inside the given box while preserving the phone's aspect
  // ratio. Take whichever of width-bound or height-bound shrinks the
  // image more.
  const aspect = Math.max(screenDims.width, 1) / Math.max(screenDims.height, 1);
  const widthFromMaxWidth = maxWidth;
  const widthFromMaxHeight = maxHeight * aspect;
  const previewWidth = Math.min(widthFromMaxWidth, widthFromMaxHeight);
  const previewHeight = previewWidth / aspect;
  const scale = previewWidth / Math.max(screenDims.width, 1);

  const box = {
    left: bounds.x * scale,
    top: bounds.y * scale,
    width: Math.max(bounds.width * scale, 4),
    height: Math.max(bounds.height * scale, 4),
  };

  return (
    <div
      className="relative bg-black rounded-md overflow-hidden border border-outline-variant shadow-sm"
      style={{ width: previewWidth, height: previewHeight }}
    >
      {url ? (
        <img
          src={url}
          alt="Captured screen"
          className="block"
          style={{ width: previewWidth, height: previewHeight }}
        />
      ) : failed ? (
        <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant text-body-sm">
          Screenshot unavailable
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </div>
      )}
      {/* Element highlight — drawn at render time from the stored
          bounds, not baked into the PNG. */}
      <div
        className="absolute border-2 border-status-info bg-status-info/20 pointer-events-none rounded-sm"
        style={box}
      />
    </div>
  );
}
