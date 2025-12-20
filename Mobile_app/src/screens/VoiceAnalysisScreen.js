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

const VoiceAnalysisScreen = () => {
  const insets = useSafeAreaInsets();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const recordingSubscription = useRef(null);

  useEffect(() => {
    // Check if native module is available
    const available = NativeCallRecordingService.isAvailable();
    setNativeAvailable(available);
    
    if (available) {
      // Load existing recordings on mount
      loadExistingRecordings();
    }
    
    return () => {
      // Cleanup listener on unmount
      if (recordingSubscription.current) {
        recordingSubscription.current();
      }
    };
  }, []);

  const loadExistingRecordings = async () => {
    try {
      const result = await NativeCallRecordingService.getLatestRecordings(5);
      console.log('Existing recordings:', result);
    } catch (error) {
      console.error('Failed to load recordings:', error);
    }
  };

  const handleStartMonitoring = async () => {
    try {
      await NativeCallRecordingService.startMonitoring();
      setMonitoring(true);
      
      // Listen for new recordings
      recordingSubscription.current = NativeCallRecordingService.addRecordingListener(
        handleNewRecordingDetected
      );
      
      Alert.alert(
        'Monitoring Active',
        'App will now automatically detect new call recordings.',
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
      
      // Get file info from native module
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

  // ... (rest of the component remains similar to previous version)
  // Add specific UI elements for native monitoring

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

        {/* Monitoring Controls (Android only) */}
        {nativeAvailable && (
          <View style={styles.monitoringCard}>
            <Text style={styles.monitoringTitle}>Automatic Monitoring</Text>
            <Text style={styles.monitoringDescription}>
              Automatically detect new call recordings and prompt for analysis
            </Text>
            
            <TouchableOpacity
              style={[
                styles.monitoringButton,
                monitoring && styles.monitoringActiveButton
              ]}
              onPress={monitoring ? handleStopMonitoring : handleStartMonitoring}
            >
              <Text style={styles.monitoringButtonText}>
                {monitoring ? 'Stop Auto-Monitoring' : 'Start Auto-Monitoring'}
              </Text>
            </TouchableOpacity>
            
            {monitoring && (
              <Text style={styles.monitoringStatus}>
                🔵 Monitoring active - New recordings will be detected automatically
              </Text>
            )}
          </View>
        )}
        
        {/* ... rest of the UI ... */}
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

  /* ---------- STATUS CARD ---------- */
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

  /* ---------- MONITORING CARD ---------- */
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

  /* ---------- LOADING / RESULT ---------- */
  loadingContainer: {
    marginTop: 30,
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },

  resultCard: {
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

  resultTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0A2E5B",
    marginBottom: 10,
  },

  resultText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },

  errorText: {
    fontSize: 14,
    color: "#F44336",
    textAlign: "center",
    marginTop: 10,
  },

  bottomSpacing: {
    height: 20,
  },
});


export default VoiceAnalysisScreen;