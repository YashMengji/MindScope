import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl, // Added for pull-to-refresh
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NativeCallRecordingService from '../bridge/NativeCallRecordingService';
import { analyzeVoiceRecording, uploadBatchRecordings, saveInferenceResult, fetchRecordingByName, fetchVoiceInferencePerUser } from '../services/VoiceRecordingService'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import VoiceToxicityChart from '../components/VoiceToxicityChart';
import DateSelector from '../components/DateSelector';

const VoiceAnalysisScreen = ({ selectedDirectory, setSelectedDirectory }) => {
  const insets = useSafeAreaInsets();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // Replaces isUploading
  const [voiceInferences, setVoiceInferences] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch whenever the selected date changes (the change is only committed
  // when the user taps "Done" in the date selector).
  useEffect(() => {
    const fetchData = async () => {
      const { data } = await fetchVoiceInferencePerUser(selectedDate);
      setVoiceInferences(data?.data || null);
    };

    fetchData();
  }, [selectedDate]);

  const uploadToServer = async (results) => {
    for (const result of results) {
      if (!result.fileName) continue;
      
      const fileExist = await fetchRecordingByName(result.fileName);

      if (fileExist.success !== true && result.status === 'uploaded') {
        await saveInferenceResult(result);
        const { data } = await fetchVoiceInferencePerUser(selectedDate);
        setVoiceInferences(data?.data || null);
      }
    }
  };

  // --- Pull to Refresh Logic (Replaces the Sync Button) ---
  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      // 1. If directory is selected, attempt to find and upload new calls
      if (selectedDirectory && NativeCallRecordingService.isAvailable()) {
        const todaysFiles = await NativeCallRecordingService.getTodaysRecordings();

        if (todaysFiles && todaysFiles.length > 0) {
          // Perform Batch Upload silently
          const results = await uploadBatchRecordings(todaysFiles);
          await uploadToServer(results);
        }
      }

      // 2. Always fetch the latest data from the backend to refresh the chart
      const { data } = await fetchVoiceInferencePerUser(selectedDate);
      setVoiceInferences(data?.data || null);

    } catch (error) {
      console.error("Sync error during refresh:", error);
    } finally {
      setRefreshing(false);
    }
  }, [selectedDirectory, selectedDate]);


  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Voice Call Analysis</Text>
        <Text style={styles.headerSubtitle}>
          Pull down to sync and analyze recent calls
        </Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0A2E5B"]} // Android spinner color
            tintColor={"#0A2E5B"} // iOS spinner color
          />
        }
      >
        {/* Date Selector — fetch fires only when "Done" is pressed */}
        <DateSelector
          selectedDate={selectedDate}
          onConfirm={(date) => setSelectedDate(date)}
        />

        <VoiceToxicityChart title="Voice call toxicity" data={voiceInferences} />
        
        {/* Analysis Loading State */}
        {isAnalyzing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0A2E5B" />
            <Text style={styles.loadingText}>Analyzing recording...</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    backgroundColor: "#F8F9FA",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333333",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  /* Status Card */
  statusCard: {
    marginTop: 20,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0A2E5B",
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 14,
    color: "#333",
  },

  /* Setup Card */
  setupCard: {
    marginTop: 20,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0A2E5B",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
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

  /* Monitoring Card */
  monitoringCard: {
    marginTop: 30,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  monitoringTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0A2E5B",
    marginBottom: 8,
  },
  monitoringDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
  monitoringButton: {
    backgroundColor: "#0A2E5B",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  // New style for sync button
  syncButton: {
    backgroundColor: "#673AB7", // Purple color to distinguish
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  monitoringActiveButton: {
    backgroundColor: "#F44336",
  },
  monitoringDisabledButton: {
    backgroundColor: "#B0BEC5",
  },
  monitoringButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  monitoringStatus: {
    marginTop: 12,
    fontSize: 12,
    color: "#0A2E5B",
    textAlign: "center",
    fontWeight: "600",
  },
  warningText: {
    marginTop: 10,
    fontSize: 12,
    color: "#FF9800",
    textAlign: "center",
  },

  /* Recordings List Styles */
  recordingsListContainer: {
    marginTop: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginBottom: 15,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyListText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  fileIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  fileName: {
    fontSize: 14,
    color: '#444',
    flex: 1,
  },

  /* Loading */
  loadingContainer: {
    marginTop: 30,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },
});

export default VoiceAnalysisScreen;