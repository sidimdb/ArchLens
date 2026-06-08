/**
 * Demo Expo app for @archlens/runtime.
 *
 * Five screens, each with at least one deliberate UX issue planted
 * inside it (small touch target, low-contrast text, missing empty
 * state, etc.). Together they give the runtime annotation tool
 * realistic things to flag during the jury demo.
 *
 * The whole tree is wrapped in <ArchLensProvider>, which is the only
 * line a real RN app would have to add to use ArchLens.
 */

import React from "react";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ArchLensProvider, setNavigationRef } from "@archlens/runtime";

import { HomeScreen } from "./src/screens/HomeScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { NotificationsScreen } from "./src/screens/NotificationsScreen";
import { AboutScreen } from "./src/screens/AboutScreen";

export type RootStackParamList = {
  Home: undefined;
  Profile: undefined;
  Settings: undefined;
  Notifications: undefined;
  About: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Shared navigation ref so @archlens/runtime can read the current
// screen name when capturing an annotation. Without this, every
// captured annotation would be labeled "Screen: unknown".
const navigationRef = createNavigationContainerRef<RootStackParamList>();
setNavigationRef(navigationRef);

// Cloud sync configuration. Both values come from .env via Expo's
// EXPO_PUBLIC_* convention, so they're embedded at build time and
// never hardcoded in source. If either is missing the app falls back
// to capture-only mode (no Submit button on the session sheet).
const API_URL = process.env.EXPO_PUBLIC_ARCHLENS_API_URL;
const PROJECT_KEY = process.env.EXPO_PUBLIC_ARCHLENS_PROJECT_KEY;

export default function App(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <ArchLensProvider
        projectName="FitTrack (ArchLens demo)"
        apiUrl={API_URL}
        projectKey={PROJECT_KEY}
        reviewerLabel="Demo reviewer"
        appVersion="0.1.0"
      >
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator initialRouteName="Home">
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
            />
            <Stack.Screen name="About" component={AboutScreen} />
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </ArchLensProvider>
    </SafeAreaProvider>
  );
}
