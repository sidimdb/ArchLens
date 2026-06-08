/**
 * <ArchLensProvider>
 *
 * The single component a host React Native app needs to wrap its
 * root in:
 *
 *   <ArchLensProvider
 *     projectKey="archlens_pk_live_..."
 *     apiUrl="https://api.archlens.io"
 *   >
 *     <YourApp />
 *   </ArchLensProvider>
 *
 * Behavior:
 * - By default the provider is active in dev builds and a no-op in
 *   production — so the App Store version of an app ships with zero
 *   audit-tool overhead.
 * - The `enabled` prop overrides this — set it `true` to keep the
 *   audit active in a production build (the "reviewer build" pattern:
 *   one signed build distributed via TestFlight / APK / EAS internal
 *   testing, with the env flag flipped on, sent to non-technical
 *   reviewers). Set `false` to force it off even in dev.
 * - Cloud config is optional. Without it, capture still works
 *   locally; the "Submit to dashboard" action just isn't available.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";
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
  estimateStorageBytes,
  STORAGE_WARN_BYTES,
} from "../state/persistence";
import { submitAnnotationsToCloud } from "../cloud/sync";
import { AnnotationOverlay } from "./AnnotationOverlay";
import { FloatingButton } from "./FloatingButton";
import { NoteModal } from "./NoteModal";
import { SessionMenu } from "./SessionMenu";

export interface ArchLensProviderProps {
  children: ReactNode;
  /**
   * Friendly project name shown alongside the session in the dashboard.
   * Optional metadata only.
   */
  projectName?: string;
  /**
   * Master switch for the audit tool.
   *
   *   - `undefined` (default): active iff `__DEV__` is true. The App
   *     Store version of your customer's app ships with the tool
   *     completely inert — zero overhead.
   *   - `true`: active regardless of `__DEV__`. Use this for the
   *     "reviewer build" — a production-signed build distributed
   *     via TestFlight / APK / EAS internal so non-technical clients
   *     can audit the real app.
   *   - `false`: inactive regardless of `__DEV__`. Use this to hide
   *     the tool in a staging build that should look like release.
   *
   * Typically wired to an env flag, e.g.
   * `enabled={process.env.EXPO_PUBLIC_ARCHLENS_AUDIT === "on"}`.
   */
  enabled?: boolean;

  // ── Cloud sync configuration ─────────────────────────────────────
  // Both required for sync to be enabled. Missing either =
  // capture-only mode (the Submit button is disabled with an
  // explanatory tooltip).
  /** Project key from the dashboard, e.g. "archlens_pk_live_…". */
  projectKey?: string;
  /** Base URL of the ArchLens cloud API, e.g. "https://api.archlens.io". */
  apiUrl?: string;
  /** Optional human label shown next to the audit session in the dashboard. */
  reviewerLabel?: string;
  /** Optional app version string shown in the dashboard (helps correlate fixes). */
  appVersion?: string;
}

export function ArchLensProvider(props: ArchLensProviderProps): React.ReactElement {
  // `enabled` is the master switch; default is `__DEV__` so prod
  // builds are pass-throughs unless someone opts in.
  const active = props.enabled === undefined ? __DEV__ : props.enabled;
  if (!active) {
    return <>{props.children}</>;
  }
  return <DevProvider {...props} />;
}

function DevProvider({
  children,
  projectKey,
  apiUrl,
  reviewerLabel,
  appVersion,
}: ArchLensProviderProps): React.ReactElement {
  // appRef: wraps ONLY the host app's children. The annotation
  // overlay, session menu, and FAB are mounted as siblings of the
  // ref'd view (not children) so they don't end up in the screenshot
  // and don't confuse the inspector — when we ask "what's at (x, y)"
  // we want the underlying app component, not our overlay.
  const appRef = useRef<View | null>(null);

  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [isInspecting, setInspecting] = useState<boolean>(false);
  const [pending, setPending] = useState<PendingAnnotation | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [storageWarning, setStorageWarning] = useState<boolean>(false);
  const warnedRef = useRef<boolean>(false);

  const cloudConfigured = Boolean(projectKey && apiUrl);

  // Hydrate from AsyncStorage on mount, normalizing any annotation
  // that was mid-submit when the app was last killed back to "failed"
  // so the next Submit retries it.
  useEffect(() => {
    let alive = true;
    void loadAnnotations().then((stored) => {
      if (!alive) return;
      const normalized = stored.map((a) =>
        a.syncStatus === "submitting"
          ? { ...a, syncStatus: "failed" as const, syncError: "Interrupted" }
          : a
      );
      if (normalized.length > 0) {
        setAnnotations(normalized);
        // Persist the normalization so we don't keep flipping it on every load.
        if (normalized.some((a, i) => a.syncStatus !== stored[i]!.syncStatus)) {
          void saveAnnotations(normalized);
        }
        if (estimateStorageBytes(normalized) >= STORAGE_WARN_BYTES) {
          setStorageWarning(true);
          warnedRef.current = true;
        }
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const evaluateStorageWarning = useCallback(
    (next: Annotation[]): void => {
      const over = estimateStorageBytes(next) >= STORAGE_WARN_BYTES;
      setStorageWarning(over);
      if (over && !warnedRef.current) {
        warnedRef.current = true;
        Alert.alert(
          "ArchLens — storage getting full",
          "This session is approaching the device's storage limit. " +
            "Submit your annotations soon — further captures may not " +
            "save reliably.",
          [{ text: "OK" }]
        );
      }
      if (!over) warnedRef.current = false;
    },
    []
  );

  const toggleAnnotating = useCallback((): void => {
    setIsAnnotating((prev) => !prev);
  }, []);

  const saveAnnotation = useCallback(
    async (note: string, category?: Annotation["category"]): Promise<void> => {
      if (!pending) return;

      const annotation: Annotation = {
        id: pending.id,
        capturedAt: pending.capturedAt,
        note,
        category,
        element: pending.element,
        screenshotBase64: pending.screenshotBase64,
        screenName: pending.screenName,
        screenDimensions: pending.screenDimensions,
        hierarchyPath: pending.hierarchyPath,
        elementType: pending.elementType,
        syncStatus: "pending",
      };

      setAnnotations((prev) => {
        const next = [...prev, annotation];
        void saveAnnotations(next);
        evaluateStorageWarning(next);
        return next;
      });
      setPending(null);
    },
    [pending, evaluateStorageWarning]
  );

  const clearAnnotations = useCallback(async (): Promise<void> => {
    // Only wipes submitted rows by default — protects drafts from
    // being lost on an accidental "Clear".
    let removed = 0;
    setAnnotations((prev) => {
      const next = prev.filter((a) => a.syncStatus !== "synced");
      removed = prev.length - next.length;
      if (next.length === 0) {
        void clearStoredAnnotations();
      } else {
        void saveAnnotations(next);
      }
      evaluateStorageWarning(next);
      return next;
    });
    if (removed === 0) {
      // Nothing to clear; surface a soft hint so the button doesn't feel broken.
      Alert.alert(
        "Nothing to clear",
        "Clear only removes annotations that have already been submitted to the dashboard. " +
          "Drafts are kept so you don't lose unsent work."
      );
    }
  }, [evaluateStorageWarning]);

  const deleteAnnotation = useCallback(
    async (id: string): Promise<void> => {
      setAnnotations((prev) => {
        const target = prev.find((a) => a.id === id);
        if (target?.syncStatus === "synced") return prev; // immutable
        const next = prev.filter((a) => a.id !== id);
        void saveAnnotations(next);
        evaluateStorageWarning(next);
        return next;
      });
    },
    [evaluateStorageWarning]
  );

  const updateAnnotationNote = useCallback(
    async (id: string, note: string): Promise<void> => {
      setAnnotations((prev) => {
        const target = prev.find((a) => a.id === id);
        if (target?.syncStatus === "synced") return prev; // immutable
        const next = prev.map((a) => (a.id === id ? { ...a, note } : a));
        void saveAnnotations(next);
        return next;
      });
    },
    []
  );

  const submitToDashboard = useCallback(async (): Promise<void> => {
    if (!cloudConfigured || !projectKey || !apiUrl) {
      throw new Error(
        "Cloud sync is not configured. Pass projectKey and apiUrl to " +
          "<ArchLensProvider>."
      );
    }

    // Snapshot what needs sending now.
    const toSubmit = annotations.filter(
      (a) => a.syncStatus !== "synced" && a.syncStatus !== "submitting"
    );
    if (toSubmit.length === 0) return;

    // Mark them submitting immediately so the UI reflects state.
    setAnnotations((prev) => {
      const submittingIds = new Set(toSubmit.map((a) => a.id));
      const next = prev.map((a) =>
        submittingIds.has(a.id)
          ? { ...a, syncStatus: "submitting" as const, syncError: undefined }
          : a
      );
      void saveAnnotations(next);
      return next;
    });

    let result;
    try {
      result = await submitAnnotationsToCloud(toSubmit, {
        apiUrl,
        projectKey,
        reviewerLabel,
        appVersion,
        deviceLabel: Platform.OS + " · " + String(Platform.Version),
      });
    } catch (err) {
      // Whole-batch failure (e.g. couldn't open the session). Revert
      // all submitting rows to failed so they can be retried.
      const message = err instanceof Error ? err.message : String(err);
      setAnnotations((prev) => {
        const next = prev.map((a) =>
          a.syncStatus === "submitting"
            ? { ...a, syncStatus: "failed" as const, syncError: message }
            : a
        );
        void saveAnnotations(next);
        return next;
      });
      throw err;
    }

    // Apply per-issue outcomes.
    setAnnotations((prev) => {
      const next = prev.map((a) => {
        const r = result.perIssue.find((x) => x.annotationId === a.id);
        if (!r) return a;
        return r.status === "synced"
          ? { ...a, syncStatus: "synced" as const, syncError: undefined }
          : { ...a, syncStatus: "failed" as const, syncError: r.error };
      });
      void saveAnnotations(next);
      return next;
    });
  }, [
    annotations,
    cloudConfigured,
    projectKey,
    apiUrl,
    reviewerLabel,
    appVersion,
  ]);

  const value = useMemo<ArchLensContextValue>(
    () => ({
      isAnnotating,
      toggleAnnotating,
      isInspecting,
      setInspecting,
      pending,
      setPending,
      saveAnnotation,
      annotations,
      storageWarning,
      clearAnnotations,
      deleteAnnotation,
      updateAnnotationNote,
      submitToDashboard,
      cloudConfigured,
    }),
    [
      isAnnotating,
      toggleAnnotating,
      isInspecting,
      pending,
      saveAnnotation,
      annotations,
      storageWarning,
      clearAnnotations,
      deleteAnnotation,
      updateAnnotationNote,
      submitToDashboard,
      cloudConfigured,
    ]
  );

  return (
    <ArchLensContext.Provider value={value}>
      <View style={styles.outer} collapsable={false}>
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
