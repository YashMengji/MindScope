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
        info.eventTypes = AccessibilityEvent.TYPE_VIEW_CLICKED | AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED; 
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

            case AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED:
            // If window changed right after input cleared → user pressed send
            if (inputJustCleared) {
                Log.d(TAG, "Send button detected → Ending session.");
                if (lastTypedMessage != null) {
                    currentMessages.add(lastTypedMessage);
                }
                // endCurrentSession();
                // startNewSession();

                inputJustCleared = false; // reset flag
                lastTypedMessage = null;
            }
            break;
        }
    }

    /**
     * Handles text change events, storing the last typed message.
     * This method is generic and looks for any EditText node.
     *
     * @param event The accessibility event.
     */
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

    /**
     Handles view click events and checks if the clicked view is a "send" button.
     This method uses a heuristic based on content description.
    */
    // private void handleViewClicked(AccessibilityEvent event) {
    //     AccessibilityNodeInfo source = event.getSource();
    //     if (source == null) {
    //         return;
    //     }

    //     boolean isSendButton = false;

    //     // Heuristic 1: Check class name
    //     String className = source.getClassName() != null ? source.getClassName().toString() : "";
    //     if (BUTTON_CLASSES.contains(className)) {
    //         // Heuristic 2: Check content description
    //         CharSequence contentDescription = source.getContentDescription();
    //         if (contentDescription != null) {
    //             String lowerCaseDescription = contentDescription.toString().toLowerCase(Locale.US);
    //             for (String keyword : SEND_KEYWORDS) {
    //                 if (lowerCaseDescription.contains(keyword)) {
    //                     isSendButton = true;
    //                     break;
    //                 }
    //             }
    //         }
    //         if (isSendButton) {
    //             Log.d(TAG, "Send button identified by class name and content description.");
    //         }
    //     }

    //     // If not already identified, check text content as an alternative.
    //     if (!isSendButton) {
    //         CharSequence text = source.getText();
    //         if (text != null) {
    //             String lowerCaseText = text.toString().toLowerCase(Locale.US);
    //             for (String keyword : SEND_KEYWORDS) {
    //                 if (lowerCaseText.contains(keyword)) {
    //                     isSendButton = true;
    //                     break;
    //                 }
    //             }
    //         }
    //         if (isSendButton) {
    //             Log.d(TAG, "Send button identified by text content.");
    //         }
    //     }

    //     // If not identified, check resource ID as another alternative.
    //     if (!isSendButton) {
    //         String resourceId = source.getViewIdResourceName();
    //         if (resourceId != null) {
    //             String lowerCaseId = resourceId.toLowerCase(Locale.US);
    //             for (String keyword : ID_KEYWORDS) {
    //                 if (lowerCaseId.contains(keyword)) {
    //                     isSendButton = true;
    //                     break;
    //                 }
    //             }
    //         }
    //         if (isSendButton) {
    //             Log.d(TAG, "Send button identified by resource ID keyword.");
    //         }
    //     }
        
    //     // Final action if any heuristic matched
    //     if (isSendButton) {
    //         if (lastTypedMessage != null && !lastTypedMessage.isEmpty()) {
    //             emitLabeled("[Sent]", lastTypedMessage);
    //             lastTypedMessage = null; // Clear the message after sending
    //         }
    //     }
    // }


    /**
     * Logs the message to Logcat and emits to React Native, with a debounce to prevent duplicates.
     */
    private void startNewSession() {
        sessionStartTime = System.currentTimeMillis();
        lastMessageTime = sessionStartTime;
        currentMessages.clear();
        Log.d(TAG, "New session started at " + sessionStartTime);
    }

    private void endCurrentSession() {
        if (sessionStartTime == -1) return;

        long endTime = System.currentTimeMillis();

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

        // Reset
        sessionStartTime = -1;
        currentMessages.clear();
    }

    private void sendEventToReactNative(WritableMap sessionData) {
        if (reactContext != null) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("ChatSessionEvent", sessionData);
        }
    }
}