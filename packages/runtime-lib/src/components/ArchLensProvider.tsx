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
 * - In dev builds, it sets up the session context and renders the
 *   floating annotation button on top of the host app.
 *
 * Phase 1 only flips the `isAnnotating` boolean. Phase 2 wires the
 * tap-to-capture overlay onto this context.
 */

import React, { useMemo, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import {
  ArchLensContext,
  type Annotation,
  type ArchLensContextValue,
} from "../state/context";
import { FloatingButton } from "./FloatingButton";

export interface ArchLensProviderProps {
  children: ReactNode;
}

export function ArchLensProvider({
  children,
}: ArchLensProviderProps): React.ReactElement {
  // In production, render children unchanged. No context, no FAB,
  // no listeners — zero footprint when the app ships.
  if (!__DEV__) {
    return <>{children}</>;
  }

  return <DevProvider>{children}</DevProvider>;
}

/**
 * The actual dev-mode provider. Lives in its own component so the
 * production path doesn't even create the hooks.
 */
function DevProvider({
  children,
}: ArchLensProviderProps): React.ReactElement {
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [annotations] = useState<Annotation[]>([]);

  const value = useMemo<ArchLensContextValue>(
    () => ({
      isAnnotating,
      toggleAnnotating: () => setIsAnnotating((prev) => !prev),
      annotations,
    }),
    [isAnnotating, annotations]
  );

  return (
    <ArchLensContext.Provider value={value}>
      {/*
        We need a single wrapping View so the absolutely-positioned
        FAB has something to anchor against. flex: 1 makes it fill
        whatever its parent gives it (typically the React root).
      */}
      <View style={styles.root}>
        {children}
        <FloatingButton />
      </View>
    </ArchLensContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
