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
import { AnnotationOverlay } from "./AnnotationOverlay";
import { FloatingButton } from "./FloatingButton";
import { NoteModal } from "./NoteModal";

export interface ArchLensProviderProps {
  children: ReactNode;
}

export function ArchLensProvider({
  children,
}: ArchLensProviderProps): React.ReactElement {
  if (!__DEV__) {
    return <>{children}</>;
  }
  return <DevProvider>{children}</DevProvider>;
}

function DevProvider({
  children,
}: ArchLensProviderProps): React.ReactElement {
  const rootRef = useRef<View | null>(null);

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

  const value = useMemo<ArchLensContextValue>(
    () => ({
      isAnnotating,
      toggleAnnotating,
      pending,
      setPending,
      saveAnnotation,
      annotations,
      clearAnnotations,
    }),
    [
      isAnnotating,
      toggleAnnotating,
      pending,
      saveAnnotation,
      annotations,
      clearAnnotations,
    ]
  );

  return (
    <ArchLensContext.Provider value={value}>
      <View style={styles.root} collapsable={false} ref={rootRef}>
        {children}
        <AnnotationOverlay rootRef={rootRef} />
        <FloatingButton />
      </View>
      <NoteModal />
    </ArchLensContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
