/**
 * Export an annotation session and hand it to the system share sheet.
 *
 * Strategy:
 *   1. Build the Markdown report and a sidecar JSON file (also a
 *      ZIP-able pair of after-screenshot directories in Phase 4+).
 *   2. Write both files to expo-file-system's documentDirectory so
 *      they have real file URIs the share sheet can hand to other
 *      apps (Mail, Files, Drive, etc.).
 *   3. Open expo-sharing's share sheet pointed at the .md.
 *
 * Fallbacks:
 *   - If expo-file-system / expo-sharing aren't installed (e.g. a
 *     bare RN app without Expo), we fall back to RN's built-in
 *     Share API and ship the report as plain text. The reviewer
 *     can paste it into anywhere they like.
 *   - If a session has zero annotations, we still produce a report
 *     (it'll just be the header + the "nothing captured" notice).
 */

import { Share } from "react-native";
import type { Annotation } from "../state/context";
import {
  buildMarkdownReport,
  type MarkdownExportOptions,
} from "./markdown";

/* ---------- module loaders (lazy, optional) ---------- */

interface ExpoFileSystem {
  documentDirectory: string | null;
  writeAsStringAsync: (
    uri: string,
    content: string,
    options?: { encoding?: string }
  ) => Promise<void>;
}

interface ExpoSharing {
  isAvailableAsync: () => Promise<boolean>;
  shareAsync: (
    uri: string,
    options?: { mimeType?: string; dialogTitle?: string; UTI?: string }
  ) => Promise<void>;
}

let fileSystem: ExpoFileSystem | null | undefined;
let sharing: ExpoSharing | null | undefined;

function loadFileSystem(): ExpoFileSystem | null {
  if (fileSystem !== undefined) return fileSystem;
  try {
    const mod = require("expo-file-system");
    fileSystem = (mod && (mod.default || mod)) as ExpoFileSystem;
  } catch {
    fileSystem = null;
  }
  return fileSystem;
}

function loadSharing(): ExpoSharing | null {
  if (sharing !== undefined) return sharing;
  try {
    const mod = require("expo-sharing");
    sharing = (mod && (mod.default || mod)) as ExpoSharing;
  } catch {
    sharing = null;
  }
  return sharing;
}

/* ---------- public API ---------- */

export interface ExportResult {
  /** Path to the written .md file (file:// URI), or null on fallback. */
  markdownUri: string | null;
  /** Path to the sidecar .json file, or null on fallback. */
  jsonUri: string | null;
  /** True if the system share sheet was opened. */
  shared: boolean;
  /** True if we fell back to RN's text-only Share API. */
  fellBackToTextShare: boolean;
}

/**
 * Build the report and open a share sheet (or fall back to plain
 * text share). Returns metadata about what happened so the UI can
 * tell the reviewer where the file went.
 */
export async function exportAndShareSession(
  annotations: Annotation[],
  options: MarkdownExportOptions = {}
): Promise<ExportResult> {
  const markdown = buildMarkdownReport(annotations, options);
  const json = buildJsonSidecar(annotations, options);

  const fs = loadFileSystem();
  const share = loadSharing();

  // Best path: write files to disk, open native share sheet.
  if (fs && fs.documentDirectory && share) {
    try {
      const stamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .slice(0, 19);
      const baseName = "ux-audit-" + stamp;
      const markdownUri = fs.documentDirectory + baseName + ".md";
      const jsonUri = fs.documentDirectory + baseName + ".json";

      await fs.writeAsStringAsync(markdownUri, markdown);
      await fs.writeAsStringAsync(jsonUri, json);

      const canShare = await share.isAvailableAsync();
      if (canShare) {
        await share.shareAsync(markdownUri, {
          mimeType: "text/markdown",
          dialogTitle: "Export ArchLens UX Audit",
        });
      }

      return {
        markdownUri,
        jsonUri,
        shared: canShare,
        fellBackToTextShare: false,
      };
    } catch {
      // Fall through to the text-only fallback below.
    }
  }

  // Fallback: RN's built-in Share API. Text only — fine for small
  // sessions but the reviewer loses the screenshots.
  await Share.share({
    title: "ArchLens UX Audit",
    message: markdown,
  });

  return {
    markdownUri: null,
    jsonUri: null,
    shared: true,
    fellBackToTextShare: true,
  };
}

/**
 * The same JSON payload buildMarkdownReport() embeds in its
 * appendix, but as a standalone string for the .json sidecar.
 */
function buildJsonSidecar(
  annotations: Annotation[],
  options: MarkdownExportOptions
): string {
  const slim = annotations.map((a) => ({
    id: a.id,
    capturedAt: a.capturedAt,
    note: a.note,
    element: a.element,
    screenName: a.screenName,
  }));

  const payload = {
    schema: "archlens-runtime-export@1",
    projectName: options.projectName ?? "Untitled project",
    sessionId: options.sessionId ?? "session_" + Date.now().toString(36),
    generatedAt: new Date().toISOString(),
    annotations: slim,
  };

  return JSON.stringify(payload, null, 2);
}
