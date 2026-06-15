import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  NativeModules,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Ionicons } from "@expo/vector-icons";

const { DigitalWellbeingModule } = NativeModules;

const FALLBACK_APPS = [
  { name: 'YouTube', packageName: 'com.google.android.youtube' },
  { name: 'Instagram', packageName: 'com.instagram.android' },
];

const AppSelectorScreen = ({ navigation }) => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadApps = async () => {
      if (Platform.OS !== 'android' || !DigitalWellbeingModule?.getAppUsageStats) {
        setApps(FALLBACK_APPS);
        setLoading(false);
        return;
      }
      try {
        const data = await DigitalWellbeingModule.getAppUsageStats('daily');
        const systemAppNames = ['System UI', 'Android System', 'Launcher', 'Quickstep'];
        const realApps = (data.apps || [])
          .filter((app) => !systemAppNames.includes(app.name) && app.usage >= 1)
          .sort((a, b) => b.usage - a.usage)
          .map((app) => ({ name: app.name, packageName: app.packageName }));
        setApps(realApps.length ? realApps : FALLBACK_APPS);
      } catch (e) {
        console.error('Failed to load apps:', e);
        setApps(FALLBACK_APPS);
      } finally {
        setLoading(false);
      }
    };
    loadApps();
  }, []);

  const handleInfoPress = () => {
    console.log('Info pressed');
  };

  const handleSetTimerPress = (app) => {
    navigation.navigate("ScreenTimeSettingsScreen", {
      appName: app.name,
      packageName: app.packageName,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons onPress={() => navigation.goBack()} style={styles.backArrowIcon} name="chevron-back" size={22} color="#9CA3AF" />

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Screen Time Controller</Text>
          <Text style={styles.headerSubtitle}>App specific timer</Text>
        </View>
      </View>

      {/* Description Row */}
      <View style={styles.descriptionRow}>
        <TouchableOpacity onPress={handleInfoPress} style={styles.infoIcon}>
          <Icon name="info-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.descriptionText}>Select app to apply individual timer</Text>
      </View>

      {/* App List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading your apps...</Text>
        </View>
      ) : (
        <ScrollView style={styles.appListContainer}>
          {apps.map((app, index) => {
            const initial = (app.name || '?').charAt(0).toUpperCase();
            return (
              <View key={app.packageName || index} style={styles.appItem}>
                <View style={styles.appInfo}>
                  <View style={styles.appAvatar}>
                    <Text style={styles.appAvatarText}>{initial}</Text>
                  </View>
                  <Text style={styles.appName} numberOfLines={1}>{app.name}</Text>
                </View>

                <View style={styles.timerControls}>
                  <TouchableOpacity
                    onPress={() => handleSetTimerPress(app)}
                    style={styles.setTimerButton}
                  >
                    <Text style={styles.setTimerText}>Set timer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    display: "flex",
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backArrowIcon: {
    padding: 6,
    backgroundColor: "#e6f1ff",
    borderRadius: 50,
    display: "flex",
    alignContent: "center",
    justifyContent: "center"
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  descriptionText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '400',
  },
  infoIcon: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  appListContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appAvatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#E8F1FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A90E2',
  },
  appName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setTimerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
  },
  setTimerText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default AppSelectorScreen;
