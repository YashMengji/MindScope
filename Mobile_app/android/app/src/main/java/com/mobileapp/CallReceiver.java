package com.mobileapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.telephony.TelephonyManager;
import android.util.Log;
import android.os.Build; // Required for Build.VERSION.SDK_INT

/**
 * BroadcastReceiver to listen for changes in the phone call state.
 * It initiates the CallRecordingService when a call is established.
 */
public class CallReceiver extends BroadcastReceiver {
    private static final String TAG = "CallReceiver";

    // Track the previous state to avoid redundant actions on state changes
    private static int lastState = TelephonyManager.CALL_STATE_IDLE;
    private static boolean isRecording = false;
    
    // --- SharedPreferences Keys ---
    public static final String PREFS_NAME = "VoiceAnalysisPrefs";
    public static final String VOICE_FEATURE_KEY = "isVoiceFeatureEnabled"; 

    /**
     * Helper method to read the current feature state from SharedPreferences.
     * @param context The context used to access SharedPreferences.
     * @return true if the voice analysis feature is enabled by the user, false otherwise.
     */
    private boolean isFeatureEnabled(Context context) {
        // Read the shared preferences file for the voice feature settings
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        // Default value is 'false' if the key hasn't been set yet.
        boolean isEnabled = prefs.getBoolean(VOICE_FEATURE_KEY, false);
        
        Log.d(TAG, "Feature Check: isVoiceFeatureEnabled = " + isEnabled);
        return isEnabled;
    } 

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!intent.getAction().equals(TelephonyManager.ACTION_PHONE_STATE_CHANGED)) {
            return;
        }

        // Only proceed if the user has enabled the feature
        if (!isFeatureEnabled(context)) {
            Log.d(TAG, "Feature is disabled by user. Skipping call detection.");
            return;
        }

        // --- 1. Get current phone state ---
        String stateStr = intent.getExtras().getString(TelephonyManager.EXTRA_STATE);
        int state = TelephonyManager.CALL_STATE_IDLE;

        if (stateStr == null) {
            return;
        } else if (stateStr.equals(TelephonyManager.EXTRA_STATE_OFFHOOK)) {
            // Off-hook means the phone is in an active call (either outgoing or incoming answered)
            state = TelephonyManager.CALL_STATE_OFFHOOK;
        } else if (stateStr.equals(TelephonyManager.EXTRA_STATE_RINGING)) {
            state = TelephonyManager.CALL_STATE_RINGING;
        } else if (stateStr.equals(TelephonyManager.EXTRA_STATE_IDLE)) {
            state = TelephonyManager.CALL_STATE_IDLE;
        }


        // Avoid double processing on state change (e.g., from RINGING to OFFHOOK)
        if (state == lastState) {
            return;
        }

        // Check feature status right before the recording logic
        boolean featureEnabled = isFeatureEnabled(context);

        switch (state) {
            case TelephonyManager.CALL_STATE_RINGING:
                Log.d(TAG, "Call State: RINGING");
                break;

            case TelephonyManager.CALL_STATE_OFFHOOK:
                Log.d(TAG, "Call State: OFFHOOK (Call started)");
                // Transitioned to active call state, start the recording service ONLY if feature is enabled
                if (!isRecording && featureEnabled) {
                    isRecording = true;
                    startRecordingService(context);
                } else if (!featureEnabled) {
                     Log.w(TAG, "Call detected but Voice Analysis feature is disabled by the user.");
                }
                break;

            case TelephonyManager.CALL_STATE_IDLE:
                Log.d(TAG, "Call State: IDLE (Call ended)");
                // Transitioned to idle state, stop the recording service
                if (isRecording) {
                    isRecording = false;
                    stopRecordingService(context);
                }
                break;
        }

        lastState = state;
    }

    /** Starts the CallRecordingService */
    private void startRecordingService(Context context) {
        Intent serviceIntent = new Intent(context, CallRecordingService.class);
        serviceIntent.setAction(CallRecordingService.ACTION_START_RECORDING);
        
        // CRITICAL FIX: Use startForegroundService for long-running background tasks (required for API 26+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
        
        Log.i(TAG, "Starting CallRecordingService with START action...");
    }

    /** Stops the CallRecordingService */
    private void stopRecordingService(Context context) {
        Intent serviceIntent = new Intent(context, CallRecordingService.class);
        serviceIntent.setAction(CallRecordingService.ACTION_STOP_RECORDING);
        // We use stopService (which triggers onDestroy) but ensure it runs correctly via startService/Action
        context.startService(serviceIntent);
        Log.i(TAG, "Stopping CallRecordingService with STOP action...");
        // CallRecordingService.onDestroy() will now run and finish the file.
    }
}
