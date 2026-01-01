import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  NativeModules,
  PermissionsAndroid,
  Alert,
  Linking,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useContext, useCallback, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";

// Define Native Modules
const { ChatAccessibility, CallAnalysis } = NativeModules;

// Time options in minutes
const TIME_OPTIONS = [10, 15, 20, 30, 45, 60, 90, 120, 180];

// Custom Time Selector Component
const TimeSelector = ({ value, onChange }) => {
  const getTimeLabel = (minutes) => {
    if (minutes >= 60) {
      const hours = minutes / 60;
      return hours === 1 ? "1 hour" : `${hours} hours`;
    }
    return `${minutes} mins`;
  };

  return (
    <View style={styles.timeSelectorContainer}>
      <View style={styles.timeHeader}>
        <Text style={styles.timeLabel}>Duration: {getTimeLabel(value)}</Text>
        <TouchableOpacity>
          <Text style={styles.customizeText}>customize</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.timeOptionsGrid}>
        {TIME_OPTIONS.map((time) => (
          <TouchableOpacity
            key={time}
            style={[
              styles.timeOption,
              value === time && styles.timeOptionSelected
            ]}
            onPress={() => onChange(time)}
          >
            <Text style={[
              styles.timeOptionText,
              value === time && styles.timeOptionTextSelected
            ]}>
              {getTimeLabel(time)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// --- SubFeature Component for individual permissions ---
const SubFeatureCard = ({ title, value, onValueChange, timeValue, onTimeChange, showTime }) => {
  return (
    <View style={styles.subFeatureCard}>
      <View style={styles.subFeatureHeader}>
        <Text style={styles.subFeatureTitle}>{title}</Text>
        <Switch
          trackColor={{ false: "#E0E0E0", true: "#4A90E2" }}
          thumbColor={value ? "#FFFFFF" : "#f4f3f4"}
          onValueChange={onValueChange}
          value={value}
        />
      </View>
      
      {value && showTime && (
        <TimeSelector value={timeValue} onChange={onTimeChange} />
      )}
    </View>
  );
};

// --- Main Feature Card Component ---
const FeatureCard = ({ 
  iconName, 
  title, 
  value, 
  onValueChange, 
  expanded,
  children 
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.mainFeatureRow}>
        <Ionicons name={iconName} size={32} color="#0A2E5B" />
        <Text style={styles.cardTitle}>{title}</Text>
        <Switch
          trackColor={{ false: "#E0E0E0", true: "#4A90E2" }}
          thumbColor={value ? "#FFFFFF" : "#f4f3f4"}
          onValueChange={onValueChange}
          value={value}
        />
      </View>
      
      {expanded && value && (
        <View style={styles.expandedContent}>
          {children}
        </View>
      )}
    </View>
  );
};

// --- Main Screen Component ---
const FeaturesScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);

  // Main toggles
  const [chatAnalysisEnabled, setChatAnalysisEnabled] = useState(false);
  const [isVoiceCallPermissionEnabled, setIsVoiceCallPermissionEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Voice call sub-features
  const [voiceSubFeatures, setVoiceSubFeatures] = useState({
    timeBased: { enabled: false, time: 30 },
    sessionBased: { enabled: false, time: 10 },
    cooldown: { enabled: false, time: 15 },
    warningOverlay: { enabled: false, time: 20 },
  });

  // Chat analysis sub-features
  const [chatSubFeatures, setChatSubFeatures] = useState({
    timeBased: { enabled: false, time: 30 },
    sessionBased: { enabled: false, time: 10 },
    cooldown: { enabled: false, time: 15 },
    warningOverlay: { enabled: false, time: 20 },
  });

  // --- 1. CHAT ACCESSIBILITY LOGIC ---
  const checkChatStatus = useCallback(async () => {
    if (Platform.OS !== 'android' || !ChatAccessibility || !ChatAccessibility.isServiceEnabled) return;
    try {
      const isEnabled = await ChatAccessibility.isServiceEnabled();
      setChatAnalysisEnabled(isEnabled);
    } catch (error) {
      console.error("Failed to check Chat status:", error);
    }
  }, []);

  const openChatSettings = (isCurrentlyEnabled) => {
    if (Platform.OS === 'android' && ChatAccessibility && ChatAccessibility.openAccessibilitySettings) {
      if (isCurrentlyEnabled) {
        Alert.alert(
          "Feature Deactivated",
          "Chat Analysis is now OFF. To fully disable, please turn off the service in Accessibility Settings."
        );
        setChatAnalysisEnabled(false);
      } else {
        Alert.alert(
          "Feature Activation Required",
          "To enable Chat Analysis, you must manually turn on the service on the next screen.",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Go to Settings", 
              onPress: () => ChatAccessibility.openAccessibilitySettings() 
            },
          ]
        );
      }
    }
  };

  // --- 2. VOICE CALL PERMISSION LOGIC ---
  const checkVoiceStatus = useCallback(async () => {
    if (Platform.OS !== 'android' || !CallAnalysis || !CallAnalysis.checkPermissions) return;
    try {
      const status = await CallAnalysis.checkPermissions();
      setIsVoiceCallPermissionEnabled(status.ALL_GRANTED);
    } catch (error) {
      console.error("Failed to check Voice permissions:", error);
      setIsVoiceCallPermissionEnabled(false);
    }
  }, []);

  const requestVoicePermissions = async (newValue) => {
    if (Platform.OS !== 'android') return;

    if (!newValue) {
      if (CallAnalysis && CallAnalysis.setVoiceFeatureEnabled) {
        await CallAnalysis.setVoiceFeatureEnabled(false);
      }
      setIsVoiceCallPermissionEnabled(false);
      
      Alert.alert(
        "Feature Deactivated & Permissions", 
        "Voice Analysis is OFF. To fully deny Microphone and Phone access, you must manually revoke them in App Settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open App Settings", onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    ]);

    const readGranted = results[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === PermissionsAndroid.RESULTS.GRANTED;
    const recordGranted = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
    const writeStorageGranted = results[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED;
    const readStorageGranted = results[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED;
    
    const allGranted = readGranted && recordGranted && writeStorageGranted && readStorageGranted;

    if (allGranted) {
      if (CallAnalysis && CallAnalysis.setVoiceFeatureEnabled) {
        await CallAnalysis.setVoiceFeatureEnabled(true);
      }
      setIsVoiceCallPermissionEnabled(true);
      Alert.alert("Feature Activated", "Voice Call Analysis is ON! Microphone and Phone access granted.");
    } else {
      const neverAskRead = results[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
      const neverAskRecord = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
      
      if (neverAskRead || neverAskRecord) {
        Alert.alert(
          "Permissions Permanently Denied",
          "Voice analysis needs Microphone and Phone access. Please navigate to 'Permissions' and manually switch both to 'Allow'.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open App Settings", onPress: () => Linking.openSettings() },
          ]
        );
      } else {
        Alert.alert("Permission Denied", "Voice analysis cannot run without both Phone State and Microphone access.");
      }
      
      setIsVoiceCallPermissionEnabled(false);
    }
  };

  // --- HANDLER FUNCTIONS FOR TOGGLES ---
  const handleVoiceToggle = (newValue) => {
    if (!newValue) {
      setVoiceSubFeatures({
        timeBased: { enabled: false, time: 30 },
        sessionBased: { enabled: false, time: 10 },
        cooldown: { enabled: false, time: 15 },
        warningOverlay: { enabled: false, time: 20 },
      });
    }
    requestVoicePermissions(newValue);
  };

  const handleChatToggle = (newValue) => {
    if (!newValue) {
      setChatSubFeatures({
        timeBased: { enabled: false, time: 30 },
        sessionBased: { enabled: false, time: 10 },
        cooldown: { enabled: false, time: 15 },
        warningOverlay: { enabled: false, time: 20 },
      });
    }
    openChatSettings(!newValue);
  };

  // Sub-feature handlers
  const updateVoiceSubFeature = (feature, enabled, time) => {
    setVoiceSubFeatures(prev => ({
      ...prev,
      [feature]: { enabled, time: time || prev[feature].time }
    }));
  };

  const updateChatSubFeature = (feature, enabled, time) => {
    setChatSubFeatures(prev => ({
      ...prev,
      [feature]: { enabled, time: time || prev[feature].time }
    }));
  };

  // --- INITIAL LOAD AND REFRESH ---
  useEffect(() => {
    const loadStatus = async () => {
      setLoading(true);
      await checkChatStatus();
      await checkVoiceStatus();
      setLoading(false);
    };

    loadStatus();

    const interval = setInterval(checkChatStatus, 2000);
    return () => clearInterval(interval);
  }, [checkChatStatus, checkVoiceStatus]);
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Checking feature statuses...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            Hi {user ? user.name : "Default"}!
          </Text>
          <Text style={styles.headerSubtitle}>
            Give your mental health a check
          </Text>
        </View>
        <Image
          source={require("../assets/default.png")}
          style={styles.avatar}
        />
      </View>

      <ScrollView style={styles.featuresContainer}>
        {/* Voice Call Analysis */}
        <FeatureCard
          iconName="mic-outline"
          title="Voice call analysis"
          value={isVoiceCallPermissionEnabled}
          onValueChange={handleVoiceToggle}
          expanded={isVoiceCallPermissionEnabled}
        >
          <SubFeatureCard
            title="Time Based"
            value={voiceSubFeatures.timeBased.enabled}
            onValueChange={(val) => updateVoiceSubFeature('timeBased', val)}
            timeValue={voiceSubFeatures.timeBased.time}
            onTimeChange={(time) => updateVoiceSubFeature('timeBased', true, time)}
            showTime={true}
          />
          <SubFeatureCard
            title="Session based"
            value={voiceSubFeatures.sessionBased.enabled}
            onValueChange={(val) => updateVoiceSubFeature('sessionBased', val)}
            timeValue={voiceSubFeatures.sessionBased.time}
            onTimeChange={(time) => updateVoiceSubFeature('sessionBased', true, time)}
            showTime={true}
          />
          <SubFeatureCard
            title="Cooldown"
            value={voiceSubFeatures.cooldown.enabled}
            onValueChange={(val) => updateVoiceSubFeature('cooldown', val)}
            timeValue={voiceSubFeatures.cooldown.time}
            onTimeChange={(time) => updateVoiceSubFeature('cooldown', true, time)}
            showTime={true}
          />
          <SubFeatureCard
            title="Warning overlay"
            value={voiceSubFeatures.warningOverlay.enabled}
            onValueChange={(val) => updateVoiceSubFeature('warningOverlay', val)}
            timeValue={voiceSubFeatures.warningOverlay.time}
            onTimeChange={(time) => updateVoiceSubFeature('warningOverlay', true, time)}
            showTime={true}
          />
        </FeatureCard>

        {/* Chat Message Analysis */}
        <FeatureCard
          iconName="chatbubble-ellipses-outline"
          title="Chat message analysis"
          value={chatAnalysisEnabled}
          onValueChange={handleChatToggle}
          expanded={chatAnalysisEnabled}
        >
          <SubFeatureCard
            title="Time Based"
            value={chatSubFeatures.timeBased.enabled}
            onValueChange={(val) => updateChatSubFeature('timeBased', val)}
            timeValue={chatSubFeatures.timeBased.time}
            onTimeChange={(time) => updateChatSubFeature('timeBased', true, time)}
            showTime={true}
          />
          <SubFeatureCard
            title="Session based"
            value={chatSubFeatures.sessionBased.enabled}
            onValueChange={(val) => updateChatSubFeature('sessionBased', val)}
            timeValue={chatSubFeatures.sessionBased.time}
            onTimeChange={(time) => updateChatSubFeature('sessionBased', true, time)}
            showTime={true}
          />
          <SubFeatureCard
            title="Cooldown"
            value={chatSubFeatures.cooldown.enabled}
            onValueChange={(val) => updateChatSubFeature('cooldown', val)}
            timeValue={chatSubFeatures.cooldown.time}
            onTimeChange={(time) => updateChatSubFeature('cooldown', true, time)}
            showTime={true}
          />
          <SubFeatureCard
            title="Warning overlay"
            value={chatSubFeatures.warningOverlay.enabled}
            onValueChange={(val) => updateChatSubFeature('warningOverlay', val)}
            timeValue={chatSubFeatures.warningOverlay.time}
            onTimeChange={(time) => updateChatSubFeature('warningOverlay', true, time)}
            showTime={true}
          />
        </FeatureCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6B7280'
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333333",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#333333",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  featuresContainer: {
    flex: 1,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  mainFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#0A2E5B",
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  subFeatureCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  subFeatureHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subFeatureTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#0A2E5B",
  },
  timeSelectorContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  timeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 14,
    color: "#0A2E5B",
    fontWeight: "500",
  },
  customizeText: {
    fontSize: 12,
    color: "#4A90E2",
  },
  timeOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minWidth: "30%",
    alignItems: "center",
  },
  timeOptionSelected: {
    backgroundColor: "#4A90E2",
    borderColor: "#4A90E2",
  },
  timeOptionText: {
    fontSize: 12,
    color: "#0A2E5B",
    fontWeight: "500",
  },
  timeOptionTextSelected: {
    color: "#FFFFFF",
  },
});

export default FeaturesScreen;