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

    private static final String TAG = "BlockerService";
    private static final String PREFS_NAME = "MindScopeBlocker";
    private static final String PREFS_SETTINGS = "settings_json";
    private static final String PKG_INSTAGRAM = "com.instagram.android";
    private static final String PKG_YOUTUBE = "com.google.android.youtube";
    private static final String PKG_WHATSAPP = "com.whatsapp";
    private static final long COOLDOWN_MS = 3000;

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
        if (event == null)
            return;

        String pkg = event.getPackageName() != null
                ? event.getPackageName().toString()
                : "";

        boolean isInstagram = pkg.equals(PKG_INSTAGRAM);
        boolean isYoutube = pkg.equals(PKG_YOUTUBE);
        boolean isWhatsapp = pkg.equals(PKG_WHATSAPP);
        if (!isInstagram && !isYoutube && !isWhatsapp)
            return;

        int type = event.getEventType();
        if (type != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                && type != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
                && type != AccessibilityEvent.TYPE_WINDOWS_CHANGED)
            return;

        long now = System.currentTimeMillis();
        if (now - lastTriggerTime < COOLDOWN_MS)
            return;

        JSONObject settings = loadSettings();
        if (settings == null)
            return;

        String className = event.getClassName() != null
                ? event.getClassName().toString().toLowerCase()
                : "";

        Log.d(TAG, "📱 Event pkg=" + pkg + " class=" + className);

        if (isInstagram)
            checkInstagram(settings, className);
        else if (isYoutube)
            checkYoutube(settings, className);
        else if (isWhatsapp)
            checkWhatsapp(settings, className);
    }

    // ── Instagram ─────────────────────────────────────────────────────────────

    // ── Instagram ─────────────────────────────────────────────────────────────

    private void checkInstagram(JSONObject settings, String className) {
        try {
            JSONObject ig = settings.optJSONObject("instagram");
            if (ig == null || !ig.optBoolean("masterEnabled", false))
                return;
            AccessibilityNodeInfo root = getRootInActiveWindow();

            // 1. Stories
            if (ig.optBoolean("blockStories", false) && isInstagramStoryOpen(root, className)) {
                triggerBlock("Instagram", "Stories");
                return;
            }

            // 2. Reels
            if (ig.optBoolean("blockReels", false) && isInstagramReelsOpen(root, className)) {
                triggerBlock("Instagram", "Reels");
                return;
            }

            // 3. Explore
            if (ig.optBoolean("blockExplore", false) && isInstagramExploreOpen(root, className)) {
                triggerBlock("Instagram", "Explore");
            }
        } catch (Exception e) {
            Log.e(TAG, "Instagram check: " + e.getMessage());
        }
    }

    // ── Instagram Detection Helpers ───────────────────────────────────────────

    private boolean isInstagramStoryOpen(AccessibilityNodeInfo root, String className) {
        // IG internally calls the Story Viewer "ReelViewer" or "StoryViewer"
        if (className.contains("reelviewer") || className.contains("storyviewer")) {
            return true;
        }

        // These IDs only exist when actually INSIDE a playing story, not on the home
        // feed
        if (hasNodeWithViewId(root, "reel_viewer_root"))
            return true;
        if (hasNodeWithViewId(root, "reel_viewer_progress_bar"))
            return true;
        if (hasNodeWithViewId(root, "viewer_message_edit_text"))
            return true; // The "Send message" box in stories

        return false;
    }

    private boolean isInstagramReelsOpen(AccessibilityNodeInfo root, String className) {
        // We removed the className check here because Instagram fires background events 
        // with the "clipsviewer" class name even when you are on the Home feed.
        
        // These IDs will now ONLY trigger if they are actively visible on the screen
        if (hasNodeWithViewId(root, "clips_viewer_view_pager")) return true;
        if (hasNodeWithViewId(root, "clips_video_container")) return true;
        if (hasNodeWithViewId(root, "vertical_view_pager")) return true;
        
        return false;
    }

    private boolean isInstagramExploreOpen(AccessibilityNodeInfo root, String className) {
        if (className.contains("explore"))
            return true;

        // Only block if they are actively in the search bar or explore grid
        if (hasNodeWithViewId(root, "action_bar_search_edit_text"))
            return true;
        if (hasNodeWithViewId(root, "explore_all_tab"))
            return true;

        return false;
    }
    // ── YouTube ───────────────────────────────────────────────────────────────

    private void checkYoutube(JSONObject settings, String className) {
        try {
            JSONObject yt = settings.optJSONObject("youtube");
            if (yt == null || !yt.optBoolean("masterEnabled", false))
                return;
            AccessibilityNodeInfo root = getRootInActiveWindow();

            if (yt.optBoolean("blockShorts", false)
                    && isShortsPlayerOpen(root, className)) {
                triggerBlock("YouTube", "Shorts");
                return;
            }
            if (yt.optBoolean("blockVideoSearch", false)
                    && (className.contains("search")
                            || hasNodeWithViewId(root, "search_edit_text"))) {
                triggerBlock("YouTube", "Video Search");
                return;
            }
            if (yt.optBoolean("blockPiP", false)
                    && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                try {
                    for (AccessibilityWindowInfo w : getWindows()) {
                        if (w.isInPictureInPictureMode()) {
                            triggerBlock("YouTube", "Picture-in-Picture");
                            return;
                        }
                    }
                } catch (Exception ignored) {
                }
            }
            if (yt.optBoolean("blockComments", false)
                    && isCommentsPanelOpen(root)) {
                triggerBlock("YouTube", "Comments");
            }
        } catch (Exception e) {
            Log.e(TAG, "YouTube check: " + e.getMessage());
        }
    }

    // ── WhatsApp detection ───────────────────────────────────────────────────

    private void checkWhatsapp(JSONObject settings, String className) {
        try {
            JSONObject wa = settings.optJSONObject("whatsapp");
            if (wa == null || !wa.optBoolean("masterEnabled", false)) {
                Log.d(TAG, "WhatsApp master disabled");
                return;
            }
            AccessibilityNodeInfo root = getRootInActiveWindow();

            if (wa.optBoolean("blockStatus", false) && isStatusViewerOpen(root, className)) {
                Log.d(TAG, "WhatsApp: blocking Status viewer");
                triggerBlock("WhatsApp", "Status");
                return;
            }

            if (wa.optBoolean("blockChannels", false) && isChannelViewerOpen(root, className)) {
                Log.d(TAG, "WhatsApp: blocking Channel viewer");
                triggerBlock("WhatsApp", "Channel");
            }

        } catch (Exception e) {
            Log.e(TAG, "WhatsApp check: " + e.getMessage());
        }
    }

    // ── WhatsApp Status viewer detection ─────────────────────────────────────

    private boolean isStatusViewerOpen(AccessibilityNodeInfo root, String className) {
        if (className.contains("statusplayback")
                || className.contains("status_playback")
                || className.contains("statusplayer")
                || className.contains("statusview")) {
            return true;
        }
        if (hasNodeWithViewId(root, "status_progress"))
            return true;
        if (hasNodeWithViewId(root, "status_send_message_container"))
            return true;
        if (hasNodeWithViewId(root, "status_view_emoji_button"))
            return true;
        return false;
    }

    // ── WhatsApp Channel viewer detection ─────────────────────────────────────

    private boolean isChannelViewerOpen(AccessibilityNodeInfo root, String className) {
        // WhatsApp uses "com.whatsapp.conversation" for BOTH regular chats and
        // Channels.
        // We rely on specific View IDs and Text found in live logs.

        // 1. Channel messages use specific "newsletter" forwarding buttons
        if (hasNodeWithViewId(root, "newsletter_quick_forwarding"))
            return true;
        if (hasNodeWithViewId(root, "newsletter_feed_recycler"))
            return true;

        // 2. The subtitle under the Channel name explicitly says "followers" (Regular
        // chats say online/last seen)
        if (hasNodeWithText(root, "followers") && hasNodeWithViewId(root, "conversation_contact_status")) {
            return true;
        }

        // 3. Fallbacks
        if (hasNodeWithViewId(root, "channel_info_banner"))
            return true;
        if (hasNodeWithViewId(root, "channel_follow_button"))
            return true;

        return false;
    }

    // ── Shorts player detection ───────────────────────────────────────────────

    private boolean isShortsPlayerOpen(AccessibilityNodeInfo root, String className) {
        if (className.contains("shortsactivity")
                || className.contains("reelwatchfragment")
                || className.contains("shortsvideo")
                || className.contains("shorts_player")) {
            return true;
        }
        if (hasNodeWithViewId(root, "reel_player_page"))
            return true;
        if (hasNodeWithViewId(root, "reel_channel_bar"))
            return true;
        if (hasNodeWithViewId(root, "shorts_video_container"))
            return true;
        if (hasNodeWithViewId(root, "like_button") && hasNodeWithViewId(root, "dislike_button"))
            return true;
        return false;
    }

    // ── Comments panel detection ─────────────────────────────────────────────

    private boolean isCommentsPanelOpen(AccessibilityNodeInfo root) {
        if (hasNodeWithViewId(root, "comments_header_view")) {
            if (!hasNodeWithViewId(root, "reel_player_page") && !hasNodeWithViewId(root, "reel_channel_bar")) {
                return true;
            }
        }
        if (hasNodeWithViewId(root, "sort_filter_button") && !hasNodeWithViewId(root, "reel_player_page"))
            return true;
        if (hasNodeWithText(root, "Top comments") && !hasNodeWithViewId(root, "reel_player_page"))
            return true;

        if (hasNodeWithViewId(root, "reel_player_page") || hasNodeWithViewId(root, "reel_channel_bar")) {
            if (hasNodeWithViewId(root, "comments_panel_header"))
                return true;
            if (hasNodeWithViewId(root, "reply_composer_stub"))
                return true;
            if (hasNodeWithViewId(root, "sort_filter_button"))
                return true;
            if (hasNodeWithText(root, "Top comments"))
                return true;
        }
        return false;
    }

    // ── Trigger ───────────────────────────────────────────────────────────────

    private void triggerBlock(final String app, final String section) {
        lastTriggerTime = System.currentTimeMillis();
        Log.d(TAG, "🚫 BLOCKED: " + app + " › " + section);

        new Handler(Looper.getMainLooper()).post(() -> {
            showNativeOverlay(app, section);
            // Integration with SectionBlockerManager would be triggered here
        });
    }

    // ── Native overlay window ─────────────────────────────────────────────────

    private void showNativeOverlay(String app, String section) {
        if (overlayShowing || windowManager == null)
            return;

        try {
            String message = MESSAGES[(int) (Math.random() * MESSAGES.length)];
            String reasonText = app + "  ›  " + section;

            LinearLayout root = new LinearLayout(this);
            root.setOrientation(LinearLayout.VERTICAL);
            root.setGravity(Gravity.CENTER);
            root.setBackgroundColor(Color.argb(220, 10, 10, 30));
            root.setPadding(48, 48, 48, 48);

            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setGravity(Gravity.CENTER);
            android.graphics.drawable.GradientDrawable cardBg = new android.graphics.drawable.GradientDrawable();
            cardBg.setColor(Color.argb(210, 20, 20, 55));
            cardBg.setCornerRadius(56f);
            cardBg.setStroke(2, Color.argb(80, 160, 160, 255));
            card.setBackground(cardBg);
            card.setPadding(64, 72, 64, 56);

            TextView shieldLabel = new TextView(this);
            shieldLabel.setText("🛡");
            shieldLabel.setTextSize(40f);
            shieldLabel.setGravity(Gravity.CENTER);
            card.addView(shieldLabel);

            addVerticalSpace(card, 16);

            TextView badge = new TextView(this);
            badge.setText("SECTION BLOCKED");
            badge.setTextColor(Color.rgb(252, 165, 165));
            badge.setTextSize(11f);
            badge.setTypeface(null, Typeface.BOLD);
            badge.setGravity(Gravity.CENTER);
            card.addView(badge);

            addVerticalSpace(card, 6);

            TextView reason = new TextView(this);
            reason.setText(reasonText);
            reason.setTextColor(Color.argb(180, 200, 200, 220));
            reason.setTextSize(12f);
            reason.setGravity(Gravity.CENTER);
            card.addView(reason);

            addVerticalSpace(card, 28);

            TextView msg = new TextView(this);
            msg.setText(message);
            msg.setTextColor(Color.WHITE);
            msg.setTextSize(16f);
            msg.setTypeface(null, Typeface.BOLD);
            msg.setGravity(Gravity.CENTER);
            card.addView(msg);

            addVerticalSpace(card, 32);

            Button closeBtn = new Button(this);
            closeBtn.setText("I understand, go back");
            closeBtn.setTextColor(Color.WHITE);
            android.graphics.drawable.GradientDrawable btnBg = new android.graphics.drawable.GradientDrawable();
            btnBg.setColor(Color.rgb(99, 102, 241));
            btnBg.setCornerRadius(32f);
            closeBtn.setBackground(btnBg);
            closeBtn.setOnClickListener(v -> {
                dismissOverlay();
                // Press the Home button so the user exits the blocked app automatically
                performGlobalAction(GLOBAL_ACTION_HOME);
            });
            card.addView(closeBtn);

            root.addView(card);

            int overlayType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                    : WindowManager.LayoutParams.TYPE_PHONE;

            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    overlayType,
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                            | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
                    PixelFormat.TRANSLUCENT);

            windowManager.addView(root, params);
            overlayView = root;
            overlayShowing = true;

        } catch (Exception e) {
            Log.e(TAG, "showNativeOverlay failed: " + e.getMessage());
        }
    }

    private void dismissOverlay() {
        if (!overlayShowing || overlayView == null || windowManager == null)
            return;
        try {
            windowManager.removeView(overlayView);
            overlayView = null;
            overlayShowing = false;
        } catch (Exception e) {
            Log.e(TAG, "dismissOverlay error: " + e.getMessage());
        }
    }

    private void addVerticalSpace(LinearLayout parent, int dp) {
        View space = new View(this);
        float density = getResources().getDisplayMetrics().density;
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, (int) (dp * density));
        space.setLayoutParams(p);
        parent.addView(space);
    }

    // ── Helper methods ────────────────────────────────────────────────────────

    private boolean hasNodeWithViewId(AccessibilityNodeInfo root, String keyword) {
        if (root == null)
            return false;
        try {
            String id = root.getViewIdResourceName();

            // ✅ CRITICAL FIX: Ensure the node is actually visible on the screen
            if (root.isVisibleToUser() && id != null && id.toLowerCase().contains(keyword.toLowerCase())) {
                return true;
            }

            for (int i = 0; i < root.getChildCount(); i++) {
                AccessibilityNodeInfo child = root.getChild(i);
                boolean found = hasNodeWithViewId(child, keyword);
                if (child != null)
                    child.recycle();
                if (found)
                    return true;
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    private boolean hasNodeWithText(AccessibilityNodeInfo root, String keyword) {
        if (root == null)
            return false;
        try {
            CharSequence text = root.getText();
            CharSequence desc = root.getContentDescription();
            String kw = keyword.toLowerCase();

            // ✅ CRITICAL FIX: Ensure the node is actually visible on the screen
            if (root.isVisibleToUser()) {
                if ((text != null && text.toString().toLowerCase().contains(kw))
                        || (desc != null && desc.toString().toLowerCase().contains(kw))) {
                    return true;
                }
            }

            for (int i = 0; i < root.getChildCount(); i++) {
                AccessibilityNodeInfo child = root.getChild(i);
                boolean found = hasNodeWithText(child, keyword);
                if (child != null)
                    child.recycle();
                if (found)
                    return true;
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    // ── Settings ──────────────────────────────────────────────────────────────

    private JSONObject loadSettings() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            String json = prefs.getString(PREFS_SETTINGS, null);
            if (json == null || json.equals("{}"))
                return null;
            return new JSONObject(json);
        } catch (Exception e) {
            return null;
        }
    }

    public void applySettings(String settingsJson) {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            prefs.edit().putString(PREFS_SETTINGS, settingsJson).apply();
        } catch (Exception e) {
            Log.e(TAG, "applySettings error: " + e.getMessage());
        }
    }

}

    

    