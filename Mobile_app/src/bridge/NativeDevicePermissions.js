import { NativeModules, Platform } from "react-native";

/**
 * NativeDevicePermissions.js
 *
 * Bridge for the Android DevicePermissions native module. Deep-links the user
 * into the OEM settings pages (especially MIUI/Xiaomi) that are needed for the
 * accessibility services to keep running in the background, and reports the
 * status of the permissions that can be read programmatically.
 *
 * Native module name: DevicePermissions
 */

const { DevicePermissions } = NativeModules;

const isAndroid = Platform.OS === "android";
const available = isAndroid && !!DevicePermissions;

const NativeDevicePermissions = {
  isAvailable() {
    return available;
  },

  // ── Device info ─────────────────────────────────────────────────────────────
  async getManufacturer() {
    if (!available) return "";
    try {
      return await DevicePermissions.getManufacturer();
    } catch {
      return "";
    }
  },

  async isMiui() {
    if (!available) return false;
    try {
      return await DevicePermissions.isMiui();
    } catch {
      return false;
    }
  },

  // ── Status checks (readable permissions) ─────────────────────────────────────
  async isAccessibilityServiceEnabled() {
    if (!available) return false;
    try {
      return await DevicePermissions.isAccessibilityServiceEnabled();
    } catch {
      return false;
    }
  },

  async isIgnoringBatteryOptimizations() {
    if (!available) return false;
    try {
      return await DevicePermissions.isIgnoringBatteryOptimizations();
    } catch {
      return false;
    }
  },

  async canDrawOverlays() {
    if (!available) return false;
    try {
      return await DevicePermissions.canDrawOverlays();
    } catch {
      return false;
    }
  },

  // ── Deep-links (each returns true if a settings page actually opened) ─────────
  async openAccessibilitySettings() {
    if (!available) return false;
    try {
      return await DevicePermissions.openAccessibilitySettings();
    } catch {
      return false;
    }
  },

  async openAutoStartSettings() {
    if (!available) return false;
    try {
      return await DevicePermissions.openAutoStartSettings();
    } catch {
      return false;
    }
  },

  async openBatterySettings() {
    if (!available) return false;
    try {
      return await DevicePermissions.openBatterySettings();
    } catch {
      return false;
    }
  },

  async openOtherPermissions() {
    if (!available) return false;
    try {
      return await DevicePermissions.openOtherPermissions();
    } catch {
      return false;
    }
  },

  async openOverlaySettings() {
    if (!available) return false;
    try {
      return await DevicePermissions.openOverlaySettings();
    } catch {
      return false;
    }
  },
};

export default NativeDevicePermissions;
