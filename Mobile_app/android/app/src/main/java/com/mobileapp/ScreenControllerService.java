package com.mobileapp;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.HashMap;
import java.util.Map;

public class ScreenControllerService extends AccessibilityService {
    private static final String TAG = "ScreenControllerService";
    private static final String PREFS_NAME = "ScreenPrefs";
    private static final String TARGET_PACKAGE = "com.google.android.youtube";

    private long dailyLimitMs = 30 * 60 * 1000;
    private long sessionLimitMs = 10 * 60 * 1000;
    private long cooldownDurationMs = 15 * 60 * 1000;

    private boolean isTimeLimitEnabled = false;
    private boolean isSessionLimitEnabled = false;
    private boolean isCooldownEnabled = false;

    private final Map<String, Long> dailyUsage = new HashMap<>();
    private final Map<String, Long> sessionStartTime = new HashMap<>();
    private final Map<String, Long> lastUsedTime = new HashMap<>();
    
    private String currentPackage = "";
    private long startTime = 0;
    private long lastClosedTimestamp = 0;
    private long cooldownActiveUntil = 0; // Tracks when cooldown expires

    private boolean dailyWarningShown = false;
    private boolean sessionWarningShown = false;

    private WindowManager windowManager;
    private View overlayView;
    private View warningView;
    private boolean isOverlayShowing = false;
    private boolean isWarningShowing = false;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private final Runnable usageTicker = new Runnable() {
        @Override
        public void run() {
            if (currentPackage.equals(TARGET_PACKAGE)) {
                updateTimers();
                checkAllLimits();
                handler.postDelayed(this, 1000);
            }
        }
    };

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        refreshSettings();
        Log.d(TAG, "ScreenControllerService Connected.");
    }

    private void refreshSettings() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        isTimeLimitEnabled = prefs.getBoolean("dailyLimit_enabled", false);
        dailyLimitMs = (long) prefs.getInt("dailyLimit_time", 30) * 60 * 1000;
        isSessionLimitEnabled = prefs.getBoolean("sessionLimit_enabled", false);
        sessionLimitMs = (long) prefs.getInt("sessionLimit_time", 10) * 60 * 1000;
        isCooldownEnabled = prefs.getBoolean("cooldown_enabled", false);
        cooldownDurationMs = (long) prefs.getInt("cooldown_time", 15) * 60 * 1000;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            refreshSettings();
            CharSequence pkg = event.getPackageName();
            if (pkg == null) return;

            String newPackage = pkg.toString();

            // Prevent self-triggering exit logic
            if ((isOverlayShowing || isWarningShowing) && newPackage.equals(getPackageName())) {
                return;
            }

            if (!newPackage.equals(TARGET_PACKAGE) && currentPackage.equals(TARGET_PACKAGE)) {
                updateTimers();
                lastUsedTime.put(TARGET_PACKAGE, System.currentTimeMillis());
                handler.removeCallbacks(usageTicker);
                removeOverlay();
                removeWarning();
            }

            if (newPackage.equals(TARGET_PACKAGE)) {
                if (System.currentTimeMillis() - lastClosedTimestamp < 2000) return; 

                // 1. Check if Cooldown is currently active
                if (isCooldownEnabled && System.currentTimeMillis() < cooldownActiveUntil) {
                    showBlocker("Cooldown period has not yet expired!");
                    return;
                }

                if (!newPackage.equals(currentPackage)) {
                    startTime = System.currentTimeMillis();
                    long lastExit = lastUsedTime.getOrDefault(TARGET_PACKAGE, 0L);
                    if (startTime - lastExit > cooldownDurationMs) {
                        sessionStartTime.put(TARGET_PACKAGE, startTime);
                        sessionWarningShown = false; // Reset session warning for new session
                    }
                    handler.post(usageTicker);
                }
                checkAllLimits(); 
            }
            currentPackage = newPackage;
        }
    }

    private void updateTimers() {
        if (startTime == 0 || !currentPackage.equals(TARGET_PACKAGE)) return;
        long now = System.currentTimeMillis();
        long elapsed = now - startTime;
        dailyUsage.put(TARGET_PACKAGE, dailyUsage.getOrDefault(TARGET_PACKAGE, 0L) + elapsed);
        startTime = now;
    }

    private void checkAllLimits() {
        if (!currentPackage.equals(TARGET_PACKAGE)) return;
        long now = System.currentTimeMillis();
        
        // --- Daily Limit Logic ---
        if (isTimeLimitEnabled) {
            long totalDaily = dailyUsage.getOrDefault(TARGET_PACKAGE, 0L);
            if (totalDaily >= dailyLimitMs) {
                showBlocker("Daily limit reached for Youtube");
                return;
            } else if (!dailyWarningShown && totalDaily >= (dailyLimitMs * 0.75)) {
                dailyWarningShown = true;
                showWarning("You have used 75% of your daily limit.");
            }
        }

        // --- Session Limit Logic ---
        if (isSessionLimitEnabled) {
            long sessionStart = sessionStartTime.getOrDefault(TARGET_PACKAGE, now);
            long sessionElapsed = now - sessionStart;
            if (sessionElapsed >= sessionLimitMs) {
                if (isCooldownEnabled) {
                    cooldownActiveUntil = System.currentTimeMillis() + cooldownDurationMs;
                }
                showBlocker("Session limit reached! Cooldown started.");
                return;
            } else if (!sessionWarningShown && sessionElapsed >= (sessionLimitMs * 0.75)) {
                sessionWarningShown = true;
                showWarning("You have used 75% of your session limit.");
            }
        }
    }

    private void showBlocker(String message) {
        if (isOverlayShowing) return;
        removeWarning(); // Clear warning if blocking starts

        handler.post(() -> {
            WindowManager.LayoutParams params = createLayoutParams();
            LinearLayout layout = createBaseLayout("#FB000000");

            TextView text = createTextView(message);
            layout.addView(text);

            Button closeBtn = createButton("Close App", "#E53935");
            closeBtn.setOnClickListener(v -> {
                lastClosedTimestamp = System.currentTimeMillis(); 
                performGlobalAction(GLOBAL_ACTION_HOME);
                removeOverlay();
            });
            layout.addView(closeBtn);

            try {
                windowManager.addView(layout, params);
                overlayView = layout;
                isOverlayShowing = true;
            } catch (Exception e) { Log.e(TAG, "Blocker Error: " + e.getMessage()); }
        });
    }

    private void showWarning(String message) {
        if (isWarningShowing || isOverlayShowing) return;

        handler.post(() -> {
            WindowManager.LayoutParams params = createLayoutParams();
            LinearLayout layout = createBaseLayout("#CC000000"); // Slightly more transparent

            TextView text = createTextView("WARNING\n" + message);
            layout.addView(text);

            Button okBtn = createButton("OK", "#4CAF50");
            okBtn.setOnClickListener(v -> removeWarning());
            layout.addView(okBtn);

            try {
                windowManager.addView(layout, params);
                warningView = layout;
                isWarningShowing = true;
            } catch (Exception e) { Log.e(TAG, "Warning Error: " + e.getMessage()); }
        });
    }

    private WindowManager.LayoutParams createLayoutParams() {
        return new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL | 
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN |
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                PixelFormat.TRANSLUCENT);
    }

    private LinearLayout createBaseLayout(String bgColor) {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setBackgroundColor(Color.parseColor(bgColor));
        return layout;
    }

    private TextView createTextView(String textStr) {
        TextView text = new TextView(this);
        text.setText(textStr);
        text.setTextColor(Color.WHITE);
        text.setTextSize(22);
        text.setGravity(Gravity.CENTER);
        text.setPadding(60, 20, 60, 40);
        return text;
    }

    private Button createButton(String text, String color) {
        Button btn = new Button(this);
        btn.setText(text);
        btn.setBackgroundColor(Color.parseColor(color));
        btn.setTextColor(Color.WHITE);
        return btn;
    }

    private void removeOverlay() {
        if (isOverlayShowing && overlayView != null) {
            try {
                windowManager.removeView(overlayView);
                isOverlayShowing = false;
                overlayView = null;
            } catch (Exception e) { Log.e(TAG, "Remove Error: " + e.getMessage()); }
        }
    }

    private void removeWarning() {
        if (isWarningShowing && warningView != null) {
            try {
                windowManager.removeView(warningView);
                isWarningShowing = false;
                warningView = null;
            } catch (Exception e) { Log.e(TAG, "Remove Warning Error: " + e.getMessage()); }
        }
    }

    @Override
    public void onInterrupt() {}
}