// HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform,
  TouchableOpacity
} from 'react-native';
import { NativeModules } from 'react-native';

const { DigitalWellbeingModule } = NativeModules;
const { width: screenWidth } = Dimensions.get('window');

const HomeScreen = () => {
  const [loading, setLoading] = useState(true);
  const [wellbeingData, setWellbeingData] = useState({
    appUsage: [],
    totalScreenTime: 0,
    totalSessions: 0,
    avgSessionDuration: 0
  });
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [tooltipVisible, setTooltipVisible] = useState(null);

  useEffect(() => {
    if (Platform.OS === 'android') {
      fetchDigitalWellbeingData();
    } else {
      setLoading(false);
      Alert.alert('Info', 'Digital Wellbeing data is only available on Android devices.');
    }
  }, [selectedPeriod]);

  const fetchDigitalWellbeingData = async () => {
    try {
      setLoading(true);
      const mockData = generateMockData();
        processWellbeingData(mockData);
      // if (Platform.OS === 'android' && DigitalWellbeingModule && DigitalWellbeingModule.getAppUsageStats) {
      //   const data = await DigitalWellbeingModule.getAppUsageStats(selectedPeriod);
      //   console.log('Data from native module:', JSON.stringify(data));
      //   processWellbeingData(data);
      // } else {
      //   const mockData = generateMockData();
      //   processWellbeingData(mockData);
      // }
    } catch (error) {
      console.error('Error fetching digital wellbeing data:', error);
      Alert.alert('Error', 'Unable to fetch digital wellbeing data. Please ensure permissions are granted.');
      const mockData = generateMockData();
      processWellbeingData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const processWellbeingData = (rawData) => {
    // Log the raw data to debug
    console.log('Raw data received:', JSON.stringify(rawData));
    
    // Define system apps to filter out (only obvious system apps)
    const systemAppNames = ['System UI', 'Android System', 'Launcher', 'Quickstep'];
    
    let appUsage = (rawData.apps || [])
      .filter(app => {
        // Filter out system apps by name only
        const isSystemApp = systemAppNames.includes(app.name);
        return !isSystemApp && app.usage >= 1;
      })
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 8);
    
    // Log filtered apps to debug
    console.log('Filtered apps:', JSON.stringify(appUsage));
    
    const totalScreenTime = appUsage.reduce((sum, app) => sum + app.usage, 0);
    
    setWellbeingData({
      appUsage: appUsage,
      totalScreenTime: totalScreenTime,
      totalSessions: rawData.totalSessions || 0,
      avgSessionDuration: rawData.avgSessionDuration || 0
    });
  };

  const generateMockData = () => {
    return {
      apps: [
        { name: 'YouTube', usage: 55, sessions: 3 },
        { name: 'MindScope', usage: 49, sessions: 8 },
        { name: 'Interval Timer', usage: 8, sessions: 2 },
        { name: 'WhatsApp', usage: 4, sessions: 12 },
        { name: 'Clock', usage: 1, sessions: 1 }
      ],
      totalSessions: 26,
      avgSessionDuration: 4
    };
  };

  const formatScreenTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}mins`;
  };

  const formatSessionDuration = (minutes) => {
    if (minutes >= 60) {
      const hours = minutes / 60;
      return `${hours.toFixed(1)} hrs`;
    }
    return `${minutes} mins`;
  };

  const getMaxUsage = () => {
    if (wellbeingData.appUsage.length === 0) return 60;
    const maxUsage = Math.max(...wellbeingData.appUsage.map(app => app.usage));
    if (maxUsage > 60) {
      return Math.ceil(maxUsage / 60) * 60;
    } else if (maxUsage > 30) {
      return 60;
    } else if (maxUsage > 15) {
      return 30;
    } else {
      return Math.ceil(maxUsage / 5) * 5;
    }
  };

  const getXAxisLabel = () => {
    const maxUsage = getMaxUsage();
    if (maxUsage >= 60) {
      const hours = maxUsage / 60;
      return `${hours}hrs`;
    }
    return `${maxUsage}mins`;
  };

  const getBarWidth = (usage) => {
    const maxUsage = getMaxUsage();
    return (usage / maxUsage) * 100;
  };

  const handleBarPress = (app) => {
    setTooltipVisible(app.name);
    setTimeout(() => {
      setTooltipVisible(null);
    }, 2000);
  };

  const renderMetricsCards = () => {
    return (
      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {formatScreenTime(wellbeingData.totalScreenTime)}
          </Text>
          <Text style={styles.metricLabel}>Total Screen Time</Text>
        </View>
        
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {wellbeingData.totalSessions}
          </Text>
          <Text style={styles.metricLabel}>Total Sessions</Text>
        </View>
        
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {formatSessionDuration(wellbeingData.avgSessionDuration)}
          </Text>
          <Text style={styles.metricLabel}>Avg Session Duration</Text>
        </View>
      </View>
    );
  };

  const renderHorizontalBarChart = () => {
    if (wellbeingData.appUsage.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>
            No usage data available for today. Please ensure usage access is enabled.
          </Text>
        </View>
      );
    }

    const maxUsage = getMaxUsage();
    const xAxisLabel = getXAxisLabel();

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Screen Time by App</Text>
        
        <View style={styles.xAxisHeader}>
          <Text style={styles.xAxisTitle}>Time ({maxUsage >= 60 ? 'hrs' : 'mins'}) →</Text>
          <Text style={styles.xAxisEndLabel}>{xAxisLabel}</Text>
        </View>
        
        <View style={styles.barsContainer}>
          {wellbeingData.appUsage.map((app, index) => {
            const barWidth = getBarWidth(app.usage);
            
            return (
              <View key={index} style={styles.barRow}>
                <Text style={styles.appName} numberOfLines={1}>
                  {app.name}
                </Text>
                
                <View style={styles.barWrapper}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleBarPress(app)}
                    style={styles.barTouchable}
                  >
                    <View style={[styles.barFill, { width: `${barWidth}%` }]} />
                  </TouchableOpacity>
                  
                  {tooltipVisible === app.name && (
                    <View 
                      style={[
                        styles.tooltip,
                        { left: `${barWidth}%` }
                      ]}
                    >
                      <Text style={styles.tooltipText}>
                        {formatScreenTime(app.usage)}
                      </Text>
                      <View style={styles.tooltipArrow} />
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Fetching your digital wellbeing data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Digital Wellbeing</Text>
        <Text style={styles.subtitle}>
          {selectedPeriod === 'daily' ? "Today's Usage" : "This Week's Usage"}
        </Text>
      </View>

      {renderMetricsCards()}
      {renderHorizontalBarChart()}

      <View style={styles.insightContainer}>
        <Text style={styles.insightTitle}>💡 Insight</Text>
        <Text style={styles.insightText}>
          {wellbeingData.totalScreenTime > 240 
            ? "Your screen time is higher than recommended. Consider taking regular breaks and setting app timers."
            : wellbeingData.totalScreenTime > 120
            ? "Moderate screen usage. Try to take short breaks every hour."
            : "You're maintaining healthy screen habits! Keep being mindful of your digital wellbeing."}
        </Text>
      </View>

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
  header: {
    padding: 20,
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
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: -20,
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
    fontSize: 20,
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
    overflow: 'hidden',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  xAxisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  xAxisTitle: {
    fontSize: 12,
    color: '#666',
  },
  xAxisEndLabel: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
  barsContainer: {
    width: '100%',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    width: 90,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginRight: 12,
  },
  barWrapper: {
    flex: 1,
    position: 'relative',
  },
  barTouchable: {
    width: '100%',
  },
  barFill: {
    height: 32,
    backgroundColor: '#4A90E2',
  },
  tooltip: {
    position: 'absolute',
    top: -40,
    backgroundColor: '#333',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 80,
    alignItems: 'center',
    zIndex: 1000,
    transform: [{ translateX: -40 }],
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#333',
    alignSelf: 'center',
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