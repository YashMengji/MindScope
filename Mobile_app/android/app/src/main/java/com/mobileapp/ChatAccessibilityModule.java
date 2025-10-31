package com.mobileapp;

import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class ChatAccessibilityModule extends ReactContextBaseJavaModule {

    private static final String TAG = "ChatAccessibilityService";

    public ChatAccessibilityModule(ReactApplicationContext reactContext) {
        super(reactContext);
        ChatAccessibilityService.setReactContext(reactContext); // connect service with RN
    }

    @Override
    public String getName() {
        return "ChatAccessibility";
    }

    /**
     * Checks if the ChatAccessibilityService is enabled by the user in Android Settings.
     */
    @ReactMethod
    public void isServiceEnabled(Promise promise) {
        try {
            boolean isEnabled = isAccessibilityServiceEnabled(getReactApplicationContext(), ChatAccessibilityService.class.getName());
            promise.resolve(isEnabled);
        } catch (Exception e) {
            Log.e(TAG, "Failed to check service status", e);
            promise.reject("CHECK_STATUS_ERROR", "Could not check accessibility service status.", e);
        }
    }

    /**
     * Opens the Android Accessibility Settings page.
     */
    @ReactMethod
    public void openAccessibilitySettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getReactApplicationContext().startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to open settings", e);
        }
    }

    // --- Utility Function to Check Service Status ---
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
}
