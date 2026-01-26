import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NativeCallRecordingService from '../bridge/NativeCallRecordingService';
import { analyzeVoiceRecording, uploadBatchRecordings } from '../services/VoiceRecordingService'; // Updated import
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveInferenceResult } from '../services/VoiceRecordingService';
import { fetchRecordingByName } from '../services/VoiceRecordingService';
import ToxicityChart from '../components/ToxicityChart';
import {fetchVoiceInferencePerUser} from '../services/VoiceRecordingService';

const VoiceAnalysisScreen = () => {
  const insets = useSafeAreaInsets();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // New state for upload
  const [voiceInferences, setVoiceInferences] = useState(null);
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [monitoring, setMonitoring] = useState(false);

  // State for directory selection
  const [selectedDirectory, setSelectedDirectory] = useState(null);
  // State for storing the list of recording objects
  const [recordingList, setRecordingList] = useState([]);

  const recordingSubscription = useRef(null);
  const DIRECTORY_KEY = '@HealthSync:recordingDirectory';
  const MONITORING_KEY = '@HealthSync:isMonitoring';

  useEffect(() => {
    const init = async () => {
      // 1. Check Native Module Availability
      const available = NativeCallRecordingService.isAvailable();
      setNativeAvailable(available);

      // 2. Load Saved Directory & List
      await loadSavedDirectory();

      // 3. Load Saved Monitoring State
      try {
        const savedMonitoringState = await AsyncStorage.getItem(MONITORING_KEY);

        // If it was ON, we automatically restart the service and UI state
        if (savedMonitoringState === 'true' && available) {
          console.log("Restoring monitoring state...");
          await NativeCallRecordingService.startMonitoring();
          setMonitoring(true);

          // Re-attach listener
          recordingSubscription.current = NativeCallRecordingService.addRecordingListener(
            handleNewRecordingDetected
          );
        }
      } catch (e) {
        console.error("Failed to restore monitoring state", e);
      }

      // 4. Initial fetch of recordings list if directory is already set
      if (available) {
        fetchRecordingsList();
      }
    };

    init();

    return () => {
      if (recordingSubscription.current) {
        recordingSubscription.current();
      }
    };
  }, [selectedDirectory]); // Re-run if directory changes

  useEffect(() => {
    
  }, [voiceInferences]);
 

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

  // --- Helper to fetch list from native module ---
  const fetchRecordingsList = async () => {
    if (!NativeCallRecordingService.isAvailable() || !selectedDirectory) return;
    try {
      const files = await NativeCallRecordingService.listRecordings();
      setRecordingList(files);
    } catch (error) {
      console.error("Failed to fetch recording list:", error);
    }
  };

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

        // Immediately refresh the list
        fetchRecordingsList();
      }
    } catch (error) {
      console.error('Directory selection error:', error);
      Alert.alert('Error', 'Failed to select directory: ' + error.message);
    }
  };

  // --- Monitoring Logic ---
  const handleStartMonitoring = async () => {
    if (!selectedDirectory) {
      Alert.alert('Setup Required', 'Please select the call recording directory first.');
      return;
    }

    try {
      await NativeCallRecordingService.startMonitoring();
      await AsyncStorage.setItem(MONITORING_KEY, 'true');
      setMonitoring(true);

      recordingSubscription.current = NativeCallRecordingService.addRecordingListener(
        handleNewRecordingDetected
      );

      Alert.alert('Monitoring Active', 'App will now automatically detect new call recordings.');
      fetchRecordingsList();
    } catch (error) {
      Alert.alert('Error', 'Failed to start monitoring: ' + error.message);
    }
  };

  const handleStopMonitoring = async () => {
    try {
      await NativeCallRecordingService.stopMonitoring();
      await AsyncStorage.setItem(MONITORING_KEY, 'false');
      setMonitoring(false);

      if (recordingSubscription.current) {
        recordingSubscription.current();
        recordingSubscription.current = null;
      }
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    }
  };

  // UNUSED
  const handleNewRecordingDetected = async (recordingData) => {
    fetchRecordingsList();
    Alert.alert(
      'New Call Recording Detected',
      `Would you like to analyze "${recordingData.fileName}"?`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: () => analyzeRecording(recordingData.filePath) },
      ]
    );
  };

  const uploadToServer = async (results) => {
    console.log("Starting uploadToServer with results:", results);
    
    // ✅ FIX 1: Use for...of loop to ensure code waits for each server check
    for (const result of results) {
      console.log(`Processing file: ${result.fileName}, Status: ${result.status}`);
      
      if (!result.fileName) {
        console.error("Missing fileName in result", result);
        continue;
      } 
      
      // ✅ FIX 2: Declare the variable with 'const'
      const trimmedFilename = result.fileName.split('.').slice(0, -1).join('.');
      
      // console.log(`Checking if ${trimmedFilename} exists on server...`);
      const fileExist = await fetchRecordingByName(result.fileName);
      
      console.log(`File exists check result:`, fileExist);

      if (fileExist.success !== true && result.status === 'uploaded') {
        console.log("File not found on server, saving inference...");
        
        // Prepare the correct data structure for the service
        console.log("Saving inference for result:", result);
        await saveInferenceResult(result);
        const {data} = await fetchVoiceInferencePerUser();
        console.log("Fetched voice inferences after saving (VoiceAnalysisScreen.js):", data.data);
        setVoiceInferences(data.data);
      }
    }
  };

  // --- NEW: Sync Logic ---
  const handleSyncToday = async () => {
    if (!selectedDirectory) return;

    try {
      setIsUploading(true);

      // 1. Get Today's Recordings
      const todaysFiles = await NativeCallRecordingService.getTodaysRecordings();

      if (todaysFiles.length === 0) {
        Alert.alert("No New Calls", "No recordings found for today.");
        setIsUploading(false);
        return;
      }

      // 2. Confirm Upload
      Alert.alert(
        "Sync Calls",
        `Found ${todaysFiles.length} recordings from today. Upload them now?`,
        [
          { text: "Cancel", onPress: () => setIsUploading(false), style: "cancel" },
          {
            text: "Upload",
            onPress: async () => {
              // 3. Perform Batch Upload
              const results = await uploadBatchRecordings(todaysFiles);
              uploadToServer(results);

              // 4. Summarize Results
              const successCount = results.filter(r => r.status === 'uploaded').length;
              const failCount = results.length - successCount;

              Alert.alert(
                "Sync Complete",
                `Successfully uploaded: ${successCount}\nFailed: ${failCount}`
              );
              setIsUploading(false);
            }
          }
        ]
      );

    } catch (error) {
      console.error("Sync error:", error);
      Alert.alert("Error", "Failed to sync recordings.");
      setIsUploading(false);
    }
  };

  const analyzeRecording = async (filePath) => {
    try {
      setIsAnalyzing(true);
      // If passing a raw path string, we need to mock a file object. 
      // Ideally, pass the object from the list if available.
      const fileInfo = await NativeCallRecordingService.getFileInfo(filePath);

      const recording = {
        uri: `file://${filePath}`,
        name: fileInfo.name,
        type: getMimeType(fileInfo.name),
      };

      const result = await analyzeVoiceRecording(recording);

      if (result.success) {
        setAnalysisResult(result);
        Alert.alert("Analysis Complete", "Voice analysis finished successfully.");
      } else {
        Alert.alert('Analysis Failed', result.error || 'Unable to analyze recording');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Error', 'Failed to analyze recording: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getMimeType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      mp3: 'audio/mpeg',
      m4a: 'audio/mp4',
      amr: 'audio/amr',
      wav: 'audio/wav',
      '3gp': 'audio/3gpp',
    };
    return mimeTypes[ext] || 'audio/mpeg';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Voice Call Analysis</Text>
        <Text style={styles.headerSubtitle}>
          {nativeAvailable
            ? 'Automatic call recording detection enabled'
            : 'Manual file selection required'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Native Integration Status</Text>
          <View style={styles.statusRow}>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: nativeAvailable ? '#4CAF50' : '#F44336' }
            ]} />
            <Text style={styles.statusText}>
              {nativeAvailable
                ? 'Android native module active'
                : 'Native module not available'}
            </Text>
          </View>
        </View>

        {/* Setup / Directory Card */}
        {nativeAvailable && (
          <View style={styles.setupCard}>
            <Text style={styles.cardTitle}>Setup</Text>
            <Text style={styles.cardDescription}>
              Select the folder where your phone saves call recordings.
            </Text>

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
        )}

        {/* Monitoring & Sync Card */}
        {nativeAvailable && (
          <View style={styles.monitoringCard}>
            <Text style={styles.monitoringTitle}>Actions</Text>

            {/* Monitor Button */}
            <TouchableOpacity
              style={[
                styles.monitoringButton,
                monitoring && styles.monitoringActiveButton,
                !selectedDirectory && styles.monitoringDisabledButton
              ]}
              onPress={monitoring ? handleStopMonitoring : handleStartMonitoring}
              disabled={!selectedDirectory}
            >
              <Text style={styles.monitoringButtonText}>
                {monitoring ? 'Stop Auto-Monitoring' : 'Start Auto-Monitoring'}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 10 }} />

            {/* NEW: Sync Button */}
            <TouchableOpacity
              style={[
                styles.syncButton,
                !selectedDirectory && styles.monitoringDisabledButton
              ]}
              onPress={handleSyncToday}
              disabled={!selectedDirectory || isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.monitoringButtonText}>
                  ☁️ Sync Today's Calls to Cloud
                </Text>
              )}
            </TouchableOpacity>

            {!selectedDirectory && (
              <Text style={styles.warningText}>
                ⚠️ Please select a directory above to enable features.
              </Text>
            )}

            {monitoring && (
              <Text style={styles.monitoringStatus}>
                🔵 Monitoring active
              </Text>
            )}

            {/* Recordings List */}
            {selectedDirectory && (
              <View style={styles.recordingsListContainer}>
                <View style={styles.divider} />
                <Text style={styles.listTitle}>
                  Found Recordings ({recordingList.length})
                </Text>

                {recordingList.length === 0 ? (
                  <Text style={styles.emptyListText}>No recordings found.</Text>
                ) : (
                  recordingList.map((file, index) => (
                    <View key={index} style={styles.fileItem}>
                      <Text style={styles.fileIcon}>🎵</Text>
                      {/* Handle both Object (new) and String (old) formats */}
                      <Text style={styles.fileName} numberOfLines={1}>
                        {typeof file === 'string' ? file : file.name}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        )}

        {/* Analysis Loading State */}
        {isAnalyzing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0A2E5B" />
            <Text style={styles.loadingText}>Analyzing recording...</Text>
          </View>
        )}

        <ToxicityChart title="Voice call toxicity" data={null} />

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
    color: "#333333",
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