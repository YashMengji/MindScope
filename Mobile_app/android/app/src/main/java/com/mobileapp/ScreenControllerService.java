package com.mobileapp;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.PixelFormat;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.widget.TextView;
import java.util.HashMap;
import java.util.Map;

/**
 * Service to monitor app usage and enforce time, session, and cooldown restrictions.
 */
public class ScreenControllerService extends AccessibilityService {
    private static final String TAG = "ScreenController";
    
    // --- Configurable Limits (These could be fetched from SharedPreferences/React Native) ---
    private static final long DAILY_LIMIT_MS = 30 * 60 * 1000; // 30 mins
    private static final long SESSION_LIMIT_MS = 10 * 60 * 1000; // 10 mins
    private static final long COOLDOWN_DURATION_MS = 15 * 60 * 1000; // 15 mins
    private static final String TARGET_PACKAGE = "com.instagram.android";

    // --- State Tracking ---
    private String currentPackage = "";
    private long sessionStartTime = 0;
    private long totalDailyUsage = 0;
    private long cooldownStartTime = 0;
    
    private Handler handler = new Handler(Looper.getMainLooper());
    private WindowManager windowManager;
    private View overlayView;
    private boolean isOverlayShowing = false;

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        Log.d(TAG, "Screen Controller Service Connected");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            String packageName = event.getPackageName() != null ? event.getPackageName().toString() : "";
            handlePackageChange(packageName);
        }
    }

    private void handlePackageChange(String newPackage) {
        long now = System.currentTimeMillis();

        // 1. If leaving a restricted app, finalize session usage
        if (currentPackage.equals(TARGET_PACKAGE) && !newPackage.equals(TARGET_PACKAGE)) {
            long sessionDuration = now - sessionStartTime;
            totalDailyUsage += sessionDuration;
            Log.d(TAG, "Left " + TARGET_PACKAGE + ". Session lasted: " + (sessionDuration / 1000) + "s");
            removeOverlay();
        }

        // 2. Update current state
        currentPackage = newPackage;

        // 3. If entering a restricted app
        if (currentPackage.equals(TARGET_PACKAGE)) {
            // CHECK COOLDOWN
            if (now < cooldownStartTime + COOLDOWN_DURATION_MS) {
                showBlockingOverlay("Cooldown Active. Wait 15 mins.");
                return;
            }

            // CHECK DAILY LIMIT
            if (totalDailyUsage >= DAILY_LIMIT_MS) {
                showBlockingOverlay("Daily Limit Reached (30m).");
                return;
            }

            sessionStartTime = now;
            startSessionMonitor();
        }
    }

    private void startSessionMonitor() {
        handler.removeCallbacksAndMessages(null);
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (currentPackage.equals(TARGET_PACKAGE)) {
                    long now = System.currentTimeMillis();
                    long currentSessionDuration = now - sessionStartTime;

                    // Warning at 8 minutes
                    if (currentSessionDuration >= (8 * 60 * 1000) && currentSessionDuration < SESSION_LIMIT_MS) {
                        showWarning("You've been scrolling for 8 minutes!");
                    }

                    // Block at 10 minutes (Session Limit)
                    if (currentSessionDuration >= SESSION_LIMIT_MS) {
                        cooldownStartTime = System.currentTimeMillis();
                        showBlockingOverlay("Session Limit Reached. Cooldown Started.");
                        performGlobalAction(GLOBAL_ACTION_BACK); // Force exit
                    } else {
                        handler.postDelayed(this, 30000); // Check every 30 seconds
                    }
                }
            }
        }, 30000);
    }

    private void showBlockingOverlay(String message) {
        if (isOverlayShowing) return;

        handler.post(() -> {
            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                    PixelFormat.TRANSLUCENT);
            params.gravity = Gravity.CENTER;

            overlayView = LayoutInflater.from(this).inflate(android.R.layout.simple_list_item_1, null);
            overlayView.setBackgroundColor(0xCC000000); // Dark semi-transparent
            
            TextView text = overlayView.findViewById(android.R.id.text1);
            text.setText(message);
            text.setTextColor(0xFFFFFFFF);
            text.setGravity(Gravity.CENTER);

            windowManager.addView(overlayView, params);
            isOverlayShowing = true;
        });
    }

    private void showWarning(String message) {
        // Implementation for a temporary toast or small overlay
        Log.w(TAG, "WARNING: " + message);
    }

    private void removeOverlay() {
        if (isOverlayShowing && overlayView != null) {
            windowManager.removeView(overlayView);
            isOverlayShowing = false;
        }
    }

    @Override
    public void onInterrupt() {}
}