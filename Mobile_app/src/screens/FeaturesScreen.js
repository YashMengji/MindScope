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
  Linking, // To open app settings
  Platform, // To check if the OS is Android
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useContext , useCallback, useEffect} from "react";
import { AuthContext } from "../context/AuthContext";

// Define Native Modules
const { ChatAccessibility, CallAnalysis } = NativeModules;
// --- This is a helper component for the feature cards ---
const FeatureCard = ({ iconName, title, value, onValueChange }) => {
  return (
    <View style={styles.card}>
      <Ionicons name={iconName} size={32} color="#0A2E5B" />
      <Text style={styles.cardTitle}>{title}</Text>
      <Switch
        trackColor={{ false: "#E0E0E0", true: "#4A90E2" }}
        thumbColor={value ? "#FFFFFF" : "#f4f3f4"}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
};

// --- Main Screen Component ---
const FeaturesScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);
  // --- Permission Handlers ---

  const [chatAnalysisEnabled, setChatAnalysisEnabled] = useState(false);
  const [voicePermissions, setVoicePermissions] = useState({
    READ_PHONE_STATE: false,
    RECORD_AUDIO: false,
    WRITE_STORAGE: false,
    READ_STORAGE: false,
    ALL_GRANTED: false
  });
  const [isVoiceCallPermissionEnabled, setIsVoiceCallPermissionEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- 1. CHAT ACCESSIBILITY LOGIC ---
  // Checks if the Chat Accessibility Service is enabled.
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
             setChatAnalysisEnabled(false); // Optimistically set to false in app state
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
  // Checks the status of READ_PHONE_STATE and RECORD_AUDIO permissions.
  const checkVoiceStatus = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    if (Platform.OS !== 'android' || !CallAnalysis || !CallAnalysis.checkPermissions) return;
    try {
      // Use the native module to check current status
      const status = await CallAnalysis.checkPermissions();
      // Update the main toggle state based on the ALL_GRANTED flag from the native module
      setIsVoiceCallPermissionEnabled(status.ALL_GRANTED); 
      console.log("Checked voice permissions via CallAnalysisModule:", status.ALL_GRANTED);
    } catch (error) {
      console.error("Failed to check Voice permissions:", error);
      setIsVoiceCallPermissionEnabled(false);
    }
  }, []);

  // Requests the two necessary runtime permissions for call detection/recording.
  const requestVoicePermissions = async (newValue) => {
    if (Platform.OS !== 'android') return;

    // --- LOGIC 1: Toggle OFF (Manual Revocation Required) ---
    if (!newValue) {
      // Save the new state (DISABLED) to SharedPreferences
      await CallAnalysis.setVoiceFeatureEnabled(false);
      // Set state to false to stop the feature logic immediately
      setIsVoiceCallPermissionEnabled(false);
      
      // POP-UP CONFIRMATION & EXPLANATION FOR REVOKING PERMISSIONS
      Alert.alert(
          "Feature Deactivated & Permissions", 
          "Voice Analysis is OFF. To fully deny Microphone and Phone access, you must manually revoke them in App Settings.",
          [
            { text: "Cancel", style: "cancel" },
            // Navigate the user to the only place they can deny permissions
            { text: "Open App Settings", onPress: () => Linking.openSettings() },
          ]
      );
      return;
    }

    // --- LOGIC 2: Toggle ON (Request Permissions) ---
    const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, // <-- To save the file
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    ]);

    const readGranted = results[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === PermissionsAndroid.RESULTS.GRANTED;
    const recordGranted = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
    const writeStorageGranted = results[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED;
    const readStorageGranted = results[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED;
    
    const allGranted = readGranted && recordGranted && writeStorageGranted && readStorageGranted;

    if (allGranted) {
      // Save the new state (ENABLED) to SharedPreferences
      await CallAnalysis.setVoiceFeatureEnabled(true);
      setIsVoiceCallPermissionEnabled(true);
      // POP-UP CONFIRMATION FOR ACTIVATION
      Alert.alert("Feature Activated", "Voice Call Analysis is ON! Microphone and Phone access granted.");
    } else {
        console.warn("Not all permissions granted:", results);
        
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
        
        // Final status check to ensure the UI reflects the true state (OFF)
        setIsVoiceCallPermissionEnabled(false); 
    }
  };

  // --- HANDLER FUNCTIONS FOR TOGGLES ---
  const handleVoiceToggle = (newValue) => {
    // The switch value is passed as newValue
    requestVoicePermissions(newValue);
  };

  const handleChatToggle = (newValue) => {
    // The chat feature requires navigation to system settings regardless of state change.
    openChatSettings(!newValue); // Pass the intended *new* state to the handler
  };

  // --- INITIAL LOAD AND REFRESH ---
  useEffect(() => {
    const loadStatus = async () => {
        setLoading(true);
        // Load both feature statuses
        await checkChatStatus();
        await checkVoiceStatus();
        setLoading(false);
    };

    loadStatus();

    // Set up interval to periodically check accessibility status 
    // because the user enables it outside the app
    const interval = setInterval(checkChatStatus, 2000); 

    return () => clearInterval(interval);
  }, [checkChatStatus, checkVoiceStatus]);
  
  if (loading) {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Checking feature statuses...</Text>
        </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            Hi {user ? user.name : "Default"}!
          </Text>
          <Text style={styles.headerSubtitle}>
            give your mental health a check
          </Text>
        </View>
        <Image
          source={require("../assets/default.png")}
          style={styles.avatar}
        />
      </View>

      <View style={styles.featuresContainer}>
        <FeatureCard
          iconName="mic-outline"
          title="Voice call analysis"
          value={isVoiceCallPermissionEnabled}
          onValueChange={handleVoiceToggle}
        />
        <FeatureCard
          iconName="chatbubble-ellipses-outline"
          title="Chat message analysis"
          value={chatAnalysisEnabled}
          onValueChange={handleChatToggle}
        />
        {/* <FeatureCard
          iconName="phone-portrait-outline"
          title="Screen Usage Check"
          value={isScreenUsageEnabled}
          onValueChange={handleScreenUsageToggle}
        />

        <FeatureCard
          iconName="play-back-outline"
          title="Run in Background"
          value={isBackgroundEnabled}
          onValueChange={handleBackgroundToggle}
        />

        {/* New Display Over Other Apps Feature 
        <FeatureCard
          iconName="eye-outline"
          title="Active Tracking Indicator"
          value={isOverlayEnabled}
          onValueChange={handleOverlayToggle}
        /> */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  cardTitle: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#0A2E5B",
  },
});

export default FeaturesScreen;
