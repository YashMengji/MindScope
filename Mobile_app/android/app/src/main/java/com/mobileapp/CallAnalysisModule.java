package com.mobileapp;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import androidx.core.content.ContextCompat;
import android.util.Log;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import android.content.Context;
import android.content.SharedPreferences;

/**
 * React Native Module to check/request permissions for call recording and detection.
 */
public class CallAnalysisModule extends ReactContextBaseJavaModule{
    private static final String TAG = "CallAnalysisModule";
    private static final int PERMISSION_REQUEST_CODE = 102;
    private Promise permissionPromise;
    // The key used to store the feature state
    private static final String PREFS_NAME = "VoiceAnalysisPrefs";
    private static final String KEY_VOICE_FEATURE_ENABLED = "isVoiceFeatureEnabled";
    public static final String VOICE_FEATURE_KEY = "isVoiceFeatureEnabled";

    // Required permissions for call detection and recording
    private static final String[] PERMISSIONS = {
        Manifest.permission.READ_PHONE_STATE,
        Manifest.permission.RECORD_AUDIO,
        Manifest.permission.WRITE_EXTERNAL_STORAGE, // Required for older Android versions
        Manifest.permission.READ_EXTERNAL_STORAGE
    };

    public CallAnalysisModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "CallAnalysis";
    }

    /**
     * React Method to check if all required permissions are granted.
     * @param promise Resolves with boolean (true if granted, false otherwise).
     */
    @ReactMethod
    public void checkPermissions(Promise promise) {
        Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("Activity_Missing", "Current activity is null.");
            return;
        }

        WritableMap status = Arguments.createMap();
        
        boolean readGranted = ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED;
        boolean recordGranted = ContextCompat.checkSelfPermission(activity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        boolean writeStorageGranted = ContextCompat.checkSelfPermission(activity, Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        boolean readStorageGranted = ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        

        status.putBoolean("READ_PHONE_STATE", readGranted);
        status.putBoolean("RECORD_AUDIO", recordGranted);
        status.putBoolean("WRITE_STORAGE", writeStorageGranted);
        status.putBoolean("READ_STORAGE", readStorageGranted);
        status.putBoolean("ALL_GRANTED", readGranted && recordGranted && writeStorageGranted && readStorageGranted);

        promise.resolve(status);
    }

    /**
     * React Method to save the user's toggle state to SharedPreferences.
     * This allows the CallReceiver (BroadcastReceiver) to know if it should record a call.
     * @param isEnabled The new state of the voice feature toggle (true/false).
     */
    @ReactMethod
    public void setVoiceFeatureEnabled(boolean isEnabled) {
        ReactApplicationContext context = getReactApplicationContext();
        
        // Get SharedPreferences editor
        SharedPreferences.Editor editor = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
        
        // Write the new state
        editor.putBoolean(VOICE_FEATURE_KEY, isEnabled);
        
        // Apply the changes immediately
        editor.apply();
        
        Log.d(TAG, "SharedPreferences updated: " + VOICE_FEATURE_KEY + " set to " + isEnabled);
    }

    /**
     * Retrieves the voice feature's enabled state from SharedPreferences.
     * Called by the React Native useEffect (FeaturesScreen.js) for initialization.
     */
    @ReactMethod
    public void getVoiceFeatureEnabled(Promise promise) {
        try {
            SharedPreferences sharedPref = getReactApplicationContext().getSharedPreferences(
                PREFS_NAME, Context.MODE_PRIVATE);
            
            // Default value is 'false' if the key hasn't been set yet
            boolean isEnabled = sharedPref.getBoolean(KEY_VOICE_FEATURE_ENABLED, false);
            
            Log.d(TAG, "Voice Feature state read: " + isEnabled);
            promise.resolve(isEnabled);
        } catch (Exception e) {
            Log.e(TAG, "Error reading Voice Feature state", e);
            promise.reject("READ_ERROR", "Failed to read voice feature state from preferences", e);
        }
    }

    /**
     * React Method to request all required permissions from the user.
     * @param promise Resolves with boolean (true if granted, false otherwise).
     */
    // @ReactMethod
    // public void requestPermissions(Promise promise) {
    //     Activity activity = getCurrentActivity();
    //     if (activity == null) {
    //         promise.reject("Activity_Missing", "Current activity is null.");
    //         return;
    //     }

    //     // Store the promise to resolve it in onRequestPermissionsResult
    //     this.permissionPromise = promise;

    //     // Request permissions
    //     activity.requestPermissions(PERMISSIONS, PERMISSION_REQUEST_CODE);
    // }

    // // --- ActivityEventListener Implementations ---

    // @Override
    // public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
    //     // Not used for permissions
    // }

    // @Override
    // public void onNewIntent(Intent intent) {
    //     // Not used for permissions
    // }

    // // Required override to handle the result of the permission request
    // // This method is usually implemented in the main activity, but we handle it here 
    // // using the event listener to keep the logic contained.
    // public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
    //     if (requestCode == PERMISSION_REQUEST_CODE && permissionPromise != null) {
    //         boolean allGranted = true;
    //         for (int result : grantResults) {
    //             if (result != PackageManager.PERMISSION_GRANTED) {
    //                 allGranted = false;
    //                 break;
    //             }
    //         }
    //         permissionPromise.resolve(allGranted);
    //         permissionPromise = null; // Clear the promise
    //     }
    // }
}
