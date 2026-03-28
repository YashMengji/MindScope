import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

/**
 * NativeAccessibilityService.js
 *
 * React Native bridge for the Android SectionBlockerService.
 * Mirrors the same pattern as NativeCallRecordingService.js.
 *
 * Native module name: SectionBlockerManager
 * Events emitted:   onBlockedSectionDetected  → { app: string, section: string }
 */

const { SectionBlockerManager } = NativeModules;

class NativeAccessibilityService {
  constructor() {
    this.eventEmitter = null;

    if (Platform.OS === 'android' && SectionBlockerManager) {
      this.eventEmitter = new NativeEventEmitter(SectionBlockerManager);
    }
  }

  // ── Availability ────────────────────────────────────────────────────────────

  isAvailable() {
    return Platform.OS === 'android' && SectionBlockerManager !== undefined;
  }

  // ── Service lifecycle ───────────────────────────────────────────────────────

  /**
   * Start the accessibility blocker service and pass initial settings JSON.
   * @param {object} settings  Full blocker settings object from useBlockerSettings
   */
  async startService(settings) {
    if (!this.isAvailable()) return;
    try {
      return await SectionBlockerManager.startService(JSON.stringify(settings));
    } catch (error) {
      console.error('NativeAccessibilityService: startService failed', error);
      throw error;
    }
  }

  /**
   * Stop the accessibility blocker service.
   */
  async stopService() {
    if (!this.isAvailable()) return;
    try {
      return await SectionBlockerManager.stopService();
    } catch (error) {
      console.error('NativeAccessibilityService: stopService failed', error);
      throw error;
    }
  }

  /**
   * Push updated toggle settings to the already-running service.
   * Call this whenever any individual toggle changes without stopping/restarting.
   * @param {object} settings  Full blocker settings object
   */
  async updateSettings(settings) {
    if (!this.isAvailable()) return;
    try {
      return await SectionBlockerManager.updateSettings(JSON.stringify(settings));
    } catch (error) {
      console.error('NativeAccessibilityService: updateSettings failed', error);
      throw error;
    }
  }

  // ── Settings helper ─────────────────────────────────────────────────────────

  /**
   * Check whether the Mindscope accessibility service is currently enabled
   * in Android Accessibility Settings.
   * @returns {Promise<boolean>}
   */
  async isServiceEnabled() {
    if (!this.isAvailable()) return false;
    try {
      return await SectionBlockerManager.isServiceEnabled();
    } catch (error) {
      console.error('NativeAccessibilityService: isServiceEnabled failed', error);
      return false;
    }
  }

  /**
   * Open the Android Accessibility Settings screen so the user can
   * manually enable the service.
   */
  openAccessibilitySettings() {
    if (!this.isAvailable()) return;
    try {
      SectionBlockerManager.openAccessibilitySettings();
    } catch (error) {
      console.error('NativeAccessibilityService: openAccessibilitySettings failed', error);
    }
  }

  // ── Event listener ──────────────────────────────────────────────────────────

  /**
   * Listen for blocked section detection events emitted by the native service.
   *
   * Callback receives: { app: 'Instagram' | 'YouTube', section: string }
   *
   * Returns a cleanup function — call it inside useEffect's return.
   *
   * @param {function} callback
   * @returns {function} unsubscribe
   */
  addBlockedSectionListener(callback) {
    if (!this.eventEmitter) {
      console.warn('NativeAccessibilityService: event emitter not available');
      return () => {};
    }

    const subscription = this.eventEmitter.addListener(
      'onBlockedSectionDetected',
      (data) => {
        console.log('Blocked section detected:', data);
        callback(data);
      }
    );

    return () => subscription.remove();
  }
}

// Export singleton — same pattern as NativeCallRecordingService
export default new NativeAccessibilityService();
