package com.mobileapp;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.List;

/**
 * Durable, on-device outbox for captured chat sessions.
 *
 * Sessions are persisted as a JSON array in SharedPreferences so they survive
 * a dead React Native bridge, the app being force-stopped, or the accessibility
 * service being killed. Delivery is at-least-once: the JS layer drains this
 * store and only removes a session after the backend confirms success. The
 * server enforces a unique sessionId, so retried duplicates are safe.
 */
public final class OutboxStore {

    private static final String TAG = "ChatAccessibilityService";
    private static final String PREFS_NAME = "ChatOutbox";
    private static final String KEY_SESSIONS = "sessions";
    // Safety cap so a permanently-failing backend can't grow the store unbounded.
    private static final int MAX_SESSIONS = 200;

    private OutboxStore() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static synchronized JSONArray readArray(Context context) {
        String raw = prefs(context).getString(KEY_SESSIONS, "[]");
        try {
            return new JSONArray(raw);
        } catch (JSONException e) {
            Log.e(TAG, "Outbox corrupted, resetting: " + e.getMessage());
            return new JSONArray();
        }
    }

    private static synchronized void writeArray(Context context, JSONArray array) {
        prefs(context).edit().putString(KEY_SESSIONS, array.toString()).apply();
    }

    /**
     * Persist one captured session.
     *
     * @param sessionId      unique id ("startTimestamp-endTimestamp")
     * @param startTimestamp session start (ms)
     * @param endTimestamp   session end (ms)
     * @param messages       sent message texts
     */
    public static synchronized void add(Context context, String sessionId,
                                        long startTimestamp, long endTimestamp,
                                        List<String> messages) {
        if (context == null || sessionId == null || messages == null || messages.isEmpty()) {
            return;
        }
        try {
            JSONArray sessions = readArray(context);

            // Skip if this sessionId is already queued (idempotent persist).
            for (int i = 0; i < sessions.length(); i++) {
                JSONObject existing = sessions.optJSONObject(i);
                if (existing != null && sessionId.equals(existing.optString("sessionId"))) {
                    Log.d(TAG, "Outbox already contains session " + sessionId);
                    return;
                }
            }

            JSONArray msgArray = new JSONArray();
            for (String m : messages) {
                if (m != null) msgArray.put(m);
            }

            JSONObject session = new JSONObject();
            session.put("sessionId", sessionId);
            session.put("startTimestamp", startTimestamp);
            session.put("endTimestamp", endTimestamp);
            session.put("messages", msgArray);

            sessions.put(session);

            // Drop oldest entries if we exceed the safety cap.
            while (sessions.length() > MAX_SESSIONS) {
                sessions.remove(0);
            }

            writeArray(context, sessions);
            Log.d(TAG, "Outbox stored session " + sessionId + " (" + msgArray.length()
                    + " msgs), pending=" + sessions.length());
        } catch (JSONException e) {
            Log.e(TAG, "Failed to store session in outbox: " + e.getMessage(), e);
        }
    }

    /** Returns all pending sessions as a JSON array string (never null). */
    public static synchronized String getAllAsJson(Context context) {
        if (context == null) return "[]";
        return readArray(context).toString();
    }

    /** Removes a session by id once it has been delivered successfully. */
    public static synchronized void remove(Context context, String sessionId) {
        if (context == null || sessionId == null) return;
        JSONArray sessions = readArray(context);
        JSONArray kept = new JSONArray();
        for (int i = 0; i < sessions.length(); i++) {
            JSONObject session = sessions.optJSONObject(i);
            if (session != null && !sessionId.equals(session.optString("sessionId"))) {
                kept.put(session);
            }
        }
        writeArray(context, kept);
        Log.d(TAG, "Outbox removed session " + sessionId + ", pending=" + kept.length());
    }
}
