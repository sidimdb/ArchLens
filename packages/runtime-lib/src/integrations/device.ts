/**
 * Device fingerprint helper.
 *
 * Returns whatever we can find out about the device the reviewer is
 * on, so the dashboard can correlate quality issues with specific
 * OS / brand / model combinations (e.g. "this Android measurement
 * bug only happens on Samsung devices").
 *
 * Sources, in order:
 *   1. `expo-device` — full info (brand, model name, OS, version).
 *      Loaded dynamically with `require()` so the runtime-lib
 *      doesn't *depend* on Expo — bare RN apps that don't install
 *      expo-device get the fallback below instead of an error.
 *   2. `Platform` from React Native — universally available;
 *      provides OS name + version but no device brand/model.
 *
 * Cached per process — device identity doesn't change while the app
 * is running.
 */

import { Platform } from "react-native";

export interface DeviceInfo {
  /** "iOS", "Android", "web", "windows", etc. */
  osName: string | null;
  /** e.g. "17.5", "14". */
  osVersion: string | null;
  /** e.g. "Apple", "samsung", "google". Null if expo-device isn't installed. */
  deviceBrand: string | null;
  /** e.g. "iPhone 15", "Galaxy S23", "Pixel 7". Null if expo-device isn't installed. */
  deviceModel: string | null;
}

let cached: DeviceInfo | null = null;

interface ExpoDeviceShape {
  brand?: string | null;
  modelName?: string | null;
  osName?: string | null;
  osVersion?: string | null;
}

function tryLoadExpoDevice(): ExpoDeviceShape | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-device") as ExpoDeviceShape;
    return mod && typeof mod === "object" ? mod : null;
  } catch {
    return null;
  }
}

export function getDeviceInfo(): DeviceInfo {
  if (cached) return cached;

  // Baseline from React Native — always present.
  const baseOs =
    Platform.OS === "ios"
      ? "iOS"
      : Platform.OS === "android"
      ? "Android"
      : Platform.OS;

  const info: DeviceInfo = {
    osName: baseOs,
    osVersion: Platform.Version != null ? String(Platform.Version) : null,
    deviceBrand: null,
    deviceModel: null,
  };

  // Enrich with expo-device when it's available.
  const Device = tryLoadExpoDevice();
  if (Device) {
    if (Device.brand) info.deviceBrand = Device.brand;
    if (Device.modelName) info.deviceModel = Device.modelName;
    if (Device.osName) info.osName = Device.osName;
    if (Device.osVersion) info.osVersion = Device.osVersion;
  }

  cached = info;
  return info;
}
