/**
 * <ArchLensProvider>
 *
 * The single component a host React Native app needs to wrap its
 * root in:
 *
 *   <ArchLensProvider>
 *     <YourApp />
 *   </ArchLensProvider>
 *
 * Behavior:
 * - In production builds (`__DEV__ === false`), the provider is a
 *   pass-through. It MUST add zero overhead to shipped apps.
 * - In dev builds, it sets up the session context, mounts the
 *   floating annotation button, the tap-catching annotation
 *   overlay, and the note input modal — all positioned over the
 *   host app.
 *
 * Phase 2 wires the full annotation flow end-to-end:
 *   FAB tap → overlay → element tap → screenshot + identify →
 *   pending state → NoteModal → saveAnnotation() → AsyncStorage.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, View } from "react-native";
import {
  ArchLensContext,
  type Annotation,
  type ArchLensContextValue,
  type PendingAnnotation,
} from "../state/context";
import {
  loadAnnotations,
  saveAnnotations,
  clearStoredAnnotations,
} from "../state/persistence";
import { exportAndShareSession } from "../export/share";
import { AnnotationOverlay } from "./AnnotationOverlay";
import { FloatingButton } from "./FloatingButton";
import { NoteModal } from "./NoteModal";
import { SessionMenu } from "./SessionMenu";

export interface ArchLensProviderProps {
  children: ReactNode;
  /**
   * Friendly project name shown in the exported report header.
   * Defaults to "Untitled project" if omitted.
   */
  projectName?: string;
  /**
   * Force ArchLens off even in development. By default the tool is
   * active whenever `__DEV__` is true and hidden in production. Some
   * teams ship a "staging" / "preview" build that is technically a
   * dev build (`__DEV__ === true`) but should look like a release —
   * set `disabled` for those so the floating button never appears.
   *
   * Defaults to false (active in dev). Often wired to an env flag,
   * e.g. `disabled={process.env.APP_ENV === "staging"}`.
   */
  disabled?: boolean;
}

export function ArchLensProvider({
  children,
  projectName,
  disabled = false,
}: ArchLensProviderProps): React.ReactElement {
  // Active only in dev builds, and only when not explicitly disabled.
  if (!__DEV__ || disabled) {
    return <>{children}</>;
  }
  return <DevProvider projectName={projectName}>{children}</DevProvider>;
}

function DevProvider({
  children,
  projectName,
}: ArchLensProviderProps): React.ReactElement {
  // appRef: wraps ONLY the host app's children. The annotation
  // overlay, session menu, and FAB are mounted as siblings of the
  // ref'd view (not children) so they don't end up in the screenshot
  // and don't confuse the inspector — when we ask "what's at (x, y)"
  // we want the underlying app component, not our overlay.
  const appRef = useRef<View | null>(null);

  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [pending, setPending] = useState<PendingAnnotation | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  // Hydrate from AsyncStorage on mount so a reviewer can resume a
  // previous session. Failures are silent — empty session is fine.
  useEffect(() => {
    let alive = true;
    void loadAnnotations().then((stored) => {
      if (alive && stored.length > 0) setAnnotations(stored);
    });
    return () => {
      alive = false;
    };
  }, []);

  const toggleAnnotating = useCallback((): void => {
    setIsAnnotating((prev) => !prev);
  }, []);

  const saveAnnotation = useCallback(
    async (note: string): Promise<void> => {
      if (!pending) return;

      const annotation: Annotation = {
        id: pending.id,
        capturedAt: pending.capturedAt,
        note,
        element: pending.element,
        screenshotBase64: pending.screenshotBase64,
        screenName: pending.screenName,
        screenDimensions: pending.screenDimensions,
      };

      setAnnotations((prev) => {
        const next = [...prev, annotation];
        // Persist outside React's commit so we don't block render.
        void saveAnnotations(next);
        return next;
      });
      setPending(null);
    },
    [pending]
  );

  const clearAnnotations = useCallback(async (): Promise<void> => {
    setAnnotations([]);
    await clearStoredAnnotations();
  }, []);

  const deleteAnnotation = useCallback(async (id: string): Promise<void> => {
    setAnnotations((prev) => {
      const next = prev.filter((a) => a.id !== id);
      void saveAnnotations(next);
      return next;
    });
  }, []);

  const updateAnnotationNote = useCallback(
    async (id: string, note: string): Promise<void> => {
      setAnnotations((prev) => {
        const next = prev.map((a) => (a.id === id ? { ...a, note } : a));
        void saveAnnotations(next);
        return next;
      });
    },
    []
  );

  const exportSession = useCallback(async (): Promise<void> => {
    await exportAndShareSession(annotations, {
      projectName: projectName ?? "Untitled project",
    });
  }, [annotations, projectName]);

  const value = useMemo<ArchLensContextValue>(
    () => ({
      isAnnotating,
      toggleAnnotating,
      pending,
      setPending,
      saveAnnotation,
      annotations,
      clearAnnotations,
      deleteAnnotation,
      updateAnnotationNote,
      exportSession,
    }),
    [
      isAnnotating,
      toggleAnnotating,
      pending,
      saveAnnotation,
      annotations,
      clearAnnotations,
      deleteAnnotation,
      updateAnnotationNote,
      exportSession,
    ]
  );

  return (
    <ArchLensContext.Provider value={value}>
      <View style={styles.outer} collapsable={false}>
        {/*
          appRef wraps just the host children. We use it for both
          screenshot capture AND element identification, so neither
          step picks up our overlay/FAB.
        */}
        <View style={styles.app} collapsable={false} ref={appRef}>
          {children}
        </View>
        <AnnotationOverlay rootRef={appRef} />
        <SessionMenu />
        <FloatingButton />
      </View>
      <NoteModal />
    </ArchLensContext.Provider>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  app: { flex: 1 },
});
