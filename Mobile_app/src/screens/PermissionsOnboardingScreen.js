import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  AppState,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NativeDevicePermissions from "../bridge/NativeDevicePermissions";

export const ONBOARDING_COMPLETE_KEY = "@MindScope:onboardingComplete";
const MANUAL_AUTOSTART_KEY = "@MindScope:manualDone:autostart";
const MANUAL_BGPOPUP_KEY = "@MindScope:manualDone:bgPopup";

/**
 * Guides the user (especially on MIUI/Xiaomi devices) through the OS-level
 * permissions the accessibility services need to keep running in the background.
 * Each step deep-links straight into the relevant settings page.
 */
const PermissionsOnboardingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const appState = useRef(AppState.currentState);

  const [loading, setLoading] = useState(true);
  const [isMiui, setIsMiui] = useState(false);

  // Programmatically-readable statuses
  const [accessibilityOn, setAccessibilityOn] = useState(false);
  const [batteryOn, setBatteryOn] = useState(false);
  const [overlayOn, setOverlayOn] = useState(false);

  // Manual confirmations (cannot be read from the OS on MIUI)
  const [autostartDone, setAutostartDone] = useState(false);
  const [bgPopupDone, setBgPopupDone] = useState(false);

  const refreshStatuses = useCallback(async () => {
    try {
      const [acc, batt, overlay, miui, autostart, bgpopup] = await Promise.all([
        NativeDevicePermissions.isAccessibilityServiceEnabled(),
        NativeDevicePermissions.isIgnoringBatteryOptimizations(),
        NativeDevicePermissions.canDrawOverlays(),
        NativeDevicePermissions.isMiui(),
        AsyncStorage.getItem(MANUAL_AUTOSTART_KEY),
        AsyncStorage.getItem(MANUAL_BGPOPUP_KEY),
      ]);
      setAccessibilityOn(acc);
      setBatteryOn(batt);
      setOverlayOn(overlay);
      setIsMiui(miui);
      setAutostartDone(autostart === "true");
      setBgPopupDone(bgpopup === "true");
    } catch (e) {
      console.error("refreshStatuses failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial check + re-check whenever the user returns from a settings page.
  useEffect(() => {
    refreshStatuses();
    const sub = AppState.addEventListener("change", (next) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        refreshStatuses();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [refreshStatuses]);

  const markManual = async (key, setter) => {
    await AsyncStorage.setItem(key, "true");
    setter(true);
  };

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    navigation.replace("MainApp");
  };

  // Steps that have a real OS-readable status gate "all ready"; manual ones
  // count once the user taps "I've done this".
  const allReady =
    accessibilityOn &&
    batteryOn &&
    overlayOn &&
    autostartDone &&
    bgPopupDone;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Checking permissions…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Finish setting up MindScope</Text>
        <Text style={styles.subtitle}>
          MindScope analyzes your chats in the background. For this to keep
          working{isMiui ? " on your Xiaomi/Redmi phone" : ""}, please enable the
          permissions below. Tap each button, change the setting, then come back.
        </Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        <PermissionStep
          index={1}
          icon="accessibility-outline"
          title="Accessibility permission"
          description="Turn ON 'MindScope: Chat Analysis' under Downloaded/Installed apps. This is what reads your chats for analysis."
          done={accessibilityOn}
          statusKnown
          buttonLabel="Open Accessibility settings"
          onPress={() => NativeDevicePermissions.openAccessibilitySettings()}
        />

        <PermissionStep
          index={2}
          icon="power-outline"
          title="Autostart permission"
          description="Allow MindScope to start automatically so the service restarts after reboot or being closed."
          done={autostartDone}
          statusKnown={false}
          buttonLabel="Open Autostart settings"
          onPress={() => NativeDevicePermissions.openAutoStartSettings()}
          onConfirm={() => markManual(MANUAL_AUTOSTART_KEY, setAutostartDone)}
          confirmed={autostartDone}
        />

        <PermissionStep
          index={3}
          icon="battery-charging-outline"
          title='Battery → "No restrictions"'
          description="Set battery usage to 'No restrictions' (or 'Don't optimize') so the system never kills MindScope in the background."
          done={batteryOn}
          statusKnown
          buttonLabel="Open Battery settings"
          onPress={() => NativeDevicePermissions.openBatterySettings()}
        />

        <PermissionStep
          index={4}
          icon="albums-outline"
          title="Show pop-up in background"
          description="Enable 'Display pop-up windows while running in the background' so MindScope can show alerts even when it isn't open."
          done={bgPopupDone}
          statusKnown={false}
          buttonLabel="Open Other permissions"
          onPress={() => NativeDevicePermissions.openOtherPermissions()}
          onConfirm={() => markManual(MANUAL_BGPOPUP_KEY, setBgPopupDone)}
          confirmed={bgPopupDone}
        />

        <PermissionStep
          index={5}
          icon="layers-outline"
          title="Display over other apps (pop-up)"
          description="Allow MindScope to draw over other apps so it can show the mindful overlay and alerts on top of WhatsApp, Instagram, etc."
          done={overlayOn}
          statusKnown
          buttonLabel="Open Display-over-apps settings"
          onPress={() => NativeDevicePermissions.openOverlaySettings()}
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.finishButton, !allReady && styles.finishButtonMuted]}
          onPress={finish}
          activeOpacity={0.85}
        >
          <Text style={styles.finishButtonText}>
            {allReady ? "All set — Continue" : "Continue anyway"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={refreshStatuses} style={styles.recheck}>
          <Text style={styles.recheckText}>Re-check permissions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const PermissionStep = ({
  index,
  icon,
  title,
  description,
  done,
  statusKnown,
  buttonLabel,
  onPress,
  onConfirm,
  confirmed,
}) => {
  return (
    <View style={[styles.card, done && styles.cardDone]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, done && styles.iconWrapDone]}>
          <Ionicons name={icon} size={22} color={done ? "#1B873F" : "#0A2E5B"} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {index}. {title}
          </Text>
        </View>
        {done ? (
          <Ionicons name="checkmark-circle" size={26} color="#1B873F" />
        ) : (
          <Ionicons name="ellipse-outline" size={26} color="#C2C9D6" />
        )}
      </View>

      <Text style={styles.cardDesc}>{description}</Text>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={styles.actionButtonText}>{buttonLabel}</Text>
      </TouchableOpacity>

      {/* Manual confirm for steps whose status the OS won't expose */}
      {!statusKnown && (
        <TouchableOpacity
          style={styles.confirmRow}
          onPress={onConfirm}
          activeOpacity={0.7}
        >
          <Ionicons
            name={confirmed ? "checkbox" : "square-outline"}
            size={20}
            color={confirmed ? "#1B873F" : "#6B7280"}
          />
          <Text style={styles.confirmText}>I've enabled this</Text>
        </TouchableOpacity>
      )}

      {statusKnown && (
        <Text style={[styles.statusText, done ? styles.statusOn : styles.statusOff]}>
          {done ? "Enabled" : "Not enabled yet"}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: { marginTop: 14, fontSize: 16, color: "#6B7280" },
  headerBlock: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#0A2E5B" },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, color: "#5B6472" },
  list: { flex: 1, paddingHorizontal: 20, marginTop: 6 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEF1F5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  cardDone: { borderColor: "#BFE6C9", backgroundColor: "#F6FBF7" },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEF3FB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconWrapDone: { backgroundColor: "#E4F5E9" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0A2E5B" },
  cardDesc: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: "#5B6472",
  },
  actionButton: {
    marginTop: 14,
    backgroundColor: "#2563EB",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
  },
  actionButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  confirmText: { fontSize: 13, color: "#374151", fontWeight: "500" },
  statusText: { marginTop: 10, fontSize: 12, fontWeight: "600" },
  statusOn: { color: "#1B873F" },
  statusOff: { color: "#C2410C" },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#F8F9FA",
    borderTopWidth: 1,
    borderTopColor: "#EEF1F5",
  },
  finishButton: {
    backgroundColor: "#1B873F",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  finishButtonMuted: { backgroundColor: "#6B7280" },
  finishButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  recheck: { alignItems: "center", paddingVertical: 10 },
  recheckText: { color: "#2563EB", fontSize: 14, fontWeight: "600" },
});

export default PermissionsOnboardingScreen;
