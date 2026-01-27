package com.mobileapp;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.util.Log;
import android.os.Handler;
import android.os.Looper;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.ReactApplication;

import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.List;
import java.util.ArrayList;

public class ChatAccessibilityService extends AccessibilityService {

    private static final String TAG = "ChatAccessibilityService";
    private static ReactApplicationContext reactContext = null; // injected by RN bridge

    // Dedup guard (same message emitted within this ms will be skipped)
    private final Map<String, Long> recentMessages = new HashMap<>();
    private static final long DEDUP_WINDOW_MS = 1000;

    // Last message typed in the EditText, used to report "Sent" messages
    private String lastTypedMessage = null;
    private long lastClearTimestamp = 0;
    private static final long SESSION_TIMEOUT = 20 * 1000; // 3 mins in ms
    private long sessionStartTime = -1;
    private long lastMessageTime = -1;
    private static final String TARGET_APP = "com.whatsapp";
    private static final Set<String> IGNORE_PACKAGES = new HashSet<>(Arrays.asList(
        "com.google.android.inputmethod.latin",   // Gboard
        "com.samsung.android.honeyboard",         // Samsung keyboard
        "com.android.systemui"                    // System UI, optional
    ));

    private List<String> currentMessages = new ArrayList<>();
    private long lastWhatsAppEventTime = 0;
    private Handler idleHandler = new Handler();

    private Runnable idleCheckRunnable = new Runnable() {
        @Override
        public void run() {
            long currentTime = System.currentTimeMillis();
            
            if (sessionStartTime != -1) {
                // Check what's ACTUALLY on screen right now
                boolean whatsAppOnScreen = false;
                
                try {
                    AccessibilityNodeInfo root = getRootInActiveWindow();
                    if (root != null) {
                        CharSequence pkg = root.getPackageName();
                        whatsAppOnScreen = pkg != null && TARGET_APP.equals(pkg.toString());
                        root.recycle(); // Clean up
                    }
                } catch (Exception e) {
                    // Ignore errors
                }
                
                Log.d(TAG, "Check → WhatsApp on screen: " + whatsAppOnScreen);
                
                if (whatsAppOnScreen) {
                    // WhatsApp is visible - reset timer
                    lastWhatsAppEventTime = currentTime;
                } else {
                    // WhatsApp NOT visible - check timer
                    long timeSince = currentTime - lastWhatsAppEventTime;
                    if (timeSince > 3000) {
                        Log.d(TAG, "Session ending - WhatsApp not visible for " + timeSince + "ms");
                        endCurrentSession();
                    }
                }
            }
            
            idleHandler.postDelayed(this, 1000);
        }
    };

    /**
     * Injects the React Native context via the bridge.
     */
    public static void setReactContext(ReactApplicationContext context) {
        reactContext = context;
        if (context != null) {
            Log.d(TAG, "React Native context injected successfully.");
        } else {
            Log.w(TAG, "React Native context is null.");
        }
    }

    /**
     * Called when the service is connected to the system.
     */
    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        Log.d(TAG, "Accessibility Service is connected!");
        // We configure the service here to be more dynamic.
        AccessibilityServiceInfo info = getServiceInfo();
        // info.packageNames = new String[]{"com.whatsapp"};
        // Listen for both text changes and clicks
        info.eventTypes = AccessibilityEvent.TYPE_VIEW_CLICKED | AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED | AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED | AccessibilityEvent.TYPE_VIEW_SCROLLED|AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED;

        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS |
                     AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS;
        info.notificationTimeout = 100;
        setServiceInfo(info);

        // Start idle checking - remove any existing callbacks first
        idleHandler.removeCallbacks(idleCheckRunnable);
        idleHandler.postDelayed(idleCheckRunnable, 1000);
    }

    // Unused but required by Android. We don't need to do anything with gestures.
    @Override
    public void onInterrupt() {
        Log.d(TAG, "onInterrupt called.");
    }


    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        int eventType = event.getEventType();
        long currentTime = System.currentTimeMillis();

        // Check if session expired FIRST
        if (sessionStartTime != -1 && (currentTime - sessionStartTime >= SESSION_TIMEOUT)) {
            endCurrentSession();
            Log.d(TAG, "Session ended due to timeout");
            return;
        }

        // Handle window state changes - this detects app switching
        if (eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            String packageName = (event.getPackageName() != null) ? event.getPackageName().toString() : "";
            String className = (event.getClassName() != null) ? event.getClassName().toString() : "";
            
            Log.d(TAG, "Window state changed - Package: " + packageName + ", Class: " + className);
            
            if (TARGET_APP.equals(packageName)) {
                // WhatsApp opened
                if (sessionStartTime == -1) {
                    startNewSession();
                    Log.d(TAG, "Session started → " + packageName);
                }
            } else {
                // ANY other package (including keyboard, system, launcher, other apps)
                lastWhatsAppEventTime = currentTime; // Start counting from NOW
                Log.d(TAG, "NOT WhatsApp: " + packageName + " - Setting foreground=false");
            }
        }

        // Track last time we saw a WhatsApp event
        if (event.getPackageName() != null && TARGET_APP.equals(event.getPackageName().toString())) {
            lastWhatsAppEventTime = currentTime;
            
            // Process WhatsApp-specific events
            if (eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) {
                handleTextChanged(event, currentTime);
            } else if (eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED) {
                if (lastTypedMessage != null) {
                    Log.d(TAG, "Send button detected");
                    currentMessages.add(lastTypedMessage);
                    lastTypedMessage = null;
                }
            }
        }
    }


    // this method handles text change in real time
    private void handleTextChanged(AccessibilityEvent event, long currentTime) {
        AccessibilityNodeInfo nodeInfo = event.getSource();
        if (nodeInfo != null && nodeInfo.getClassName() != null &&
            nodeInfo.getClassName().toString().contains("EditText")) {
            if (nodeInfo.getText() != null) {
                lastTypedMessage = nodeInfo.getText().toString();
                lastMessageTime = currentTime;
                Log.d(TAG, "Typing... : " + lastTypedMessage);
            }
        }
    }

    // this function is used to start a new session when a chat app is opened 
    private void startNewSession() {
        sessionStartTime = System.currentTimeMillis();
        lastWhatsAppEventTime = sessionStartTime; // Initialize
        lastMessageTime = sessionStartTime;
        currentMessages = new ArrayList<>();
        Log.d(TAG, "New session started at " + sessionStartTime);
    }

    // this function is used to end the session after timeout or when the chat app is closed
    private void endCurrentSession() {
        if (sessionStartTime == -1) return;

        // Cancel any pending idle checks
        idleHandler.removeCallbacks(idleCheckRunnable);

        if (currentMessages == null || currentMessages.isEmpty()) {
            Log.d(TAG, "No messages in this session, skipping send.");
            sessionStartTime = -1;
            currentMessages = new ArrayList<>(); // reset safely
            // RESTART IDLE CHECKER
            idleHandler.postDelayed(idleCheckRunnable, 1000);
            return;
        }

        long endTime = System.currentTimeMillis();

        try {
            // Encapsulate data
            WritableMap sessionData = Arguments.createMap();
            sessionData.putDouble("startTimestamp", sessionStartTime);
            sessionData.putDouble("endTimestamp", endTime);

            WritableArray messages = Arguments.createArray();
            for (String msg : currentMessages) {
                messages.pushString(msg);
            }
            sessionData.putArray("messages", messages);

            sendEventToReactNative(sessionData);

            Log.d(TAG, "Session ended: " + sessionData.toString());
        }catch (Exception e) {
            Log.e(TAG, "Error ending session: " + e.getMessage(), e);
        } finally {
            // Reset
            sessionStartTime = -1;
            currentMessages.clear();
            // Reset session state
            lastTypedMessage = null;
            // RESTART IDLE CHECKER
            idleHandler.postDelayed(idleCheckRunnable, 1000);
        }
    }

    // EXIT POINT
    // this is used to send the session object(data) to react native app
    private void sendEventToReactNative(WritableMap sessionData) {
        if (reactContext != null) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("ChatSessionEvent", sessionData);
        }
    }

    @Override
    public void onDestroy() {
        // Stop idle checking
        idleHandler.removeCallbacks(idleCheckRunnable);
        super.onDestroy();
    }
}