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

/**
 * React Native Module to manage the Screen Controller Accessibility Service.
 */
public class ScreenControllerModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private static final String PREFS_NAME = "ScreenPrefs";

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
        
        android.util.Log.d("ScreenController", "Saved: " + featureKey + " Enabled: " + enabled + " Time: " + timeInMins);
    }

    /**
     * Checks if the ScreenControllerService is currently enabled and running.
     */
    @ReactMethod
    public void isServiceEnabled(Promise promise) {
        promise.resolve(isAccessibilityServiceEnabled());
    }

    /**
     * Helper to check the system settings for the specific accessibility service.
     */
    private boolean isAccessibilityServiceEnabled() {
        Context context = getReactApplicationContext();
        String service = context.getPackageName() + "/" + ScreenControllerService.class.getCanonicalName();
        int accessibilityEnabled = 0;
        try {
            accessibilityEnabled = Settings.Secure.getInt(context.getContentResolver(), android.provider.Settings.Secure.ACCESSIBILITY_ENABLED);
        } catch (Settings.SettingNotFoundException e) {
            return false;
        }

        if (accessibilityEnabled == 1) {
            String settingValue = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            if (settingValue != null) {
                TextUtils.SimpleStringSplitter splitter = new TextUtils.SimpleStringSplitter(':');
                splitter.setString(settingValue);
                while (splitter.hasNext()) {
                    String accessibilityService = splitter.next();
                    if (accessibilityService.equalsIgnoreCase(service)) {
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