import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Switch,
  TouchableOpacity,
  Alert,
  Linking, // To open app settings
  NativeModules, // To access your custom native code
  Platform, // To check if the OS is Android
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";

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
  const [isVoiceEnabled, setVoiceEnabled] = useState(false);
  const [isChatEnabled, setChatEnabled] = useState(false);
  const [isScreenUsageEnabled, setScreenUsageEnabled] = useState(false);
  const [isBackgroundEnabled, setBackgroundEnabled] = useState(false);
  const [isOverlayEnabled, setOverlayEnabled] = useState(false);

  // --- Permission Handlers ---

  // 1. Voice Call Check (Microphone Permission)
  const handleVoiceToggle = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status === "granted") {
      setVoiceEnabled((previousState) => !previousState);
      Alert.alert("Success", "Microphone permission granted!");
    } else {
      Alert.alert(
        "Permission Denied",
        "To use this feature, you need to enable microphone access in your settings.",
        [{ text: "Open Settings", onPress: () => Linking.openSettings() }]
      );
    }
  };

  // 2. Chat Mood Check (Accessibility Service)
  const handleChatToggle = () => {
    if (Platform.OS !== "android") {
      return Alert.alert(
        "Unsupported",
        "This feature is only available on Android."
      );
    }
    const { ChatAccessibilityModule } = NativeModules;
    if (ChatAccessibilityModule) {
      ChatAccessibilityModule.requestAccessibilityPermission();
      setChatEnabled((previousState) => !previousState);
    } else {
      Alert.alert(
        "Error",
        "Chat Accessibility Module not found. Make sure it is linked correctly."
      );
    }
  };

  // 3. Screen Usage Check (Usage Stats Permission)
  const handleScreenUsageToggle = () => {
    if (Platform.OS !== "android") {
      return Alert.alert(
        "Unsupported",
        "This feature is only available on Android."
      );
    }
    const { UsageStatsModule } = NativeModules;
    if (UsageStatsModule) {
      UsageStatsModule.requestUsageStatsPermission();
      setScreenUsageEnabled((previousState) => !previousState);
    } else {
      Alert.alert(
        "Error",
        "Usage Stats Module not found. This requires custom native Android code."
      );
    }
  };

  // 4. Background Run Permission
  const handleBackgroundToggle = () => {
    if (Platform.OS !== "android") {
      return Alert.alert(
        "Unsupported",
        "This feature is only available on Android."
      );
    }

    Alert.alert(
      "Background Operation",
      "This allows the app to run in background for continuous mental health monitoring. You'll need to disable battery optimization for this app.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setBackgroundEnabled(false),
        },
        {
          text: "Open Settings",
          onPress: () => {
            if (Platform.OS === "android") {
              Linking.openSettings();
              setBackgroundEnabled(true);
            }
          },
        },
        {
          text: "Grant Permission",
          onPress: () => {
            if (Platform.OS === "ios") {
              Alert.alert(
                "iOS Background Mode",
                "iOS automatically manages background operations. Make sure Background App Refresh is enabled in Settings."
              );
            } else {
              const { BackgroundModule } = NativeModules;
              if (BackgroundModule) {
                BackgroundModule.requestIgnoreBatteryOptimization();
                setBackgroundEnabled(true);
                Alert.alert(
                  "Background Permission",
                  "Please disable battery optimization for this app in the next screen to allow background operation."
                );
              } else {
                Linking.openSettings();
                setBackgroundEnabled(true);
              }
            }
          },
        },
      ]
    );
  };

  // 5. Display Over Other Apps Permission
  const handleOverlayToggle = () => {
    if (Platform.OS !== "android") {
      return Alert.alert(
        "Unsupported",
        "This feature is only available on Android."
      );
    }

    Alert.alert(
      "Display Over Other Apps",
      "This will show a small floating icon when the app is tracking your mood. It helps you know when the app is actively monitoring.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setOverlayEnabled(false),
        },
        {
          text: "Open Settings",
          onPress: () => {
            // Directly open overlay permission settings for Android
            if (Platform.OS === "android") {
              Linking.openSettings();
              setOverlayEnabled(true);
            }
          },
        },
        {
          text: "Grant Permission",
          onPress: async () => {
            if (Platform.OS === "android") {
              try {
                // Try to use a native module for overlay permission
                const { OverlayModule } = NativeModules;
                if (OverlayModule && OverlayModule.requestOverlayPermission) {
                  const granted =
                    await OverlayModule.requestOverlayPermission();
                  if (granted) {
                    setOverlayEnabled(true);
                    Alert.alert(
                      "Overlay Permission Granted",
                      "The app can now display over other apps. A small indicator will appear when tracking is active."
                    );
                  } else {
                    setOverlayEnabled(false);
                    Alert.alert(
                      "Permission Required",
                      "Please enable 'Display over other apps' permission in settings to use this feature.",
                      [
                        {
                          text: "Open Settings",
                          onPress: () => Linking.openSettings(),
                        },
                      ]
                    );
                  }
                } else {
                  // Fallback to opening settings
                  Linking.openSettings();
                  setOverlayEnabled(true);
                }
              } catch (error) {
                console.error("Error requesting overlay permission:", error);
                Linking.openSettings();
                setOverlayEnabled(true);
              }
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Hi Steve!</Text>
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
          title="Voice Call Check"
          value={isVoiceEnabled}
          onValueChange={handleVoiceToggle}
        />
        <FeatureCard
          iconName="chatbubble-ellipses-outline"
          title="Chat Mood Check"
          value={isChatEnabled}
          onValueChange={handleChatToggle}
        />
        <FeatureCard
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

        {/* New Display Over Other Apps Feature */}
        <FeatureCard
          iconName="eye-outline"
          title="Active Tracking Indicator"
          value={isOverlayEnabled}
          onValueChange={handleOverlayToggle}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
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
