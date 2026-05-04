/**
 * Local input source.
 *
 * Accepts either:
 *   - a path to a directory already on disk (used by the CLI), or
 *   - an in-memory zip buffer (used by the HTTP upload endpoint).
 *
 * Every input source must end in a concrete temporary directory
 * that the rest of the pipeline can walk and feed to madge.
 */

import AdmZip from "adm-zip";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const MAX_ZIP_BYTES = 50 * 1024 * 1024;

export interface PreparedSource {
  /** Absolute path to the project root on disk. */
  rootPath: string;
  /** Human-readable name for the project (repo name, zip name, folder name). */
  rootName: string;
  /** Called when analysis is done. A no-op if the directory is user-owned. */
  cleanup(): Promise<void>;
}

/**
 * Wrap a pre-existing directory. Nothing is copied or deleted.
 */
export function fromExistingDirectory(dirPath: string): PreparedSource {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    throw new Error(`Not a directory: ${dirPath}`);
  }
  return {
    rootPath: path.resolve(dirPath),
    rootName: path.basename(path.resolve(dirPath)),
    cleanup: async () => {
      /* user-owned — do not delete */
    },
  };
}

/**
 * Extract a zip buffer into a new temporary directory. If the archive
 * wraps everything in a single top-level folder (as GitHub archives do),
 * that wrapper is returned as the root so analyzers don't see it.
 */
export async function fromZipBuffer(
  zipBuffer: Buffer,
  displayName = "uploaded"
): Promise<PreparedSource> {
  if (zipBuffer.length > MAX_ZIP_BYTES) {
    throw new Error(
      `Archive exceeds ${Math.floor(MAX_ZIP_BYTES / 1024 / 1024)} MB limit.`
    );
  }

  const tempRoot = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "rn-arch-")
  );

  try {
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(tempRoot, /* overwrite */ true);
  } catch (err) {
    await fs.promises.rm(tempRoot, { recursive: true, force: true });
    throw new Error(
      `Invalid zip archive: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Detect and drill into a single wrapping folder (common with GitHub zips).
  const entries = await fs.promises.readdir(tempRoot, { withFileTypes: true });
  let projectRoot = tempRoot;
  let rootName = displayName;
  if (entries.length === 1 && entries[0].isDirectory()) {
    projectRoot = path.join(tempRoot, entries[0].name);
    rootName = entries[0].name;
  }

  return {
    rootPath: projectRoot,
    rootName,
    cleanup: async () => {
      await fs.promises.rm(tempRoot, { recursive: true, force: true });
    },
  };
}
