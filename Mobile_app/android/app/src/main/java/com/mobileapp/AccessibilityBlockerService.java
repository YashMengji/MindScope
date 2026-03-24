package com.mobileapp;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.SharedPreferences;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.view.accessibility.AccessibilityWindowInfo;

import java.util.ArrayList;
import java.util.List;

import org.json.JSONObject;

/**
 * AccessibilityBlockerService.java
 *
 * MIUI 12 fix: The overlay is drawn as a native Android
 * TYPE_APPLICATION_OVERLAY window directly from this service,
 * bypassing the React Native Modal which cannot draw over other
 * apps on MIUI even with SYSTEM_ALERT_WINDOW granted.
 */
public class AccessibilityBlockerService extends AccessibilityService {

    private static final String TAG            = "BlockerService";
    private static final String PREFS_NAME     = "MindScopeBlocker";
    private static final String PREFS_SETTINGS = "settings_json";
    private static final String PKG_INSTAGRAM  = "com.instagram.android";
    private static final String PKG_YOUTUBE    = "com.google.android.youtube";
    private static final long   COOLDOWN_MS    = 3000;

    public static AccessibilityBlockerService instance = null;

    private long lastTriggerTime = 0;
    private WindowManager windowManager = null;
    private View overlayView = null;
    private boolean overlayShowing = false;

    private static final String[] MESSAGES = {
        "Your attention is precious.\nThis section was designed to keep you scrolling.\nYou chose differently — that takes strength.",
        "A mindful pause.\nEvery distraction you skip is a moment\nreturned to the life you actually want to live.",
        "You're in control.\nBreaking the scroll habit is hard.\nSetting this up means you're already winning.",
        "Protect your focus.\nYour goals and creativity need the time\nyou'd spend here. They're worth it.",
        "This was intentional.\nYou set this boundary for a reason.\nTrust your past self — they were looking out for you."
    };

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        info.eventTypes = AccessibilityEvent.TYPES_ALL_MASK;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_ALL_MASK;
        info.flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
                | AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
                | AccessibilityServiceInfo.DEFAULT;
        info.notificationTimeout = 100;
        setServiceInfo(info);

        Log.d(TAG, "✅ AccessibilityBlockerService connected, windowManager ready");
    }

    @Override
    public boolean onUnbind(Intent intent) {
        instance = null;
        dismissOverlay();
        Log.d(TAG, "⚠️ Service unbound");
        return super.onUnbind(intent);
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "⚠️ Service interrupted");
    }

    // ── Event handler ─────────────────────────────────────────────────────────

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        String pkg = event.getPackageName() != null
                ? event.getPackageName().toString() : "";

        boolean isInstagram = pkg.equals(PKG_INSTAGRAM);
        boolean isYoutube   = pkg.equals(PKG_YOUTUBE);
        if (!isInstagram && !isYoutube) return;

        int type = event.getEventType();
        if (type != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                && type != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
                && type != AccessibilityEvent.TYPE_WINDOWS_CHANGED) return;

        long now = System.currentTimeMillis();
        if (now - lastTriggerTime < COOLDOWN_MS) return;

        JSONObject settings = loadSettings();
        if (settings == null) return;

        String className = event.getClassName() != null
                ? event.getClassName().toString().toLowerCase() : "";

        Log.d(TAG, "📱 Event pkg=" + pkg + " class=" + className);

        if (isInstagram) checkInstagram(settings, className);
        else checkYoutube(settings, className);
    }

    // ── Instagram ─────────────────────────────────────────────────────────────

    private void checkInstagram(JSONObject settings, String className) {
        try {
            JSONObject ig = settings.optJSONObject("instagram");
            if (ig == null || !ig.optBoolean("masterEnabled", false)) return;
            AccessibilityNodeInfo root = getRootInActiveWindow();

            if (ig.optBoolean("blockStories", false)
                    && (className.contains("story") || hasNodeWithText(root, "Your story")
                    || hasNodeWithViewId(root, "story"))) {
                triggerBlock("Instagram", "Stories"); return;
            }
            if (ig.optBoolean("blockReels", false)
                    && (className.contains("reel") || hasNodeWithViewId(root, "clips_tab")
                    || hasNodeWithText(root, "Reels"))) {
                triggerBlock("Instagram", "Reels"); return;
            }
            if (ig.optBoolean("blockExplore", false)
                    && (className.contains("explore") || className.contains("search")
                    || hasNodeWithViewId(root, "action_bar_search_edit_text"))) {
                triggerBlock("Instagram", "Explore");
            }
        } catch (Exception e) { Log.e(TAG, "Instagram check: " + e.getMessage()); }
    }

    // ── YouTube ───────────────────────────────────────────────────────────────

    private void checkYoutube(JSONObject settings, String className) {
        try {
            JSONObject yt = settings.optJSONObject("youtube");
            if (yt == null || !yt.optBoolean("masterEnabled", false)) return;

            // Primary root for Shorts/search detection (active window)
            AccessibilityNodeInfo primaryRoot = getRootInActiveWindow();

            // ALL window roots — comments open as a separate bottom-sheet window;
            // getRootInActiveWindow() misses it entirely, so we must scan every window.
            List<AccessibilityNodeInfo> allRoots = getAllWindowRoots();

            if (yt.optBoolean("blockShorts", false)
                    && isShortsPlayerOpen(primaryRoot, className)) {
                triggerBlock("YouTube", "Shorts"); return;
            }
            if (yt.optBoolean("blockVideoSearch", false)
                    && (className.contains("search")
                    || hasNodeWithViewId(primaryRoot, "search_edit_text"))) {
                triggerBlock("YouTube", "Video Search"); return;
            }
            if (yt.optBoolean("blockPiP", false)
                    && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                try {
                    for (AccessibilityWindowInfo w : getWindows()) {
                        if (w.isInPictureInPictureMode()) {
                            triggerBlock("YouTube", "Picture-in-Picture"); return;
                        }
                    }
                } catch (Exception ignored) {}
            }
            if (yt.optBoolean("blockComments", false)
                    && isCommentsPanelOpen(allRoots)) {
                triggerBlock("YouTube", "Comments");
            }
        } catch (Exception e) { Log.e(TAG, "YouTube check: " + e.getMessage()); }
    }

    // ── Shorts player detection ───────────────────────────────────────────────

    /**
     * Returns true ONLY when the user is inside the full-screen Shorts player.
     *
     * Strategy — require at least ONE of these "player-only" signals:
     *   1. className contains "shorts" or "reelwatchfragment" — these activity/
     *      fragment names only appear when the player is the active screen
     *   2. View IDs that are exclusive to the Shorts player UI:
     *      - "reel_player_page"       : the ViewPager holding each Short
     *      - "reel_channel_bar"       : channel name bar inside the player
     *      - "shorts_video_container" : the video surface container
     *      - "like_button" + "dislike_button" together : action bar exclusive to player
     *
     * Deliberately EXCLUDED (these exist on the home feed shelf):
     *   - hasNodeWithText(root, "Shorts")  ← matches the shelf header label
     *   - hasNodeWithViewId(root, "shorts_pivot_item") ← matches shelf items
     */
    private boolean isShortsPlayerOpen(AccessibilityNodeInfo root, String className) {
        // Signal 1: activity/fragment class name — most reliable
        if (className.contains("shortsactivity")
                || className.contains("reelwatchfragment")
                || className.contains("shortsvideo")
                || className.contains("shorts_player")) {
            Log.d(TAG, "Shorts detected via className: " + className);
            return true;
        }

        // Signal 2: player-exclusive view IDs
        if (hasNodeWithViewId(root, "reel_player_page")) {
            Log.d(TAG, "Shorts detected via reel_player_page");
            return true;
        }
        if (hasNodeWithViewId(root, "reel_channel_bar")) {
            Log.d(TAG, "Shorts detected via reel_channel_bar");
            return true;
        }
        if (hasNodeWithViewId(root, "shorts_video_container")) {
            Log.d(TAG, "Shorts detected via shorts_video_container");
            return true;
        }

        // Signal 3: both like AND dislike buttons visible = inside player action bar
        // (home feed only shows like count, not the full action bar)
        if (hasNodeWithViewId(root, "like_button")
                && hasNodeWithViewId(root, "dislike_button")) {
            Log.d(TAG, "Shorts detected via like+dislike action bar");
            return true;
        }

        return false;
    }

    // ── Comments panel detection ─────────────────────────────────────────────

    /**
     * Returns true ONLY when the user has explicitly opened the comments panel/drawer.
     *
     * KEY INSIGHT: YouTube opens its comments as a bottom-sheet that is a SEPARATE
     * accessibility window from the video window.  getRootInActiveWindow() only sees
     * the video window behind the sheet, so all view-ID checks return false.
     * We fix this by passing ALL window roots and scanning every one of them.
     *
     * PRIMARY signal (works for both regular video AND Shorts, version-stable):
     *   "Add a comment"  → compose-box EditText hint shown only when panel is open
     *
     * SECONDARY — regular video bottom sheet:
     *   "comments_header_view"      → sticky header, only inflated when panel is open
     *   "sort_filter_button"        → Sort button exclusive to the open panel
     *   "Top comments"              → sort label inside the open panel header
     *   engagement_panel_container + comments_recycler_view → fallback for newer YT
     *
     * SECONDARY — Shorts comments drawer:
     *   "reel_comments_entry_point" PRESENT → drawer is CLOSED (early-out, return false)
     *   "comments_panel_header"             → only inflated when drawer is open
     *   "reply_composer_stub"               → comment reply box in open drawer
     *
     * Deliberately EXCLUDED (present even when panel/drawer is CLOSED):
     *   "engagement_panel"        ← collapsed panel exists on every video
     *   "comments_recycler_view"  ← pre-rendered in Shorts even when drawer is closed
     *   "comment_text"            ← pre-rendered in Shorts DOM
     *   "Comments" text alone     ← matches comment-count label on video page
     *   "sort_filter_button" in Shorts ← can exist pre-rendered in Shorts DOM
     *   "Top comments"     in Shorts   ← can be pre-rendered in Shorts DOM
     */
    private boolean isCommentsPanelOpen(List<AccessibilityNodeInfo> roots) {

        // ── PRIMARY: compose box is the most reliable cross-version signal ────
        // The "Add a comment…" hint is only present when the panel is open,
        // for both regular-video bottom sheets and Shorts drawers.
        if (anyRootHasText(roots, "Add a comment")) {
            Log.d(TAG, "Comments detected via 'Add a comment' compose box");
            return true;
        }

        // Determine whether we are inside the Shorts player (across all windows)
        boolean inShortsPlayer = anyRootHasViewId(roots, "reel_player_page")
                || anyRootHasViewId(roots, "reel_channel_bar")
                || anyRootHasViewId(roots, "shorts_video_container");

        // ── SECONDARY Path A: Regular video — comments bottom sheet ──────────
        if (!inShortsPlayer) {
            if (anyRootHasViewId(roots, "comments_header_view")) {
                Log.d(TAG, "Comments detected via comments_header_view (regular video)");
                return true;
            }
            if (anyRootHasViewId(roots, "sort_filter_button")) {
                Log.d(TAG, "Comments detected via sort_filter_button (regular video)");
                return true;
            }
            if (anyRootHasText(roots, "Top comments")) {
                Log.d(TAG, "Comments detected via Top comments label (regular video)");
                return true;
            }
            if (anyRootHasViewId(roots, "engagement_panel_container")
                    && anyRootHasViewId(roots, "comments_recycler_view")) {
                Log.d(TAG, "Comments detected via engagement_panel_container + recycler (regular video)");
                return true;
            }
        }

        // ── SECONDARY Path B: Shorts — comments drawer ───────────────────────
        if (inShortsPlayer) {
            // Entry-point button is only present when the drawer is CLOSED
            if (anyRootHasViewId(roots, "reel_comments_entry_point")) {
                Log.d(TAG, "Shorts comments drawer is CLOSED (entry point button visible)");
                return false;
            }
            if (anyRootHasViewId(roots, "comments_panel_header")) {
                Log.d(TAG, "Comments detected via comments_panel_header (Shorts drawer)");
                return true;
            }
            if (anyRootHasViewId(roots, "reply_composer_stub")) {
                Log.d(TAG, "Comments detected via reply_composer_stub (Shorts drawer)");
                return true;
            }
        }

        return false;
    }

    // ── Trigger ───────────────────────────────────────────────────────────────

    private void triggerBlock(final String app, final String section) {
        lastTriggerTime = System.currentTimeMillis();
        Log.d(TAG, "🚫 BLOCKED: " + app + " › " + section);

        new Handler(Looper.getMainLooper()).post(() -> {
            // 1. Show native overlay (works on MIUI - doesn't need RN Modal)
            showNativeOverlay(app, section);

            // 2. Also send JS event so AppNavigator state stays in sync
            SectionBlockerManager module = SectionBlockerManager.getInstance();
            if (module != null) {
                module.sendBlockedSectionEvent(app, section);
            }
        });
    }

    // ── Native overlay window ─────────────────────────────────────────────────

    /**
     * Draws a full-screen overlay directly using WindowManager.
     * This works on MIUI because it uses TYPE_APPLICATION_OVERLAY
     * (requires SYSTEM_ALERT_WINDOW) rather than a React Native Modal.
     */
    private void showNativeOverlay(String app, String section) {
        if (overlayShowing || windowManager == null) return;

        try {
            // Pick a random message
            String message = MESSAGES[(int)(Math.random() * MESSAGES.length)];
            String reasonText = app + "  ›  " + section;

            // ── Root layout (dark semi-transparent full screen) ──────────────
            LinearLayout root = new LinearLayout(this);
            root.setOrientation(LinearLayout.VERTICAL);
            root.setGravity(Gravity.CENTER);
            root.setBackgroundColor(Color.argb(220, 10, 10, 30));
            root.setPadding(48, 48, 48, 48);

            // ── Card ─────────────────────────────────────────────────────────
            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setGravity(Gravity.CENTER);
            card.setBackgroundColor(Color.argb(200, 28, 28, 60));
            card.setPadding(64, 72, 64, 56);

            // Rounded corners via background (API 21+)
            android.graphics.drawable.GradientDrawable cardBg =
                    new android.graphics.drawable.GradientDrawable();
            cardBg.setColor(Color.argb(210, 20, 20, 55));
            cardBg.setCornerRadius(56f);
            cardBg.setStroke(2, Color.argb(80, 160, 160, 255));
            card.setBackground(cardBg);

            // 🛡 Shield emoji label
            TextView shieldLabel = new TextView(this);
            shieldLabel.setText("🛡");
            shieldLabel.setTextSize(40f);
            shieldLabel.setGravity(Gravity.CENTER);
            card.addView(shieldLabel);

            addVerticalSpace(card, 16);

            // "Section Blocked" badge
            TextView badge = new TextView(this);
            badge.setText("SECTION BLOCKED");
            badge.setTextColor(Color.rgb(252, 165, 165));
            badge.setTextSize(11f);
            badge.setLetterSpacing(0.12f);
            badge.setTypeface(null, Typeface.BOLD);
            badge.setGravity(Gravity.CENTER);
            card.addView(badge);

            addVerticalSpace(card, 6);

            // Reason chip
            TextView reason = new TextView(this);
            reason.setText(reasonText);
            reason.setTextColor(Color.argb(180, 200, 200, 220));
            reason.setTextSize(12f);
            reason.setGravity(Gravity.CENTER);
            card.addView(reason);

            addVerticalSpace(card, 28);

            // Divider
            View divider = new View(this);
            LinearLayout.LayoutParams divParams =
                    new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 1);
            divParams.setMargins(32, 0, 32, 0);
            divider.setLayoutParams(divParams);
            divider.setBackgroundColor(Color.argb(50, 200, 200, 255));
            card.addView(divider);

            addVerticalSpace(card, 28);

            // Motivational message
            TextView msg = new TextView(this);
            msg.setText(message);
            msg.setTextColor(Color.WHITE);
            msg.setTextSize(16f);
            msg.setTypeface(null, Typeface.BOLD);
            msg.setGravity(Gravity.CENTER);
            msg.setLineSpacing(6f, 1f);
            card.addView(msg);

            addVerticalSpace(card, 32);

            // Close button
            Button closeBtn = new Button(this);
            closeBtn.setText("I understand, go back");
            closeBtn.setTextColor(Color.WHITE);
            closeBtn.setTextSize(14f);
            closeBtn.setTypeface(null, Typeface.BOLD);
            android.graphics.drawable.GradientDrawable btnBg =
                    new android.graphics.drawable.GradientDrawable();
            btnBg.setColor(Color.rgb(99, 102, 241)); // Indigo
            btnBg.setCornerRadius(32f);
            closeBtn.setBackground(btnBg);
            LinearLayout.LayoutParams btnParams =
                    new LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT);
            closeBtn.setLayoutParams(btnParams);
            closeBtn.setPadding(0, 36, 0, 36);
            closeBtn.setOnClickListener(v -> dismissOverlay());
            card.addView(closeBtn);

            addVerticalSpace(card, 16);

            // Hint text
            TextView hint = new TextView(this);
            hint.setText("This overlay will reappear each time that section opens.");
            hint.setTextColor(Color.argb(100, 200, 200, 220));
            hint.setTextSize(11f);
            hint.setGravity(Gravity.CENTER);
            card.addView(hint);

            root.addView(card);

            // ── WindowManager params ─────────────────────────────────────────
            int overlayType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                    : WindowManager.LayoutParams.TYPE_PHONE;

            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    overlayType,
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                            | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
                    PixelFormat.TRANSLUCENT
            );
            params.gravity = Gravity.TOP | Gravity.START;

            windowManager.addView(root, params);
            overlayView = root;
            overlayShowing = true;

            Log.d(TAG, "✅ Native overlay shown for: " + app + " › " + section);

        } catch (Exception e) {
            Log.e(TAG, "❌ showNativeOverlay failed: " + e.getMessage());
        }
    }

    private void dismissOverlay() {
        if (!overlayShowing || overlayView == null || windowManager == null) return;
        try {
            windowManager.removeView(overlayView);
            overlayView = null;
            overlayShowing = false;
            Log.d(TAG, "✅ Overlay dismissed");
        } catch (Exception e) {
            Log.e(TAG, "dismissOverlay error: " + e.getMessage());
        }
    }

    private void addVerticalSpace(LinearLayout parent, int dp) {
        View space = new View(this);
        float density = getResources().getDisplayMetrics().density;
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, (int)(dp * density));
        space.setLayoutParams(p);
        parent.addView(space);
    }

    // ── Window helpers ────────────────────────────────────────────────────────

    /**
     * Returns the root AccessibilityNodeInfo for every window currently on screen.
     * This is essential because YouTube opens its comments panel as a separate
     * bottom-sheet window; getRootInActiveWindow() only returns the video window
     * behind it and misses all comment-panel nodes entirely.
     */
    private List<AccessibilityNodeInfo> getAllWindowRoots() {
        List<AccessibilityNodeInfo> roots = new ArrayList<>();
        try {
            for (AccessibilityWindowInfo w : getWindows()) {
                AccessibilityNodeInfo r = w.getRoot();
                if (r != null) roots.add(r);
            }
        } catch (Exception ignored) {}
        // Fallback: use active window if getWindows() returned nothing
        if (roots.isEmpty()) {
            AccessibilityNodeInfo r = getRootInActiveWindow();
            if (r != null) roots.add(r);
        }
        return roots;
    }

    private boolean anyRootHasViewId(List<AccessibilityNodeInfo> roots, String keyword) {
        for (AccessibilityNodeInfo root : roots) {
            if (hasNodeWithViewId(root, keyword)) return true;
        }
        return false;
    }

    private boolean anyRootHasText(List<AccessibilityNodeInfo> roots, String keyword) {
        for (AccessibilityNodeInfo root : roots) {
            if (hasNodeWithText(root, keyword)) return true;
        }
        return false;
    }

    // ── Node helpers ──────────────────────────────────────────────────────────

    private boolean hasNodeWithViewId(AccessibilityNodeInfo root, String keyword) {
        if (root == null) return false;
        try {
            String id = root.getViewIdResourceName();
            if (id != null && id.toLowerCase().contains(keyword.toLowerCase())) return true;
            for (int i = 0; i < root.getChildCount(); i++)
                if (hasNodeWithViewId(root.getChild(i), keyword)) return true;
        } catch (Exception ignored) {}
        return false;
    }

    private boolean hasNodeWithText(AccessibilityNodeInfo root, String keyword) {
        if (root == null) return false;
        try {
            CharSequence text = root.getText();
            CharSequence desc = root.getContentDescription();
            String kw = keyword.toLowerCase();
            if ((text != null && text.toString().toLowerCase().contains(kw))
                    || (desc != null && desc.toString().toLowerCase().contains(kw)))
                return true;
            for (int i = 0; i < root.getChildCount(); i++)
                if (hasNodeWithText(root.getChild(i), keyword)) return true;
        } catch (Exception ignored) {}
        return false;
    }

    // ── Settings ──────────────────────────────────────────────────────────────

    private JSONObject loadSettings() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            String json = prefs.getString(PREFS_SETTINGS, null);
            if (json == null || json.equals("{}")) return null;
            return new JSONObject(json);
        } catch (Exception e) {
            Log.e(TAG, "loadSettings: " + e.getMessage());
            return null;
        }
    }

    public void applySettings(String settingsJson) {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            prefs.edit().putString(PREFS_SETTINGS, settingsJson).apply();
            Log.d(TAG, "✅ Settings applied: " + settingsJson);
        } catch (Exception e) {
            Log.e(TAG, "applySettings: " + e.getMessage());
        }
    }
}
