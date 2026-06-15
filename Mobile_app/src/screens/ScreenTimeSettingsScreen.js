// ScreenUsageController.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  NativeModules,
  AppState,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useCallback, useRef } from 'react';
const { ScreenController } = NativeModules;
import { useRoute } from '@react-navigation/native';

const TIME_OPTIONS = [0.75, 1, 10, 15, 20, 30, 45, 60, 90, 120, 180];
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

const ScreenTimeSettingsScreen = ({ navigation }) => {

  const appState = useRef(AppState.currentState);
  const route = useRoute();
  const { appName, packageName } = route.params;
  const [screenUsageControllerSubFeature, setScreenUsageControllerSubFeature] = useState({
      dailyLimit: { enabled: false, time: 30 },
      sessionLimit: { enabled: false, time: 10 },
      cooldown: { enabled: false, time: 15 }
    });

  const handleBackPress = () => {
    if (navigation) {
      navigation.goBack();
    }
  };

  // Fetch this app's saved limits from Java SharedPreferences (keyed by packageName).
  const fetchSettingsFromNative = useCallback(async () => {
    if (Platform.OS !== 'android' || !ScreenController?.getServiceSettings || !packageName) return;

    try {
      const settings = await ScreenController.getServiceSettings(packageName);
      if (settings) {
        setScreenUsageControllerSubFeature({
          dailyLimit: {
            enabled: settings.dailyLimit_enabled || false,
            time: settings.dailyLimit_time || 30,
          },
          sessionLimit: {
            enabled: settings.sessionLimit_enabled || false,
            time: settings.sessionLimit_time || 10,
          },
          cooldown: {
            enabled: settings.cooldown_enabled || false,
            time: settings.cooldown_time || 15,
          },
        });
      }
    } catch (e) {
      console.error("Failed to fetch settings:", e);
    }
  }, [packageName]);

  // Load on mount and again whenever the user returns from system settings.
  useEffect(() => {
    fetchSettingsFromNative();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        fetchSettingsFromNative();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [fetchSettingsFromNative]);

  const syncSettingsToNative = async (featureKey, enabled, time) => {
    if (!packageName) return;
    try {
      if (ScreenController && ScreenController.updateServiceSettings) {
        await ScreenController.updateServiceSettings(packageName, featureKey, enabled, time);
      }
    } catch (e) {
      console.error("Sync Error:", e);
    }
  };

  const updateScreenUsageControllerFeature = (feature, enabled, time) => {
    const newTime = time || screenUsageControllerSubFeature[feature].time;

    setScreenUsageControllerSubFeature((prev) => ({
      ...prev,
      [feature]: { enabled, time: newTime },
    }));

    // Persist this sub-feature for this package immediately on toggle / time change.
    syncSettingsToNative(feature, enabled, newTime);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#0A2E5B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{appName}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  subFeatureCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  subFeatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subFeatureTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0A2E5B',
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

export default ScreenTimeSettingsScreen;