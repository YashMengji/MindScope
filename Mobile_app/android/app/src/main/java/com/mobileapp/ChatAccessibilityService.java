package com.mobileapp;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.util.Log;
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
    boolean inputJustCleared = false;
    private long lastClearTimestamp = 0;
    private static final long SESSION_TIMEOUT = 20 * 1000; // 3 mins in ms
    private long sessionStartTime = -1;
    private long lastMessageTime = -1;

    private List<String> currentMessages = new ArrayList<>();


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
        info.eventTypes = AccessibilityEvent.TYPE_VIEW_CLICKED | AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED | AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED | AccessibilityEvent.TYPE_VIEW_SCROLLED; 
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS |
                     AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS;
        info.notificationTimeout = 100;
        setServiceInfo(info);
    }

    // Unused but required by Android. We don't need to do anything with gestures.
    @Override
    public void onInterrupt() {
        Log.d(TAG, "onInterrupt called.");
    }

    // this method uses only two events to identify typing and whether send button is clicked
    /**
     * ENTRY POINT OF ACCESSIBILITY SERVICE
     * This is the main callback for all accessibility events.
     * We care about TYPE_VIEW_TEXT_CHANGED and TYPE_VIEW_CLICKED events.
     */
    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        int eventType = event.getEventType();

        // Start session if not started
        if (sessionStartTime == -1) {
            startNewSession();
        }

        long currentTime = System.currentTimeMillis();

        // Check if session expired
        if (currentTime - sessionStartTime >= SESSION_TIMEOUT) {
            endCurrentSession();
            startNewSession();
        }
        Log.d(TAG, "HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH");
        switch (eventType) {
            case AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED:
            handleTextChanged(event, currentTime);
            // Track when input text becomes empty after typing something
            List<CharSequence> eventText = event.getText();
            String newText = "";
            if (eventText != null && !eventText.isEmpty()) {
                newText = eventText.get(0).toString();
            }
            if (lastTypedMessage != null && newText.isEmpty()) {
                Log.d(TAG, "Input cleared → possible send");
                inputJustCleared = true; // flag for later
            }
            break;

            Log.d(TAG, "Window state changed: " + packageName);

            // Chat app opened
            if (packageName.equals("com.whatsapp")) {  // replace with target app
                if (sessionStartTime == -1) {
                    startNewSession();  
                    Log.d(TAG, "Session started → " + packageName);
                }
                // endCurrentSession();
                // startNewSession();

        if(eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED){
            handleTextChanged(event, currentTime);
        }

        if(eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED) {
            // If window changed right after input cleared → user pressed send
            if(lastTypedMessage != null) {
                Log.d(TAG, "Send button detected");
                currentMessages.add(lastTypedMessage);
                // endCurrentSession();
                lastTypedMessage = null;
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
                // currentMessages.add(lastTypedMessage);
                lastMessageTime = currentTime;
                Log.d(TAG, "Typing... : " + lastTypedMessage);
            }
        }
    }

    // this function is used to start a new session when a chat app is opened 
    private void startNewSession() {
        sessionStartTime = System.currentTimeMillis();
        lastMessageTime = sessionStartTime;
        currentMessages = new ArrayList<>();
        Log.d(TAG, "New session started at " + sessionStartTime);
    }

    // this function is used to end the session after timeout or when the chat app is closed
    private void endCurrentSession() {
        if (sessionStartTime == -1) return;

        if (currentMessages == null || currentMessages.isEmpty()) {
            Log.d(TAG, "No messages in this session, skipping send.");
            sessionStartTime = -1;
            currentMessages = new ArrayList<>(); // reset safely
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
        }
    }

    // this is used to send the session object(data) to react native app
    private void sendEventToReactNative(WritableMap sessionData) {
        if (reactContext != null) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("ChatSessionEvent", sessionData);
        }
    }
}