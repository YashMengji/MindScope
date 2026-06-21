// HomeScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  TouchableOpacity,
  AppState,
  NativeModules,
  InteractionManager,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GoalRing from '../components/GoalRing';

const { DigitalWellbeingModule } = NativeModules;
const { width: screenWidth } = Dimensions.get('window');

const GOAL_STORAGE_KEY = 'dailyGoalMinutes';
const DEFAULT_GOAL_MINUTES = 180;

const HomeScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(null); // null = unknown
  const [wellbeingData, setWellbeingData] = useState({
    appUsage: [],
    totalScreenTime: 0,
    totalSessions: 0,
    avgSessionDuration: 0,
  });
  const [dailyTrend, setDailyTrend] = useState([]); // [{ date, label, totalMinutes }]
  const [hourlyToday, setHourlyToday] = useState([]); // [{ hour, minutes }]
  const [trendMode, setTrendMode] = useState('week'); // 'week' | 'today'
  const [goalMinutes, setGoalMinutes] = useState(DEFAULT_GOAL_MINUTES);
  const [tooltipVisible, setTooltipVisible] = useState(null);

  const appState = useRef(AppState.currentState);

  // ----- Goal persistence -----
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(GOAL_STORAGE_KEY);
        if (stored != null) setGoalMinutes(parseInt(stored, 10));
      } catch (e) {
        console.warn('Failed to load goal', e);
      }
    })();
  }, []);

  const handleChangeGoal = async (minutes) => {
    setGoalMinutes(minutes);
    try {
      await AsyncStorage.setItem(GOAL_STORAGE_KEY, String(minutes));
    } catch (e) {
      console.warn('Failed to save goal', e);
    }
  };

  // ----- Data loading -----
  const loadData = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setLoading(false);
      setPermissionGranted(false);
      processWellbeingData(generateMockData());
      return;
    }

    try {
      setLoading(true);

      let granted = true;
      if (DigitalWellbeingModule?.hasUsageAccessPermission) {
        granted = await DigitalWellbeingModule.hasUsageAccessPermission();
      }
      setPermissionGranted(granted);

      if (!granted) {
        setLoading(false);
        return;
      }

      const [usage, trend, hourly] = await Promise.all([
        DigitalWellbeingModule.getAppUsageStats('daily'),
        DigitalWellbeingModule.getDailyUsageTrend(7),
        DigitalWellbeingModule.getHourlyUsageToday(),
      ]);

      processWellbeingData(usage);
      setDailyTrend(Array.isArray(trend) ? trend : []);
      setHourlyToday(Array.isArray(hourly) ? hourly : []);
    } catch (error) {
      console.error('Error fetching digital wellbeing data:', error);
      // Graceful fallback so the screen is never empty.
      processWellbeingData(generateMockData());
      setDailyTrend(generateMockTrend());
      setHourlyToday(generateMockHourly());
    } finally {
      setLoading(false);
    }
  }, []);

  // Defer the heavy native usage-stats queries until AFTER the launch
  // navigation/animations have settled. This lets the app become interactive
  // immediately; the home metrics then populate in the background.
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      loadData();
    });
    return () => task.cancel();
  }, [loadData]);

  // Re-check permission / refresh when returning from system settings.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        loadData();
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [loadData]);

  const handleEnablePermission = () => {
    if (DigitalWellbeingModule?.openUsageAccessSettings) {
      DigitalWellbeingModule.openUsageAccessSettings();
    }
  };

  const processWellbeingData = (rawData) => {
    const systemAppNames = ['System UI', 'Android System', 'Launcher', 'Quickstep'];

    const appUsage = (rawData.apps || [])
      .filter((app) => !systemAppNames.includes(app.name) && app.usage >= 1)
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 8);

    const totalScreenTime = appUsage.reduce((sum, app) => sum + app.usage, 0);

    setWellbeingData({
      appUsage,
      totalScreenTime,
      totalSessions: rawData.totalSessions || 0,
      avgSessionDuration: rawData.avgSessionDuration || 0,
    });
  };

  // ----- Mock fallbacks -----
  const generateMockData = () => ({
    apps: [
      { name: 'YouTube', packageName: 'com.google.android.youtube', usage: 55, sessions: 3 },
      { name: 'Instagram', packageName: 'com.instagram.android', usage: 49, sessions: 8 },
      { name: 'WhatsApp', packageName: 'com.whatsapp', usage: 24, sessions: 12 },
      { name: 'Chrome', packageName: 'com.android.chrome', usage: 14, sessions: 5 },
      { name: 'Clock', packageName: 'com.android.deskclock', usage: 4, sessions: 1 },
    ],
    totalSessions: 29,
    avgSessionDuration: 5,
  });

  const generateMockTrend = () => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const values = [142, 168, 120, 200, 95, 188, 146];
    return labels.map((label, i) => ({ date: `mock-${i}`, label, totalMinutes: values[i] }));
  };

  const generateMockHourly = () =>
    Array.from({ length: 24 }, (_, hour) => ({
      hour,
      minutes: hour >= 7 && hour <= 23 ? Math.round(10 + 20 * Math.abs(Math.sin(hour))) : 0,
    }));

  // ----- Derived values -----
  const computeStreak = () => {
    if (!dailyTrend.length) return 0;
    // Exclude today (last element); count consecutive prior days under goal.
    let streak = 0;
    for (let i = dailyTrend.length - 2; i >= 0; i--) {
      if (dailyTrend[i].totalMinutes <= goalMinutes) streak++;
      else break;
    }
    return streak;
  };

  const formatScreenTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}mins`;
  };

  const formatSessionDuration = (minutes) => {
    if (minutes >= 60) return `${(minutes / 60).toFixed(1)} hrs`;
    return `${minutes} mins`;
  };

  const getMaxUsage = () => {
    if (wellbeingData.appUsage.length === 0) return 60;
    const maxUsage = Math.max(...wellbeingData.appUsage.map((app) => app.usage));
    if (maxUsage > 60) return Math.ceil(maxUsage / 60) * 60;
    if (maxUsage > 30) return 60;
    if (maxUsage > 15) return 30;
    return Math.ceil(maxUsage / 5) * 5;
  };

  const getBarWidth = (usage) => (usage / getMaxUsage()) * 100;

  const handleBarPress = (app) => {
    setTooltipVisible(app.name);
    setTimeout(() => setTooltipVisible(null), 2000);
  };

  const handleSetTimer = (app) => {
    navigation.navigate('ScreenTimeSettingsScreen', {
      appName: app.name,
      packageName: app.packageName,
    });
  };

  // ----- Chart config -----
  const chartWidth = screenWidth - 64;
  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#4A90E2' },
    propsForBackgroundLines: {
      strokeDasharray: '5, 5',
      stroke: 'rgba(0, 0, 0, 0.05)',
    },
  };

  const buildChartData = () => {
    if (trendMode === 'week') {
      if (!dailyTrend.length) return { labels: ['No Data'], datasets: [{ data: [0] }] };
      return {
        labels: dailyTrend.map((d) => d.label),
        datasets: [{ data: dailyTrend.map((d) => d.totalMinutes) }],
      };
    }
    if (!hourlyToday.length) return { labels: ['No Data'], datasets: [{ data: [0] }] };
    return {
      labels: hourlyToday.map((h) => (h.hour % 4 === 0 ? `${h.hour}` : '')),
      datasets: [{ data: hourlyToday.map((h) => h.minutes) }],
    };
  };

  // ----- Renderers -----
  const renderPermissionCard = () => (
    <View style={styles.permissionCard}>
      <Text style={styles.permissionEmoji}>📊</Text>
      <Text style={styles.permissionTitle}>Enable Usage Access</Text>
      <Text style={styles.permissionText}>
        To show your real screen-time insights, allow Usage Access for this app in
        system settings.
      </Text>
      <TouchableOpacity style={styles.permissionButton} onPress={handleEnablePermission}>
        <Text style={styles.permissionButtonText}>Open Settings</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMetricsCards = () => (
    <View style={styles.metricsContainer}>
      <View style={styles.metricCard}>
        <Text style={styles.metricValue}>{formatScreenTime(wellbeingData.totalScreenTime)}</Text>
        <Text style={styles.metricLabel}>Screen Time</Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={styles.metricValue}>{wellbeingData.totalSessions}</Text>
        <Text style={styles.metricLabel}>Total Sessions</Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={styles.metricValue}>{formatSessionDuration(wellbeingData.avgSessionDuration)}</Text>
        <Text style={styles.metricLabel}>Avg Session</Text>
      </View>
    </View>
  );

  const renderTrendChart = () => (
    <View style={styles.chartContainer}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Usage Trend</Text>
        <View style={styles.toggleGroup}>
          <TouchableOpacity
            style={[styles.toggleButton, trendMode === 'week' && styles.toggleButtonActive]}
            onPress={() => setTrendMode('week')}
          >
            <Text style={[styles.toggleText, trendMode === 'week' && styles.toggleTextActive]}>
              7-Day
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, trendMode === 'today' && styles.toggleButtonActive]}
            onPress={() => setTrendMode('today')}
          >
            <Text style={[styles.toggleText, trendMode === 'today' && styles.toggleTextActive]}>
              Today
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <LineChart
        data={buildChartData()}
        width={chartWidth}
        height={220}
        chartConfig={chartConfig}
        bezier
        fromZero
        yAxisSuffix="m"
        segments={4}
        style={styles.chartStyle}
      />
      <Text style={styles.chartCaption}>
        {trendMode === 'week' ? 'Total screen time per day (minutes)' : "Today's usage by hour (minutes)"}
      </Text>
    </View>
  );

  const renderAppList = () => {
    if (wellbeingData.appUsage.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>
            No usage data available for today yet.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Screen Time by App</Text>
        <View style={styles.barsContainer}>
          {wellbeingData.appUsage.map((app, index) => {
            const barWidth = getBarWidth(app.usage);
            const initial = (app.name || '?').charAt(0).toUpperCase();
            return (
              <View key={index} style={styles.appRow}>
                <View style={styles.appAvatar}>
                  <Text style={styles.appAvatarText}>{initial}</Text>
                </View>
                <View style={styles.appRowMain}>
                  <View style={styles.appRowTop}>
                    <Text style={styles.appName} numberOfLines={1}>{app.name}</Text>
                    <TouchableOpacity
                      style={styles.setTimerButton}
                      onPress={() => handleSetTimer(app)}
                    >
                      <Text style={styles.setTimerText}>Set timer</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.barWrapper}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleBarPress(app)}
                      style={styles.barTouchable}
                    >
                      <View style={[styles.barFill, { width: `${barWidth}%` }]} />
                    </TouchableOpacity>
                    {tooltipVisible === app.name && (
                      <View style={styles.inlineUsage}>
                        <Text style={styles.inlineUsageText}>{formatScreenTime(app.usage)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // While the deferred fetch is still running and we don't yet know the
  // permission state, show the scaffold with a lightweight inline indicator
  // instead of blocking the whole screen.
  const isInitialLoading = loading && permissionGranted === null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Digital Wellbeing</Text>
        <Text style={styles.subtitle}>Today's Usage</Text>
        {loading && (
          <View style={styles.headerLoadingRow}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.headerLoadingText}>Updating…</Text>
          </View>
        )}
      </View>

      {isInitialLoading ? (
        <View style={styles.inlineLoadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Fetching your digital wellbeing data…</Text>
        </View>
      ) : permissionGranted === false ? (
        renderPermissionCard()
      ) : (
        <>
          <GoalRing
            usedMinutes={wellbeingData.totalScreenTime}
            goalMinutes={goalMinutes}
            streak={computeStreak()}
            onChangeGoal={handleChangeGoal}
          />
          {renderMetricsCards()}
          {renderTrendChart()}
          {renderAppList()}

          <View style={styles.insightContainer}>
            <Text style={styles.insightTitle}>💡 Insight</Text>
            <Text style={styles.insightText}>
              {wellbeingData.totalScreenTime > goalMinutes
                ? 'You have passed your daily goal. Consider setting app timers to wind down.'
                : wellbeingData.totalScreenTime > goalMinutes * 0.66
                ? "You're approaching your daily goal. Try a short break."
                : "You're well within your goal today. Keep up the healthy habits!"}
            </Text>
          </View>
        </>
      )}

      <View style={styles.footer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  inlineLoadingContainer: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  headerLoadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#FFFFFF',
  },
  header: {
    padding: 20,
    paddingBottom: 28,
    backgroundColor: '#4a91e2',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#E0E0E0',
    marginTop: 4,
  },
  permissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  permissionEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C4A6E',
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C4A6E',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F0F3F7',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#4A90E2',
  },
  toggleText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  chartStyle: {
    borderRadius: 12,
    marginLeft: -8,
  },
  chartCaption: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  barsContainer: {
    width: '100%',
    marginTop: 8,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  appAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F1FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A90E2',
  },
  appRowMain: {
    flex: 1,
  },
  appRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  appName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginRight: 8,
  },
  setTimerButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#EAF2FB',
  },
  setTimerText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
  },
  barWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  barTouchable: {
    flex: 1,
  },
  barFill: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4A90E2',
  },
  inlineUsage: {
    marginLeft: 8,
  },
  inlineUsageText: {
    fontSize: 12,
    color: '#2C4A6E',
    fontWeight: '600',
  },
  noDataContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    margin: 16,
    padding: 20,
    alignItems: 'center',
  },
  noDataText: {
    color: '#E67E22',
    textAlign: 'center',
    fontSize: 14,
  },
  insightContainer: {
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C4A6E',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  footer: {
    height: 30,
  },
});

export default HomeScreen;
