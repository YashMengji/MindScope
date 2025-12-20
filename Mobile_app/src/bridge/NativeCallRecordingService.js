import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { CallRecordingManager } = NativeModules;

class NativeCallRecordingService {
  constructor() {
    this.isMonitoring = false;
    this.eventEmitter = null;
    
    if (Platform.OS === 'android' && CallRecordingManager) {
      this.eventEmitter = new NativeEventEmitter(CallRecordingManager);
    }
  }

  // Check if native module is available
  isAvailable() {
    return Platform.OS === 'android' && CallRecordingManager !== undefined;
  }

  // Start monitoring for new call recordings
  async startMonitoring() {
    if (!this.isAvailable()) {
      throw new Error('Call recording monitoring not available on this platform');
    }

    try {
      const result = await CallRecordingManager.startMonitoring();
      this.isMonitoring = true;
      console.log('Monitoring started:', result);
      return true;
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      throw error;
    }
  }

  // Stop monitoring
  async stopMonitoring() {
    if (!this.isAvailable()) return false;

    try {
      const result = await CallRecordingManager.stopMonitoring();
      this.isMonitoring = false;
      console.log('Monitoring stopped:', result);
      return true;
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
      throw error;
    }
  }

  // Get latest call recordings
  async getLatestRecordings(limit = 10) {
    if (!this.isAvailable()) {
      return { recordings: [], count: 0 };
    }

    try {
      const result = await CallRecordingManager.getLatestRecordings(limit);
      return result;
    } catch (error) {
      console.error('Failed to get recordings:', error);
      return { recordings: [], count: 0 };
    }
  }

  // Listen for new recording events
  addRecordingListener(callback) {
    if (!this.eventEmitter) {
      console.warn('Event emitter not available');
      return () => {};
    }

    const subscription = this.eventEmitter.addListener(
      'onNewCallRecording',
      (data) => {
        console.log('New call recording detected:', data);
        callback(data);
      }
    );

    return () => subscription.remove();
  }

  // Get file information
  async getFileInfo(filePath) {
    if (!this.isAvailable()) {
      throw new Error('Native module not available');
    }

    try {
      const fileInfo = await CallRecordingManager.getFileInfo(filePath);
      return fileInfo;
    } catch (error) {
      console.error('Failed to get file info:', error);
      throw error;
    }
  }

  // Check if monitoring is active
  isMonitoringActive() {
    return this.isMonitoring;
  }

  // Get default recording paths
  getDefaultPaths() {
    if (!this.isAvailable()) {
      return [];
    }

    return CallRecordingManager.CALL_RECORDING_PATHS || [];
  }
}

// Export singleton instance
export default new NativeCallRecordingService();