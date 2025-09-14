package com.mobileapp;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Chat Accessibility Service
 * - Logs text as the user is typing (Logcat only).
 * - Emits the full message to React Native only when a new chat bubble is detected.
 */
public class ChatAccessibilityService extends AccessibilityService {

    private static final String TAG = "ChatAccessibilityService";
    private static ReactApplicationContext reactContext = null;

    // Allows the React Native bridge to inject context
    public static void setReactContext(ReactApplicationContext context) {
        reactContext = context;
        Log.d(TAG, "React context injected into AccessibilityService");
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();

        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        // Now listening to window content changes and text changes
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED |
                          AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.packageNames = null; // Listen to all packages for now

        info.notificationTimeout = 50;
        info.flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS |
                     AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS;
        setServiceInfo(info);

        Log.d(TAG, "Service connected. Waiting for events...");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        int eventType = event.getEventType();
        AccessibilityNodeInfo source = event.getSource();
        if (source == null) return;

        try {
            if (eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
                // This event is much more reliable for detecting a new message bubble
                captureAndEmitLastMessage();
            } else if (eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) {
                // Log the text as it is being typed, but do NOT send to RN
                CharSequence text = source.getText();
                if (text != null && text.length() > 0) {
                    Log.d(TAG, "[Typing] " + text.toString().trim());
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in onAccessibilityEvent: " + e.getMessage(), e);
        } finally {
            if (source != null) {
                source.recycle();
            }
        }
    }

    // Captures the text from the most recent message bubble and sends it to RN
    private void captureAndEmitLastMessage() {
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode == null) {
            Log.w(TAG, "captureAndEmitLastMessage: root node is null.");
            return;
        }

        // We will find all text nodes and get the last one, as it will be the most recent message
        // This is a heuristic that works well for chat apps like WhatsApp
        List<AccessibilityNodeInfo> allTextNodes = rootNode.findAccessibilityNodeInfosByViewId("com.whatsapp:id/message_text");
        
        if (allTextNodes != null && !allTextNodes.isEmpty()) {
            AccessibilityNodeInfo lastMessageNode = allTextNodes.get(allTextNodes.size() - 1);
            if (lastMessageNode != null && lastMessageNode.getText() != null) {
                String text = lastMessageNode.getText().toString().trim();
                if (!text.isEmpty()) {
                    emitLabeled("[Sent]", text);
                } else {
                    Log.d(TAG, "Last message node was empty. Nothing to send.");
                }
            }
            // Always recycle nodes to prevent memory leaks
            for (AccessibilityNodeInfo node : allTextNodes) {
                node.recycle();
            }
        } else {
            Log.d(TAG, "Could not find any message nodes.");
        }
        
        rootNode.recycle();
    }

    private void emitLabeled(String label, String text) {
        String labeled = label + " " + text;
        
        Log.d(TAG, labeled);

        if (reactContext != null) {
            try {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onChatMessage", labeled);
                Log.d(TAG, "Emitted to RN: " + labeled);
            } catch (Exception e) {
                Log.e(TAG, "Failed to emit to RN: " + e.getMessage(), e);
            }
        } else {
            Log.w(TAG, "React context not set; RN event not emitted. Message: " + labeled);
        }
    }

    @Override
    public void onInterrupt() {
        Log.w(TAG, "AccessibilityService interrupted");
    }
}