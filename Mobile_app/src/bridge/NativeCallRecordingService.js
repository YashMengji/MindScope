import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { CallRecordingManager } = NativeModules;

class NativeCallRecordingService {
  constructor() {
    this.eventEmitter = null;
    
    if (Platform.OS === 'android' && CallRecordingManager) {
      this.eventEmitter = new NativeEventEmitter(CallRecordingManager);
    }
  }

  // Check if native module is available
  isAvailable() {
    return Platform.OS === 'android' && CallRecordingManager !== undefined;
  }

  /**
   * Opens the system folder picker to let the user select the recording directory.
   * Returns the URI string of the selected folder, or null if cancelled.
   */
  async requestRecordingFolderAccess() {
    if (!this.isAvailable()) return null;
    try {
      return await CallRecordingManager.requestRecordingFolderAccess();
    } catch (error) {
      console.error('Permission request failed', error);
      return null;
    }
  }

  // Start monitoring the selected folder
  async startMonitoring() {
    if (!this.isAvailable()) return;
    try {
      return await CallRecordingManager.startMonitoring();
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      throw error;
    }
  }

  // Stop monitoring
  async stopMonitoring() {
    if (!this.isAvailable()) return;
    try {
      return await CallRecordingManager.stopMonitoring();
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
      throw error;
    }
  }

  // Get file info (name, size) from a specific URI
  async getFileInfo(uri) {
     if (!this.isAvailable()) throw new Error("Native module not available");
     try {
       return await CallRecordingManager.getFileInfo(uri);
     } catch (error) {
       console.error('Failed to get file info:', error);
       throw error;
     }
  }

  /**
   * Lists all recordings in the currently selected directory.
   * Returns an array of objects: { name: string, uri: string, lastModified: number }
   */
  async listRecordings() {
    if (!this.isAvailable()) return [];
    try {
      // The native module now returns an array of Maps (Objects in JS)
      const files = await CallRecordingManager.listRecordings();
      return files || [];
    } catch (error) {
      console.error('Failed to list recordings:', error);
      return [];
    }
  }

  /**
   * Helper: Gets only recordings created today (since midnight local time).
   */
  async getTodaysRecordings() {
    try {
      const allFiles = await this.listRecordings();
      
      // Get midnight timestamp for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const midnightTime = today.getTime();

      // Filter files modified/created after midnight
      return allFiles.filter(file => file.lastModified >= midnightTime);
    } catch (error) {
      console.error("Error filtering today's recordings:", error);
      return [];
    }
  }

  // Get latest call recordings (Placeholder)
  async getLatestRecordings(limit = 5) {
    return { recordings: [], count: 0 };
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
}

// Export singleton instance
export default new NativeCallRecordingService();