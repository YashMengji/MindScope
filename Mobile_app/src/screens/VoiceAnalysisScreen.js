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
import { analyzeVoiceRecording } from '../services/VoiceRecordingService';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Ensure this is installed

const VoiceAnalysisScreen = () => {
  const insets = useSafeAreaInsets();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  
  // New state for directory selection
  const [selectedDirectory, setSelectedDirectory] = useState(null);
  
  const recordingSubscription = useRef(null);
  const DIRECTORY_KEY = '@HealthSync:recordingDirectory';
  const MONITORING_KEY = '@HealthSync:isMonitoring';

  useEffect(() => {
    const init = async () => {
      // 1. Check Native Module Availability
      const available = NativeCallRecordingService.isAvailable();
      setNativeAvailable(available);

      // 2. Load Saved Directory
      loadSavedDirectory();

      // 3. Load Saved Monitoring State (The Fix)
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

      if (available) {
        loadExistingRecordings();
      }
    };

    init();

    return () => {
      if (recordingSubscription.current) {
        recordingSubscription.current();
      }
    };
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

  const loadExistingRecordings = async () => {
    try {
      // If we have a selected directory, we might want to scan it here
      // For now, keeping original logic if applicable
      const result = await NativeCallRecordingService.getLatestRecordings(5);
      console.log('Existing recordings:', result);
    } catch (error) {
      console.error('Failed to load recordings:', error);
    }
  };

  // --- NEW: Handle Directory Selection ---
  const handleSelectDirectory = async () => {
    try {
      // 1. Call the native module to open the system folder picker
      const uriString = await NativeCallRecordingService.requestRecordingFolderAccess();

      if (uriString) {
        // 2. Update state and save to persistent storage
        setSelectedDirectory(uriString);
        await AsyncStorage.setItem(DIRECTORY_KEY, uriString);

        Alert.alert(
          'Directory Selected',
          'HealthSync now has permission to access recordings in this folder.',
          [{ text: 'OK' }]
        );
      } else {
        // User cancelled the picker
        console.log("Folder selection cancelled");
      }
    } catch (error) {
      console.error('Directory selection error:', error);
      Alert.alert('Error', 'Failed to select directory: ' + error.message);
    }
  };

  // --- Existing Monitoring Logic ---
  const handleStartMonitoring = async () => {
    if (!selectedDirectory) {
      Alert.alert(
        'Setup Required', 
        'Please select the call recording directory first.'
      );
      return;
    }

    try {
      await NativeCallRecordingService.startMonitoring();
      setMonitoring(true);
      
      recordingSubscription.current = NativeCallRecordingService.addRecordingListener(
        handleNewRecordingDetected
      );
      
      Alert.alert(
        'Monitoring Active',
        'App will now automatically detect new call recordings in the selected folder.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to start monitoring: ' + error.message);
    }
  };

  const handleStopMonitoring = async () => {
    try {
      await NativeCallRecordingService.stopMonitoring();
      setMonitoring(false);
      
      if (recordingSubscription.current) {
        recordingSubscription.current();
        recordingSubscription.current = null;
      }
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    }
  };

  const handleNewRecordingDetected = async (recordingData) => {
    Alert.alert(
      'New Call Recording Detected',
      `Would you like to analyze "${recordingData.fileName}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => analyzeRecording(recordingData.filePath),
        },
      ]
    );
  };

  const analyzeRecording = async (filePath) => {
    try {
      setIsAnalyzing(true);
      const fileInfo = await NativeCallRecordingService.getFileInfo(filePath);
      
      const recording = {
        uri: `file://${filePath}`,
        name: fileInfo.name,
        type: getMimeType(fileInfo.name),
      };
      
      const result = await analyzeVoiceRecording(recording);
      
      if (result.success) {
        setAnalysisResult(result);
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
        {/* Native Module Status */}
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
                : Platform.select({
                    android: 'Native module not available',
                    ios: 'iOS requires manual file selection',
                  })}
            </Text>
          </View>
        </View>

        {/* --- NEW: Directory Selection Card --- */}
        {nativeAvailable && (
          <View style={styles.setupCard}>
            <Text style={styles.cardTitle}>Setup</Text>
            <Text style={styles.cardDescription}>
              Select the folder where your phone saves call recordings. 
              This allows HealthSync to detect and analyze them.
            </Text>
            
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleSelectDirectory}
            >
              <Text style={styles.actionButtonText}>
                Select Call Recording Directory
              </Text>
            </TouchableOpacity>

            {/* Display Selected Path if Available */}
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

        {/* Monitoring Controls */}
        {nativeAvailable && (
          <View style={styles.monitoringCard}>
            <Text style={styles.monitoringTitle}>Automatic Monitoring</Text>
            <Text style={styles.monitoringDescription}>
              Automatically detect new call recordings and prompt for analysis
            </Text>
            
            <TouchableOpacity
              style={[
                styles.monitoringButton,
                monitoring && styles.monitoringActiveButton,
                !selectedDirectory && styles.monitoringDisabledButton // Disable if no dir
              ]}
              onPress={monitoring ? handleStopMonitoring : handleStartMonitoring}
              disabled={!selectedDirectory}
            >
              <Text style={styles.monitoringButtonText}>
                {monitoring ? 'Stop Auto-Monitoring' : 'Start Auto-Monitoring'}
              </Text>
            </TouchableOpacity>
            
            {!selectedDirectory && (
               <Text style={styles.warningText}>
                 ⚠️ Please select a directory above to enable monitoring.
               </Text>
            )}
            
            {monitoring && (
              <Text style={styles.monitoringStatus}>
                🔵 Monitoring active - New recordings will be detected automatically
              </Text>
            )}
          </View>
        )}
        
        {/* Analysis Status */}
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

  /* Setup Card (New) */
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
    backgroundColor: "#2196F3", // Different color to distinguish setup
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
  monitoringActiveButton: {
    backgroundColor: "#F44336",
  },
  monitoringDisabledButton: {
    backgroundColor: "#B0BEC5", // Greyed out
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