package com.mobileapp;

import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import android.text.TextUtils;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import android.content.SharedPreferences;
import android.util.Log;

/**
 * React Native Module to manage the Screen Controller Accessibility Service.
 */
public class ScreenControllerModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private static final String PREFS_NAME = "ScreenPrefs";
    private static final String TAG = "ScreenControllerService";

    public ScreenControllerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "ScreenController";
    }

    // --- THIS IS THE FUNCTION YOUR UI CALLS ---
    @ReactMethod
    public void updateServiceSettings(String featureKey, boolean enabled, int timeInMins) {
        SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        SharedPreferences.Editor editor = prefs.edit();
        // Save the state (enabled/disabled)
        editor.putBoolean(featureKey + "_enabled", enabled);
        // Save the duration (minutes)
        editor.putInt(featureKey + "_time", timeInMins);
        editor.apply(); 
        
        Log.d(TAG, String.format("ScreenController | Saved: %s Enabled: %b Time: %d", featureKey, enabled, timeInMins));
    }

    /**
     * Checks if the ScreenControllerService is currently enabled and running.
     */
    @ReactMethod
    public void isServiceEnabled(Promise promise) {
        try {
            boolean isEnabled = isAccessibilityServiceEnabled(getReactApplicationContext(), ScreenControllerService.class.getName());
            promise.resolve(isEnabled);
        } catch (Exception e) {
            Log.e(TAG, "Failed to check service status", e);
            promise.reject("CHECK_STATUS_ERROR", "Could not check accessibility service status.", e);
        }
    }

    /**
     * Helper to check the system settings for the specific accessibility service.
     */
    private boolean isAccessibilityServiceEnabled(Context context, String accessibilityService) {
        String service = context.getPackageName() + "/" + accessibilityService;
        int accessibilityEnabled = 0;
        try {
            accessibilityEnabled = Settings.Secure.getInt(context.getContentResolver(),
                    Settings.Secure.ACCESSIBILITY_ENABLED);
        } catch (Settings.SettingNotFoundException e) {
            Log.e(TAG, "Error finding accessibility setting: " + e.getMessage());
        }

        if (accessibilityEnabled == 1) {
            TextUtils.SimpleStringSplitter mStringColonSplitter = new TextUtils.SimpleStringSplitter(':');
            String settingValue = Settings.Secure.getString(context.getContentResolver(),
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            if (settingValue != null) {
                mStringColonSplitter.setString(settingValue);
                while (mStringColonSplitter.hasNext()) {
                    String accessibilityServiceCandidate = mStringColonSplitter.next();
                    if (accessibilityServiceCandidate.equalsIgnoreCase(service)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Opens the system Accessibility Settings menu so the user can enable the service.
     */
    @ReactMethod
    public void openAccessibilitySettings() {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        reactContext.startActivity(intent);
    }
}