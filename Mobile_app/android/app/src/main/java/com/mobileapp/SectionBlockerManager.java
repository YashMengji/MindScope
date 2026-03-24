package com.mobileapp;

import android.content.SharedPreferences;
import android.content.Intent;
import android.provider.Settings;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

/**
 * SectionBlockerManager.java — fixed for MIUI 12
 *
 * Fixes applied:
 * 1. Singleton stored in a static field that survives React Native bridge reloads
 * 2. sendBlockedSectionEvent is null-safe and logs every step
 * 3. startService / updateSettings always write to SharedPreferences AND push
 *    to the live AccessibilityBlockerService instance if available
 * 4. isServiceEnabled uses the correct class name format for MIUI
 */
public class SectionBlockerManager extends ReactContextBaseJavaModule {

    private static final String TAG         = "BlockerService"; // same tag as service for unified logcat
    private static final String MODULE_NAME = "SectionBlockerManager";
    private static final String PREFS_NAME  = "MindScopeBlocker";
    private static final String PREFS_KEY   = "settings_json";

    // Static — survives RN bridge reloads on MIUI
    private static SectionBlockerManager sInstance = null;

    private final ReactApplicationContext reactContext;
    private int listenerCount = 0;

    public SectionBlockerManager(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
        sInstance = this;
        Log.d(TAG, "✅ SectionBlockerManager created, instance set");
    }

    public static SectionBlockerManager getInstance() {
        return sInstance;
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    // ── JS-callable ───────────────────────────────────────────────────────────

    /**
     * Saves settings to SharedPreferences and pushes to live service.
     * Called whenever JS toggles change.
     */
    @ReactMethod
    public void startService(String settingsJson, Promise promise) {
        Log.d(TAG, "startService called with: " + settingsJson);
        try {
            writePrefs(settingsJson);
            pushToService(settingsJson);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "startService error: " + e.getMessage());
            promise.reject("START_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopService(Promise promise) {
        Log.d(TAG, "stopService called");
        try {
            writePrefs("{}");
            pushToService("{}");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "stopService error: " + e.getMessage());
            promise.reject("STOP_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void updateSettings(String settingsJson, Promise promise) {
        Log.d(TAG, "updateSettings called with: " + settingsJson);
        try {
            writePrefs(settingsJson);
            pushToService(settingsJson);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "updateSettings error: " + e.getMessage());
            promise.reject("UPDATE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void isServiceEnabled(Promise promise) {
        try {
            String enabled = Settings.Secure.getString(
                    reactContext.getContentResolver(),
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            );
            String target = reactContext.getPackageName()
                    + "/" + reactContext.getPackageName()
                    + ".AccessibilityBlockerService";
            boolean isEnabled = enabled != null && enabled.contains(target);
            Log.d(TAG, "isServiceEnabled=" + isEnabled + " (looking for: " + target + ")");
            promise.resolve(isEnabled);
        } catch (Exception e) {
            Log.e(TAG, "isServiceEnabled error: " + e.getMessage());
            promise.reject("CHECK_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void openAccessibilitySettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "openAccessibilitySettings error: " + e.getMessage());
        }
    }

    // ── Event emission ────────────────────────────────────────────────────────

    /**
     * Called by AccessibilityBlockerService on the main thread.
     * Emits 'onBlockedSectionDetected' to the JS layer.
     */
    public void sendBlockedSectionEvent(String app, String section) {
        Log.d(TAG, "sendBlockedSectionEvent: app=" + app + " section=" + section
                + " listenerCount=" + listenerCount);

        if (listenerCount == 0) {
            Log.w(TAG, "⚠️ No JS listeners registered — event dropped");
            return;
        }

        try {
            WritableMap params = Arguments.createMap();
            params.putString("app", app);
            params.putString("section", section);

            reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onBlockedSectionDetected", params);

            Log.d(TAG, "✅ Event emitted to JS successfully");
        } catch (Exception e) {
            Log.e(TAG, "❌ Failed to emit event to JS: " + e.getMessage());
        }
    }

    // Required by NativeEventEmitter
    @ReactMethod
    public void addListener(String eventName) {
        listenerCount++;
        Log.d(TAG, "addListener: " + eventName + " total=" + listenerCount);
    }

    @ReactMethod
    public void removeListeners(Integer count) {
        listenerCount = Math.max(0, listenerCount - count);
        Log.d(TAG, "removeListeners: " + count + " remaining=" + listenerCount);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void writePrefs(String json) {
        SharedPreferences prefs = reactContext.getSharedPreferences(
                PREFS_NAME, ReactApplicationContext.MODE_PRIVATE);
        prefs.edit().putString(PREFS_KEY, json).apply();
        Log.d(TAG, "✅ Prefs written: " + json);
    }

    private void pushToService(String json) {
        if (AccessibilityBlockerService.instance != null) {
            AccessibilityBlockerService.instance.applySettings(json);
            Log.d(TAG, "✅ Settings pushed to live service");
        } else {
            Log.w(TAG, "⚠️ Service instance null — settings saved to prefs only (will load on next event)");
        }
    }
}
