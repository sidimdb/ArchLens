/**
 * AsyncStorage-backed persistence for annotation sessions.
 *
 * Each annotation gets saved as it's created so a reviewer can quit
 * the app mid-session without losing work. On the next dev launch,
 * the previous session is loaded back into memory.
 *
 * We store under one key:
 *   archlens.runtime.annotations.v1   → JSON array of Annotation
 *
 * Keys are versioned so we can change the on-disk schema later
 * without crashing on old data.
 */

import type { Annotation } from "./context";

const STORAGE_KEY = "archlens.runtime.annotations.v1";

/**
 * AsyncStorage is capped at roughly 6MB on Android by default. Past
 * that, writes silently fail and annotations are lost with no error.
 * We warn at a threshold below the real limit so the reviewer has
 * headroom to export before any loss happens.
 */
export const STORAGE_WARN_BYTES = 4_500_000; // ~4.5 MB
export const STORAGE_LIMIT_BYTES = 6_000_000; // ~6 MB (the real cap)

/**
 * Estimate the serialized byte size of a set of annotations — i.e.
 * roughly what they occupy in AsyncStorage. The base64 screenshots
 * dominate, so this is a close-enough estimate without serializing
 * twice in hot paths.
 */
export function estimateStorageBytes(annotations: Annotation[]): number {
  let total = 0;
  for (const a of annotations) {
    // Screenshot base64 is by far the largest field; each base64
    // char is ~1 byte. Add a small constant for the other metadata.
    total += (a.screenshotBase64?.length ?? 0) + (a.note?.length ?? 0) + 300;
  }
  return total;
}

interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

let storage: AsyncStorageLike | null | undefined;

function loadStorage(): AsyncStorageLike | null {
  if (storage !== undefined) return storage;
  try {
    const mod = require("@react-native-async-storage/async-storage");
    storage = (mod && (mod.default || mod)) as AsyncStorageLike;
  } catch {
    storage = null;
  }
  return storage;
}

export async function loadAnnotations(): Promise<Annotation[]> {
  const s = loadStorage();
  if (!s) return [];
  try {
    const raw = await s.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Annotation[]) : [];
  } catch {
    // Corrupt JSON or storage error — start fresh rather than crash.
    return [];
  }
}

export async function saveAnnotations(
  annotations: Annotation[]
): Promise<void> {
  const s = loadStorage();
  if (!s) return;
  try {
    await s.setItem(STORAGE_KEY, JSON.stringify(annotations));
  } catch {
    // Persistence is best-effort. In-memory state is the source of
    // truth during a session.
  }
}

export async function clearStoredAnnotations(): Promise<void> {
  const s = loadStorage();
  if (!s) return;
  try {
    await s.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
