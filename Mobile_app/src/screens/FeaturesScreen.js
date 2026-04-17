import { useState } from "react";
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
  AppState,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useContext, useCallback, useRef, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { FA5Style } from "@expo/vector-icons/build/FontAwesome5";
import ScreenTimeControllerCard from "../components/ScreenTimeControllerCard";
import NativeCallRecordingService from '../bridge/NativeCallRecordingService';
import AsyncStorage from '@react-native-async-storage/async-storage';



// Define Native Modules
const { ChatAccessibility, CallAnalysis, ScreenController } = NativeModules;

// Time options in minutes
const TIME_OPTIONS = [0.75, 1, 10, 15, 20, 30, 45, 60, 90, 120, 180];

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
const FeaturesScreen = ({ navigation, selectedDirectory, setSelectedDirectory }) => {
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);
  const appState = useRef(AppState.currentState);
  const [nativeAvailable, setNativeAvailable] = useState(false);


  // State for directory selection
  const DIRECTORY_KEY = '@HealthSync:recordingDirectory';


  useEffect(() => {
    const init = async () => {
      // 1. Check Native Module Availability
      const available = NativeCallRecordingService.isAvailable();
      setNativeAvailable(available);

      // 2. Load Saved Directory
      await loadSavedDirectory();
    };

    init();
  }, []);

  const loadSavedDirectory = async () => {
    try {
      const savedDir = await AsyncStorage.getItem(DIRECTORY_KEY);
      if (savedDir) {
        setSelectedDirectory(savedDir);
      }
    } catch (error) {
      console.error('Failed to load directory pref:', error);
    }
  };

  // Main toggles
  const [chatAnalysisEnabled, setChatAnalysisEnabled] = useState(false);
  const [isVoiceCallPermissionEnabled, setIsVoiceCallPermissionEnabled] = useState(false);
  const [isScreenControllerEnabled, setIsScreenControllerEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Screen usage controller sub-features
  const [screenUsageControllerSubFeature, setScreenUsageControllerSubFeature] = useState({
    dailyLimit: { enabled: false, time: 30 },
    sessionLimit: { enabled: false, time: 10 },
    cooldown: { enabled: false, time: 15 }
  });

  // --- 1. CHAT ACCESSIBILITY LOGIC ---
  const checkChatStatus = useCallback(async () => {
    if (Platform.OS !== 'android' || !ChatAccessibility || !ChatAccessibility.isServiceEnabled) return;
    try {
      const isEnabled = await ChatAccessibility.isServiceEnabled();
      console.log("Chat accessibility service status : ", isEnabled);
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

  // Logic for the Screen Controller toggle (opens accessibility settings if permissions are not granted)

  const syncSettingsToNative = async (featureKey, enabled, time) => {
    try {
      if (ScreenController && ScreenController.updateServiceSettings) {
        await ScreenController.updateServiceSettings(featureKey, enabled, time);
        console.log("updateServiceSettings method is called !");
      }
    } catch (e) {
      console.error("Sync Error:", e);
    }
  };

  const checkScreenControllerStatus = useCallback(async () => {
    if (Platform.OS !== 'android' || !ScreenController || !ScreenController.isServiceEnabled) return;

    try {
      const isEnabled = await ScreenController.isServiceEnabled();
      console.log("Screen controller status : ", isEnabled);
      setIsScreenControllerEnabled(isEnabled);

      // Optional: If enabled, sync current sub-feature states to ensure Java is up to date
      if (isEnabled) {
        Object.keys(screenUsageControllerSubFeature).forEach(featureKey => {
          const feature = screenUsageControllerSubFeature[featureKey];
          syncSettingsToNative(featureKey, feature.enabled, feature.time);
        });
      }
    } catch (error) {
      console.error("Failed to check ScreenController status:", error);
    }
  }, [screenUsageControllerSubFeature]);

  const handleScreenUsageControllerToggle = async (newValue) => {
    // 1. PERMISSION CHECK: Only run if the user is trying to turn the toggle ON

    if (newValue === true) {
      try {
        // Call the native method to check if the Accessibility Service is active
        const isEnabled = await ScreenController.isServiceEnabled();

        if (!isEnabled) {
          // If not enabled, show the system alert and STOP the toggle from turning on
          Alert.alert(
            "Permission Required",
            "Screen Controller requires Accessibility permissions to track app usage and enforce limits.",
            [
              {
                text: "Cancel",
                onPress: () => setIsScreenControllerEnabled(false),
                style: "cancel"
              },
              {
                text: "Open Settings",
                onPress: () => ScreenController.openAccessibilitySettings()
              }
            ]
          );
          return; // Exit the function early so the state doesn't update to true
        }
      } catch (error) {
        console.error("Error checking accessibility status:", error);
        return;
      }
    }

    setIsScreenControllerEnabled(newValue);

    // If the Master Switch is turned OFF, we tell the Native Service 
    // to disable all individual restrictions.
    if (!newValue) {
      const features = ['timeBased', 'sessionBased', 'cooldown', 'warningOverlay'];
      features.forEach(featureKey => {
        // Force 'enabled' to false in the native SharedPreferences
        syncSettingsToNative(featureKey, false, screenUsageControllerSubFeature[featureKey].time);
      });
    } else {
      // If Master Switch is turned ON, sync the current state of all sub-features
      Object.keys(screenUsageControllerSubFeature).forEach(featureKey => {
        const feature = screenUsageControllerSubFeature[featureKey];
        syncSettingsToNative(featureKey, feature.enabled, feature.time);
      });
    }
  };

  // Effect hook to sync UI state with system state on mount
  useEffect(() => {
    const syncServiceState = async () => {
      if (Platform.OS === 'android') {
        const isRunning = await ScreenController.isServiceEnabled();
        // If the service was turned off in system settings, turn off our UI toggle
        if (!isRunning && isMainEnabled) {
          setIsScreenControllerEnabled(false);
        }
      }
    };

    syncServiceState();
  }, []);

  // --- HANDLER FUNCTIONS FOR TOGGLES ---
  const handleVoiceToggle = (newValue) => {
    requestVoicePermissions(newValue);
  };

  const handleChatToggle = (newValue) => {
    openChatSettings(!newValue);
  };


  // Sub-feature handlers

  const updateScreenUsageControllerFeature = (feature, enabled, time) => {
    const newTime = time || screenUsageControllerSubFeature[feature].time;

    setScreenUsageControllerSubFeature((prev) => ({
      ...prev,
      [feature]: { enabled, time: newTime },
    }));

    // --- CALL HERE ---
    // This syncs the specific sub-feature immediately when toggled or time is changed
    syncSettingsToNative(feature, enabled, newTime);
  }

  const checkAllServicesStatus = useCallback(async () => {
    setLoading(true);
    try {
      // Check all services (Screen, Chat, Voice)
      // The Promise.all makes them run in parallel
      await Promise.all([
        checkChatStatus(),
        checkVoiceStatus(),
        checkScreenControllerStatus()
      ]);
      console.log("All settings synced from Android System");
    } catch (error) {
      console.error("Failed to sync service statuses:", error);
    } finally {
      setLoading(false);
    }
  }, [checkChatStatus, checkVoiceStatus, checkScreenControllerStatus]);

  // 2. The AppState Listener inside useEffect
  useEffect(() => {
    // A. Initial check on mount
    checkAllServicesStatus();

    // B. Setup the Listener
    const subscription = AppState.addEventListener('change', nextAppState => {
      // Condition: App was in background (Settings) and is now 'active' (User returned)
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log("Returned from Settings. Re-checking permissions...");
        checkAllServicesStatus();
      }

      // Update the ref to the current state
      appState.current = nextAppState;
    });
    // C. Cleanup listener on unmount
    return () => {
      subscription.remove();
    };
  }, [checkAllServicesStatus]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Checking feature statuses...</Text>
      </View>
    );
  }

  // --- Handle Directory Selection ---
  const handleSelectDirectory = async () => {
    try {
      const uriString = await NativeCallRecordingService.requestRecordingFolderAccess();

      if (uriString) {
        setSelectedDirectory(uriString);
        await AsyncStorage.setItem(DIRECTORY_KEY, uriString);

        Alert.alert(
          'Directory Selected',
          'HealthSync now has permission to access recordings in this folder.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Directory selection error:', error);
      Alert.alert('Error', 'Failed to select directory: ' + error.message);
    }
  };

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
        {/* Chat Message Analysis */}
        <FeatureCard
          iconName="chatbubble-ellipses-outline"
          title="Chat & Voice message analysis"
          value={chatAnalysisEnabled}
          onValueChange={handleChatToggle}
          expanded={chatAnalysisEnabled}
          children={
            nativeAvailable && (
              <View style={styles.setupCard}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleSelectDirectory}
                >
                  <Text style={styles.actionButtonText}>
                    Select Call Recording Directory
                  </Text>
                </TouchableOpacity>

                {selectedDirectory && (
                  <View style={styles.pathContainer}>
                    <Text style={styles.pathLabel}>Selected Directory:</Text>
                    <Text style={styles.pathText} numberOfLines={2}>
                      {decodeURIComponent(selectedDirectory)}
                    </Text>
                  </View>
                )}
              </View>
            )
          }
        />

        {/* Voice Call Analysis */}
        {/* <FeatureCard
          iconName="mic-outline"
          title="Voice call analysis"
          value={isVoiceCallPermissionEnabled}
          onValueChange={handleVoiceToggle}
          expanded={isVoiceCallPermissionEnabled}
        /> */}

        {/* Screen Usage Controller */}
        <ScreenTimeControllerCard onPress={() => { navigation.navigate('AppSelectorScreen'); }} />

        {/* <FeatureCard
          iconName="chatbubble-ellipses-outline"
          title="Screen Usage Controller"
          value={isScreenControllerEnabled}
          onValueChange={handleScreenUsageControllerToggle}
          expanded={isScreenControllerEnabled}
        >
          <SubFeatureCard
            title="Daily limit"
            value={screenUsageControllerSubFeature.dailyLimit.enabled}
            onValueChange={(val) => updateScreenUsageControllerFeature('dailyLimit', val)}
            timeValue={screenUsageControllerSubFeature.dailyLimit.time}
            onTimeChange={(time) => updateScreenUsageControllerFeature('dailyLimit', true, time)}
            showTime={true}
          />
          <SubFeatureCard
            title="Session limit"
            value={screenUsageControllerSubFeature.sessionLimit.enabled}
            onValueChange={(val) => updateScreenUsageControllerFeature('sessionLimit', val)}
            timeValue={screenUsageControllerSubFeature.sessionLimit.time}
            onTimeChange={(time) => updateScreenUsageControllerFeature('sessionLimit', true, time)}
            showTime={true}
          />
          <SubFeatureCard
            title="Cooldown period"
            value={screenUsageControllerSubFeature.cooldown.enabled}
            onValueChange={(val) => updateScreenUsageControllerFeature('cooldown', val)}
            timeValue={screenUsageControllerSubFeature.cooldown.time}
            onTimeChange={(time) => updateScreenUsageControllerFeature('cooldown', true, time)}
            showTime={true}
          />
          {/* <SubFeatureCard
              title="Warning overlay"
              value={screenUsageControllerSubFeature.warningOverlay.enabled}
              onValueChange={(val) => updateScreenUsageControllerFeature('warningOverlay', val)}
              timeValue={screenUsageControllerSubFeature.warningOverlay.time}
              onTimeChange={(time) => updateScreenUsageControllerFeature('warningOverlay', true, time)}
              showTime={true}
            /> 
        </FeatureCard>*/}

        {/* Section Blocker */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.82}
          onPress={() => navigation.navigate('SectionBlocker')}
        >
          <View style={styles.mainFeatureRow}>
            <Ionicons name="ban-outline" size={32} color="#0A2E5B" />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.sectionBlockerCardTitle}>Section Blocker</Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                Block Reels, Shorts, Stories & more
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

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
    // flex: 1,
    marginTop: 20,
    paddingHorizontal: 20,
    gap: 20
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
    flexDirection: "column",
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
  sectionBlockerCardTitle: {
    flex: 1,
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

  /* Setup Card */
  setupCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  actionButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  pathContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#F0F4F8",
    borderRadius: 8,
  },
  pathLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  pathText: {
    fontSize: 13,
    color: "#333",
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

});

export default FeaturesScreen;