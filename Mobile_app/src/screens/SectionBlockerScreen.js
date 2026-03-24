import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { useBlockerSettings } from "../hooks/useBlockerSettings";
import NativeAccessibilityService from "../bridge/NativeAccessibilityService";

const INSTAGRAM_COLOR = "#E1306C";
const YOUTUBE_COLOR   = "#FF0000";

// ─── Toggle Row ───────────────────────────────────────────────────────────────
const BlockToggleRow = ({ label, icon, value, onValueChange, disabled }) => (
  <View style={[styles.toggleRow, disabled && styles.toggleRowDisabled]}>
    <View style={styles.toggleLabelRow}>
      <Ionicons name={icon} size={18} color={disabled ? "#C0C0C0" : "#374151"} />
      <Text style={[styles.toggleLabel, disabled && styles.toggleLabelDisabled]}>
        {label}
      </Text>
    </View>
    <Switch
      trackColor={{ false: "#E5E7EB", true: "#6366F1" }}
      thumbColor={value ? "#FFFFFF" : "#F9FAFB"}
      ios_backgroundColor="#E5E7EB"
      onValueChange={onValueChange}
      value={value}
      disabled={disabled}
    />
  </View>
);

// ─── App Block Card ───────────────────────────────────────────────────────────
const AppBlockCard = ({ appName, appColor, iconName, masterEnabled, onMasterToggle, children }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={[styles.appIconBadge, { backgroundColor: appColor + "15" }]}>
        <Ionicons name={iconName} size={26} color={appColor} />
      </View>
      <View style={styles.cardHeaderText}>
        <Text style={styles.cardTitle}>{appName}</Text>
        <Text style={styles.cardSubtitle}>
          {masterEnabled ? "Section blocking active" : "Blocking disabled"}
        </Text>
      </View>
      <Switch
        trackColor={{ false: "#E5E7EB", true: appColor }}
        thumbColor={masterEnabled ? "#FFFFFF" : "#F9FAFB"}
        onValueChange={onMasterToggle}
        value={masterEnabled}
      />
    </View>
    {masterEnabled && (
      <>
        <View style={styles.divider} />
        <View style={styles.togglesContainer}>{children}</View>
      </>
    )}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const SectionBlockerScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);
  const [serviceRunning, setServiceRunning] = useState(false);

  const {
    settings,
    loading,
    saving,
    updateInstagramToggle,
    updateYoutubeToggle,
    toggleInstagramMaster,
    toggleYoutubeMaster,
  } = useBlockerSettings(user?._id);

  // ── Sync native service whenever settings change ──────────────────────────
  useEffect(() => {
    if (loading) return; // Don't act on initial default state

    const shouldRun =
      settings.instagram.masterEnabled || settings.youtube.masterEnabled;

    if (shouldRun && !serviceRunning) {
      NativeAccessibilityService.startService(settings)
        .then(() => setServiceRunning(true))
        .catch((e) => console.warn("Could not start blocker service:", e));
    } else if (!shouldRun && serviceRunning) {
      NativeAccessibilityService.stopService()
        .then(() => setServiceRunning(false))
        .catch((e) => console.warn("Could not stop blocker service:", e));
    } else if (shouldRun && serviceRunning) {
      NativeAccessibilityService.updateSettings(settings).catch((e) =>
        console.warn("Could not update blocker settings:", e)
      );
    }
  }, [settings, loading]);

  // ── Master toggle handler: prompt if service not enabled ──────────────────
  const handleMasterToggle = useCallback(
    (platform, newValue) => {
      if (newValue && !NativeAccessibilityService.isAvailable()) {
        Alert.alert(
          "Accessibility Service Required",
          "Section Blocker needs the Mindscope Accessibility Service. Please enable it in your device Accessibility Settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => NativeAccessibilityService.openAccessibilitySettings(),
            },
          ]
        );
        return;
      }
      if (platform === "instagram") toggleInstagramMaster(newValue);
      else toggleYoutubeMaster(newValue);
    },
    [toggleInstagramMaster, toggleYoutubeMaster]
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading your blocker settings…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#0A2E5B" />
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>Section Blocker</Text>
          <Text style={styles.headerSubtitle}>
            Block specific parts of Instagram & YouTube
          </Text>
        </View>
        {saving && <ActivityIndicator size="small" color="#6366F1" />}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#6366F1" />
          <Text style={styles.infoText}>
            When a blocked section opens, a full-screen overlay will appear
            giving you a mindful moment to redirect your focus.
          </Text>
        </View>

        {/* Instagram Card */}
        <AppBlockCard
          appName="Instagram"
          appColor={INSTAGRAM_COLOR}
          iconName="logo-instagram"
          masterEnabled={settings.instagram.masterEnabled}
          onMasterToggle={(val) => handleMasterToggle("instagram", val)}
        >
          <BlockToggleRow
            label="Block Stories"
            icon="albums-outline"
            value={settings.instagram.blockStories}
            onValueChange={(val) => updateInstagramToggle("blockStories", val)}
            disabled={!settings.instagram.masterEnabled}
          />
          <BlockToggleRow
            label="Block Reels"
            icon="play-circle-outline"
            value={settings.instagram.blockReels}
            onValueChange={(val) => updateInstagramToggle("blockReels", val)}
            disabled={!settings.instagram.masterEnabled}
          />
          <BlockToggleRow
            label="Block Explore Tab"
            icon="compass-outline"
            value={settings.instagram.blockExplore}
            onValueChange={(val) => updateInstagramToggle("blockExplore", val)}
            disabled={!settings.instagram.masterEnabled}
          />
        </AppBlockCard>

        {/* YouTube Card */}
        <AppBlockCard
          appName="YouTube"
          appColor={YOUTUBE_COLOR}
          iconName="logo-youtube"
          masterEnabled={settings.youtube.masterEnabled}
          onMasterToggle={(val) => handleMasterToggle("youtube", val)}
        >
          <BlockToggleRow
            label="Block Shorts"
            icon="phone-portrait-outline"
            value={settings.youtube.blockShorts}
            onValueChange={(val) => updateYoutubeToggle("blockShorts", val)}
            disabled={!settings.youtube.masterEnabled}
          />
          <BlockToggleRow
            label="Block Video Search"
            icon="search-outline"
            value={settings.youtube.blockVideoSearch}
            onValueChange={(val) => updateYoutubeToggle("blockVideoSearch", val)}
            disabled={!settings.youtube.masterEnabled}
          />
          <BlockToggleRow
            label="Block Picture-in-Picture"
            icon="browsers-outline"
            value={settings.youtube.blockPiP}
            onValueChange={(val) => updateYoutubeToggle("blockPiP", val)}
            disabled={!settings.youtube.masterEnabled}
          />
          <BlockToggleRow
            label="Block Comments"
            icon="chatbubbles-outline"
            value={settings.youtube.blockComments}
            onValueChange={(val) => updateYoutubeToggle("blockComments", val)}
            disabled={!settings.youtube.masterEnabled}
          />
        </AppBlockCard>

        {/* Service status pill */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: serviceRunning ? "#10B981" : "#9CA3AF" }]} />
          <Text style={styles.statusText}>
            {serviceRunning
              ? "Blocker service is actively monitoring"
              : "Blocker service is inactive"}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F9FA" },
  loadingText: { marginTop: 14, fontSize: 15, color: "#6B7280" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center", alignItems: "center",
    marginRight: 12,
  },
  headerTextBlock: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0A2E5B" },
  headerSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 1 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  infoBanner: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#EEF2FF", borderRadius: 12,
    padding: 14, marginBottom: 20, gap: 10,
  },
  infoText: { flex: 1, fontSize: 13, color: "#4338CA", lineHeight: 19 },

  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20,
    padding: 20, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  appIconBadge: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: "center", alignItems: "center", marginRight: 14,
  },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0A2E5B" },
  cardSubtitle: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 16 },
  togglesContainer: { gap: 4 },

  toggleRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: 10, paddingHorizontal: 4,
  },
  toggleRowDisabled: { opacity: 0.45 },
  toggleLabelRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleLabel: { fontSize: 14, fontWeight: "500", color: "#374151" },
  toggleLabelDisabled: { color: "#9CA3AF" },

  statusRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8, marginTop: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, color: "#9CA3AF" },
});

export default SectionBlockerScreen;
