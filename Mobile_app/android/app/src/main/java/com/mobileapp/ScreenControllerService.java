package com.mobileapp;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
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
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class ScreenControllerService extends AccessibilityService {
    private static final String TAG = "ScreenControllerService";
    private static final String PREFS_NAME = "ScreenPrefs";
    private static final String MONITORED_PACKAGES_KEY = "monitored_packages";
    private static final String LEGACY_PACKAGE = "com.google.android.youtube";

    // The set of packages with at least one limit enabled (loaded from prefs).
    private Set<String> monitoredPackages = new HashSet<>();

    // Per-package settings (loaded from prefs for whichever apps are monitored).
    private final Map<String, Boolean> dailyLimitEnabled = new HashMap<>();
    private final Map<String, Boolean> sessionLimitEnabled = new HashMap<>();
    private final Map<String, Boolean> cooldownEnabled = new HashMap<>();
    private final Map<String, Long> dailyLimitMs = new HashMap<>();
    private final Map<String, Long> sessionLimitMs = new HashMap<>();
    private final Map<String, Long> cooldownDurationMs = new HashMap<>();

    // Per-package runtime tracking.
    private final Map<String, Long> dailyUsage = new HashMap<>();
    private final Map<String, Long> sessionStartTime = new HashMap<>();
    private final Map<String, Long> lastUsedTime = new HashMap<>();
    private final Map<String, Long> cooldownActiveUntil = new HashMap<>();
    private final Map<String, Boolean> dailyWarningShown = new HashMap<>();
    private final Map<String, Boolean> sessionWarningShown = new HashMap<>();

    private String currentPackage = "";
    private long startTime = 0;
    private long lastClosedTimestamp = 0;

    private WindowManager windowManager;
    private View overlayView;
    private View warningView;
    private boolean isOverlayShowing = false;
    private boolean isWarningShowing = false;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private final Runnable usageTicker = new Runnable() {
        @Override
        public void run() {
            if (isMonitored(currentPackage)) {
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
        migrateLegacySettingsIfNeeded();
        refreshSettings();
        Log.d(TAG, "ScreenControllerService Connected. Monitoring: " + monitoredPackages);
    }

    private boolean isMonitored(String pkg) {
        return pkg != null && monitoredPackages.contains(pkg);
    }

    // One-time migration: older builds stored a single global YouTube-only config.
    private void migrateLegacySettingsIfNeeded() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        Set<String> monitored = prefs.getStringSet(MONITORED_PACKAGES_KEY, null);
        boolean hasLegacy = prefs.contains("dailyLimit_enabled")
                || prefs.contains("sessionLimit_enabled")
                || prefs.contains("cooldown_enabled");

        if ((monitored == null || monitored.isEmpty()) && hasLegacy) {
            String p = LEGACY_PACKAGE + "_";
            SharedPreferences.Editor editor = prefs.edit();
            editor.putBoolean(p + "dailyLimit_enabled", prefs.getBoolean("dailyLimit_enabled", false));
            editor.putInt(p + "dailyLimit_time", prefs.getInt("dailyLimit_time", 30));
            editor.putBoolean(p + "sessionLimit_enabled", prefs.getBoolean("sessionLimit_enabled", false));
            editor.putInt(p + "sessionLimit_time", prefs.getInt("sessionLimit_time", 10));
            editor.putBoolean(p + "cooldown_enabled", prefs.getBoolean("cooldown_enabled", false));
            editor.putInt(p + "cooldown_time", prefs.getInt("cooldown_time", 15));

            Set<String> migrated = new HashSet<>();
            migrated.add(LEGACY_PACKAGE);
            editor.putStringSet(MONITORED_PACKAGES_KEY, migrated);
            editor.apply();
            Log.d(TAG, "Migrated legacy global limits to per-package keys for " + LEGACY_PACKAGE);
        }
    }

    // Reloads the monitored set and each monitored package's settings from prefs.
    private void refreshSettings() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        monitoredPackages = new HashSet<>(
                prefs.getStringSet(MONITORED_PACKAGES_KEY, new HashSet<String>()));

        for (String pkg : monitoredPackages) {
            String p = pkg + "_";
            dailyLimitEnabled.put(pkg, prefs.getBoolean(p + "dailyLimit_enabled", false));
            dailyLimitMs.put(pkg, (long) prefs.getInt(p + "dailyLimit_time", 30) * 60 * 1000);
            sessionLimitEnabled.put(pkg, prefs.getBoolean(p + "sessionLimit_enabled", false));
            sessionLimitMs.put(pkg, (long) prefs.getInt(p + "sessionLimit_time", 10) * 60 * 1000);
            cooldownEnabled.put(pkg, prefs.getBoolean(p + "cooldown_enabled", false));
            cooldownDurationMs.put(pkg, (long) prefs.getInt(p + "cooldown_time", 15) * 60 * 1000);
        }
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            refreshSettings();
            CharSequence pkg = event.getPackageName();
            if (pkg == null) return;

            String newPackage = pkg.toString();

            // Prevent self-triggering exit logic while our own overlay is showing.
            if ((isOverlayShowing || isWarningShowing) && newPackage.equals(getPackageName())) {
                return;
            }

            // Leaving a monitored app: bank its usage, stop its ticker, clear overlays.
            if (!newPackage.equals(currentPackage) && isMonitored(currentPackage)) {
                updateTimers();
                lastUsedTime.put(currentPackage, System.currentTimeMillis());
                handler.removeCallbacks(usageTicker);
                removeOverlay();
                removeWarning();
            }

            // Entering a monitored app: enforce its own limits.
            if (isMonitored(newPackage)) {
                if (System.currentTimeMillis() - lastClosedTimestamp < 2000) {
                    currentPackage = newPackage;
                    return;
                }

                // 1. Check if this app's cooldown is currently active.
                if (cooldownEnabled.getOrDefault(newPackage, false)
                        && System.currentTimeMillis() < cooldownActiveUntil.getOrDefault(newPackage, 0L)) {
                    currentPackage = newPackage;
                    showBlocker("Cooldown period has not yet expired!");
                    return;
                }

                if (!newPackage.equals(currentPackage)) {
                    startTime = System.currentTimeMillis();
                    long lastExit = lastUsedTime.getOrDefault(newPackage, 0L);
                    long cooldown = cooldownDurationMs.getOrDefault(newPackage, 0L);
                    if (startTime - lastExit > cooldown) {
                        sessionStartTime.put(newPackage, startTime);
                        sessionWarningShown.put(newPackage, false);
                    }
                    currentPackage = newPackage;
                    handler.post(usageTicker);
                }
                checkAllLimits();
            }
            currentPackage = newPackage;
        }
    }

    private void updateTimers() {
        if (startTime == 0 || !isMonitored(currentPackage)) return;
        long now = System.currentTimeMillis();
        long elapsed = now - startTime;
        dailyUsage.put(currentPackage, dailyUsage.getOrDefault(currentPackage, 0L) + elapsed);
        startTime = now;
    }

    private void checkAllLimits() {
        if (!isMonitored(currentPackage)) return;
        long now = System.currentTimeMillis();
        String pkg = currentPackage;

        // --- Daily Limit Logic ---
        if (dailyLimitEnabled.getOrDefault(pkg, false)) {
            long limit = dailyLimitMs.getOrDefault(pkg, 0L);
            long totalDaily = dailyUsage.getOrDefault(pkg, 0L);
            if (totalDaily >= limit) {
                showBlocker("Daily limit reached for " + getAppLabel(pkg));
                return;
            } else if (!dailyWarningShown.getOrDefault(pkg, false) && totalDaily >= (limit * 0.75)) {
                dailyWarningShown.put(pkg, true);
                showWarning("You have used 75% of your daily limit.");
            }
        }

        // --- Session Limit Logic ---
        if (sessionLimitEnabled.getOrDefault(pkg, false)) {
            long limit = sessionLimitMs.getOrDefault(pkg, 0L);
            long sessionStart = sessionStartTime.getOrDefault(pkg, now);
            long sessionElapsed = now - sessionStart;
            if (sessionElapsed >= limit) {
                if (cooldownEnabled.getOrDefault(pkg, false)) {
                    cooldownActiveUntil.put(pkg,
                            System.currentTimeMillis() + cooldownDurationMs.getOrDefault(pkg, 0L));
                }
                showBlocker("Session limit reached! Cooldown started.");
                return;
            } else if (!sessionWarningShown.getOrDefault(pkg, false) && sessionElapsed >= (limit * 0.75)) {
                sessionWarningShown.put(pkg, true);
                showWarning("You have used 75% of your session limit.");
            }
        }
    }

    private String getAppLabel(String packageName) {
        try {
            PackageManager pm = getPackageManager();
            ApplicationInfo info = pm.getApplicationInfo(packageName, 0);
            return pm.getApplicationLabel(info).toString();
        } catch (Exception e) {
            return "this app";
        }
    }

    private void showBlocker(String message) {
        if (isOverlayShowing) return;
        removeWarning(); // Clear warning if blocking starts

        handler.post(() -> {
            WindowManager.LayoutParams params = createLayoutParams();
            LinearLayout root = createOverlayRoot();
            LinearLayout card = createCard();

            addIcon(card, "⛔");
            addVerticalSpace(card, 16);
            addBadge(card, "TIME LIMIT REACHED", Color.rgb(252, 165, 165));
            addVerticalSpace(card, 10);
            addMessage(card, message);
            addVerticalSpace(card, 32);

            Button closeBtn = createPillButton("Close App", Color.rgb(239, 68, 68));
            closeBtn.setOnClickListener(v -> {
                lastClosedTimestamp = System.currentTimeMillis();
                performGlobalAction(GLOBAL_ACTION_HOME);
                removeOverlay();
            });
            card.addView(closeBtn);

            root.addView(card);

            try {
                windowManager.addView(root, params);
                overlayView = root;
                isOverlayShowing = true;
            } catch (Exception e) { Log.e(TAG, "Blocker Error: " + e.getMessage()); }
        });
    }

    private void showWarning(String message) {
        if (isWarningShowing || isOverlayShowing) return;

        handler.post(() -> {
            WindowManager.LayoutParams params = createLayoutParams();
            LinearLayout root = createOverlayRoot();
            LinearLayout card = createCard();

            addIcon(card, "⏳");
            addVerticalSpace(card, 16);
            addBadge(card, "HEADS UP", Color.rgb(253, 224, 71));
            addVerticalSpace(card, 10);
            addMessage(card, message);
            addVerticalSpace(card, 32);

            Button okBtn = createPillButton("Got it", Color.rgb(99, 102, 241));
            okBtn.setOnClickListener(v -> removeWarning());
            card.addView(okBtn);

            root.addView(card);

            try {
                windowManager.addView(root, params);
                warningView = root;
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

    // ── Modern card overlay (matches Section Blocker styling) ─────────────────

    private LinearLayout createOverlayRoot() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.argb(220, 10, 10, 30));
        root.setPadding(48, 48, 48, 48);
        return root;
    }

    private LinearLayout createCard() {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER);
        android.graphics.drawable.GradientDrawable cardBg = new android.graphics.drawable.GradientDrawable();
        cardBg.setColor(Color.argb(210, 20, 20, 55));
        cardBg.setCornerRadius(56f);
        cardBg.setStroke(2, Color.argb(80, 160, 160, 255));
        card.setBackground(cardBg);
        card.setPadding(64, 72, 64, 56);
        return card;
    }

    private void addIcon(LinearLayout card, String emoji) {
        TextView icon = new TextView(this);
        icon.setText(emoji);
        icon.setTextSize(40f);
        icon.setGravity(Gravity.CENTER);
        card.addView(icon);
    }

    private void addBadge(LinearLayout card, String label, int color) {
        TextView badge = new TextView(this);
        badge.setText(label);
        badge.setTextColor(color);
        badge.setTextSize(11f);
        badge.setTypeface(null, android.graphics.Typeface.BOLD);
        badge.setGravity(Gravity.CENTER);
        card.addView(badge);
    }

    private void addMessage(LinearLayout card, String message) {
        TextView msg = new TextView(this);
        msg.setText(message);
        msg.setTextColor(Color.WHITE);
        msg.setTextSize(16f);
        msg.setTypeface(null, android.graphics.Typeface.BOLD);
        msg.setGravity(Gravity.CENTER);
        card.addView(msg);
    }

    private Button createPillButton(String text, int color) {
        Button btn = new Button(this);
        btn.setText(text);
        btn.setTextColor(Color.WHITE);
        btn.setAllCaps(false);
        android.graphics.drawable.GradientDrawable btnBg = new android.graphics.drawable.GradientDrawable();
        btnBg.setColor(color);
        btnBg.setCornerRadius(32f);
        btn.setBackground(btnBg);
        return btn;
    }

    private void addVerticalSpace(LinearLayout parent, int dp) {
        View space = new View(this);
        float density = getResources().getDisplayMetrics().density;
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, (int) (dp * density));
        space.setLayoutParams(p);
        parent.addView(space);
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
