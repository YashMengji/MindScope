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
    private static final String PREFS_NAME = "ScreenPrefs"; // Matches Bridge Module
    private static final String TARGET_PACKAGE = "com.instagram.android";

    // --- DYNAMIC SETTINGS (Updated from SharedPreferences) ---
    private long dailyLimitMs = 30 * 60 * 1000; 
    private long sessionLimitMs = 10 * 60 * 1000;
    private long cooldownDurationMs = 15 * 60 * 1000;
    private long warningThresholdMs = 8 * 60 * 1000;

    // --- FEATURE FLAGS ---
    private boolean isTimeLimitEnabled = false;
    private boolean isSessionLimitEnabled = false;
    private boolean isCooldownEnabled = false;
    private boolean isWarningEnabled = false;

    // --- State Tracking ---
    private String currentPackage = "";
    private long sessionStartTime = 0;
    private long totalDailyUsage = 0; // In a production app, persist this daily
    private long cooldownStartTime = 0;
    
    private WindowManager windowManager;
    private View overlayView;
    private boolean isOverlayShowing = false;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        
        // --- ADDITION: Initial load of settings ---
        refreshSettings();
        Log.d(TAG, "Service Connected and Settings Loaded");
    }

    /**
     * READS Shared Preferences saved by ScreenControllerModule.java
     */
    private void refreshSettings() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        // 1. Update Enabled/Disabled Flags
        isTimeLimitEnabled = prefs.getBoolean("timeBased_enabled", false);
        isSessionLimitEnabled = prefs.getBoolean("sessionBased_enabled", false);
        isCooldownEnabled = prefs.getBoolean("cooldown_enabled", false);
        isWarningEnabled = prefs.getBoolean("warningOverlay_enabled", false);

        // 2. Update Time Values (Converting mins from Prefs to Milliseconds)
        dailyLimitMs = prefs.getInt("timeBased_time", 30) * 60 * 1000L;
        sessionLimitMs = prefs.getInt("sessionBased_time", 10) * 60 * 1000L;
        cooldownDurationMs = prefs.getInt("cooldown_time", 15) * 60 * 1000L;
        
        // Warning threshold is usually slightly less than session limit
        warningThresholdMs = Math.max(0, sessionLimitMs - (2 * 60 * 1000L));

        Log.d(TAG, "Settings Refreshed: TimeLimitEnabled=" + isTimeLimitEnabled + ", Limit=" + (dailyLimitMs/60000) + "m");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // --- ADDITION: Refresh settings on app switch to ensure latest UI state is used ---
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            refreshSettings();
            
            String packageName = event.getPackageName() != null ? event.getPackageName().toString() : "";
            handlePackageChange(packageName);
        }
    }

    private void handlePackageChange(String newPackage) {
        long now = System.currentTimeMillis();

        // App Switch Logic: Moving away from Target
        if (currentPackage.equals(TARGET_PACKAGE) && !newPackage.equals(TARGET_PACKAGE)) {
            long sessionDuration = now - sessionStartTime;
            totalDailyUsage += sessionDuration;
            handler.removeCallbacksAndMessages(null);
            removeOverlay();
        }

        currentPackage = newPackage;

        // Moving into Target (Instagram)
        if (currentPackage.equals(TARGET_PACKAGE)) {
            
            // --- ADDITION: Check Cooldown Feature ---
            if (isCooldownEnabled && now < cooldownStartTime + cooldownDurationMs) {
                showBlockingOverlay("Cooldown active. Please wait.");
                handler.postDelayed(() -> performGlobalAction(GLOBAL_ACTION_BACK), 2000);
                return;
            }

            // --- ADDITION: Check Daily Time Limit Feature ---
            if (isTimeLimitEnabled && totalDailyUsage >= dailyLimitMs) {
                showBlockingOverlay("Daily limit reached for Instagram.");
                handler.postDelayed(() -> performGlobalAction(GLOBAL_ACTION_BACK), 2000);
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

                    // --- ADDITION: Session Warning Feature ---
                    if (isWarningEnabled && currentSessionDuration >= warningThresholdMs && currentSessionDuration < sessionLimitMs) {
                        showWarning("Your session is almost over!");
                    }

                    // --- ADDITION: Session Limit Feature ---
                    if (isSessionLimitEnabled && currentSessionDuration >= sessionLimitMs) {
                        cooldownStartTime = System.currentTimeMillis();
                        showBlockingOverlay("Session limit reached.");
                        performGlobalAction(GLOBAL_ACTION_BACK);
                    } else {
                        handler.postDelayed(this, 10000); // Check every 10 seconds
                    }
                }
            }
        }, 10000);
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
            overlayView.setBackgroundColor(0xEE000000); // Darker for blocking
            
            TextView text = overlayView.findViewById(android.R.id.text1);
            text.setText(message);
            text.setTextColor(0xFFFFFFFF);
            text.setGravity(Gravity.CENTER);
            text.setTextSize(20);

            try {
                windowManager.addView(overlayView, params);
                isOverlayShowing = true;
            } catch (Exception e) {
                Log.e(TAG, "Overlay Error: " + e.getMessage());
            }
        });
    }

    private void showWarning(String message) {
        // Implementation for a temporary toast or small overlay
        Log.w(TAG, "WARNING: " + message);
    }

    private void removeOverlay() {
        if (isOverlayShowing && overlayView != null) {
            try {
                windowManager.removeView(overlayView);
            } catch (Exception e) {
                Log.e(TAG, "Error removing overlay: " + e.getMessage());
            }
            isOverlayShowing = false;
        }
    }

    @Override
    public void onInterrupt() {}
}