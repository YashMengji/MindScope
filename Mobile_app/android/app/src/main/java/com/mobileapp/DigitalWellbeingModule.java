package com.mobileapp;

import android.app.AppOpsManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Process;
import android.provider.Settings;
import com.facebook.react.bridge.*;
import com.facebook.react.module.annotations.ReactModule;

import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.TimeUnit;

@ReactModule(name = DigitalWellbeingModule.NAME)
public class DigitalWellbeingModule extends ReactContextBaseJavaModule {
    public static final String NAME = "DigitalWellbeingModule";
    private final ReactApplicationContext reactContext;

    public DigitalWellbeingModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return NAME;
    }

    @ReactMethod
    public void getAppUsageStats(String period, Promise promise) {
        try {
            UsageStatsManager usageStatsManager = (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
            PackageManager packageManager = reactContext.getPackageManager();
            
            long endTime = System.currentTimeMillis();
            long startTime;
            
            // Calculate start time based on period
            Calendar calendar = Calendar.getInstance();
            calendar.setTimeInMillis(endTime);
            
            if (period.equals("daily")) {
                // Set to start of today (midnight)
                calendar.set(Calendar.HOUR_OF_DAY, 0);
                calendar.set(Calendar.MINUTE, 0);
                calendar.set(Calendar.SECOND, 0);
                calendar.set(Calendar.MILLISECOND, 0);
                startTime = calendar.getTimeInMillis();
                
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
                android.util.Log.d("DigitalWellbeing", "Today's start: " + sdf.format(new Date(startTime)));
                android.util.Log.d("DigitalWellbeing", "Current time: " + sdf.format(new Date(endTime)));
            } else {
                // Weekly: get last 7 days from today's start
                calendar.set(Calendar.HOUR_OF_DAY, 0);
                calendar.set(Calendar.MINUTE, 0);
                calendar.set(Calendar.SECOND, 0);
                calendar.set(Calendar.MILLISECOND, 0);
                startTime = calendar.getTimeInMillis() - (7 * 24 * 60 * 60 * 1000);
            }
            
            // Query usage stats for app usage time
            List<UsageStats> usageStatsList = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY, startTime, endTime);
            
            // Query events for session tracking
            UsageEvents usageEvents = usageStatsManager.queryEvents(startTime, endTime);
            
            Map<String, Long> appUsageMap = new HashMap<>();
            Map<String, String> appNameMap = new HashMap<>();
            Map<String, Integer> appSessionCountMap = new HashMap<>();
            
            // Process usage stats for total time
            for (UsageStats stats : usageStatsList) {
                String packageName = stats.getPackageName();
                long totalTimeInForeground = stats.getTotalTimeInForeground();
                
                if (totalTimeInForeground > 0) {
                    try {
                        ApplicationInfo appInfo = packageManager.getApplicationInfo(packageName, 0);
                        String appName = packageManager.getApplicationLabel(appInfo).toString();
                        appNameMap.put(packageName, appName);
                    } catch (PackageManager.NameNotFoundException e) {
                        appNameMap.put(packageName, packageName);
                    }
                    
                    if (appUsageMap.containsKey(packageName)) {
                        appUsageMap.put(packageName, appUsageMap.get(packageName) + totalTimeInForeground);
                    } else {
                        appUsageMap.put(packageName, totalTimeInForeground);
                    }
                }
            }
            
            // Process events for session count
            Map<String, Integer> sessionCountMap = new HashMap<>();
            Map<String, Long> lastEventTimeMap = new HashMap<>();
            
            if (usageEvents != null) {
                UsageEvents.Event event = new UsageEvents.Event();
                while (usageEvents.getNextEvent(event)) {
                    if (event.getEventType() == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                        String packageName = event.getPackageName();
                        // Count each move to foreground as a session start
                        sessionCountMap.put(packageName, sessionCountMap.getOrDefault(packageName, 0) + 1);
                        lastEventTimeMap.put(packageName, event.getTimeStamp());
                    }
                }
            }
            
            // Convert to list and sort
            List<Map.Entry<String, Long>> sortedList = new ArrayList<>(appUsageMap.entrySet());
            sortedList.sort((a, b) -> b.getValue().compareTo(a.getValue()));
            
            WritableArray appUsageArray = Arguments.createArray();
            long totalUsageMinutes = 0;
            int totalSessions = 0;
            
            for (Map.Entry<String, Long> entry : sortedList) {
                String packageName = entry.getKey();
                long usageMillis = entry.getValue();
                long usageMinutes = TimeUnit.MILLISECONDS.toMinutes(usageMillis);
                int sessionCount = sessionCountMap.getOrDefault(packageName, 0);
                
                // Only include apps with at least 1 minute of usage
                if (usageMinutes >= 1) {
                    totalUsageMinutes += usageMinutes;
                    totalSessions += sessionCount;
                    
                    WritableMap appData = Arguments.createMap();
                    appData.putString("name", appNameMap.get(packageName));
                    appData.putString("packageName", packageName);
                    appData.putInt("usage", (int) usageMinutes);
                    appData.putInt("sessions", sessionCount);
                    appData.putLong("usageMillis", usageMillis);
                    appUsageArray.pushMap(appData);
                    
                    android.util.Log.d("DigitalWellbeing", 
                        "App: " + appNameMap.get(packageName) + 
                        " | Usage: " + usageMinutes + " minutes" +
                        " | Sessions: " + sessionCount);
                }
            }
            
            // Calculate average session duration across all apps
            int averageSessionDuration = 0;
            if (totalSessions > 0) {
                averageSessionDuration = (int) (totalUsageMinutes / totalSessions);
            }
            
            android.util.Log.d("DigitalWellbeing", "Total usage: " + totalUsageMinutes + " minutes");
            android.util.Log.d("DigitalWellbeing", "Total sessions: " + totalSessions);
            android.util.Log.d("DigitalWellbeing", "Average session duration: " + averageSessionDuration + " minutes");
            
            WritableMap result = Arguments.createMap();
            result.putArray("apps", appUsageArray);
            result.putInt("totalSessions", totalSessions);
            result.putInt("avgSessionDuration", averageSessionDuration);
            
            promise.resolve(result);
            
        } catch (Exception e) {
            android.util.Log.e("DigitalWellbeing", "Error fetching usage stats", e);
            promise.reject("USAGE_STATS_ERROR", e.getMessage());
        }
    }

    // Returns true if the user has granted the special "Usage Access" permission.
    @ReactMethod
    public void hasUsageAccessPermission(Promise promise) {
        try {
            AppOpsManager appOps = (AppOpsManager) reactContext.getSystemService(Context.APP_OPS_SERVICE);
            int mode;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                mode = appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(), reactContext.getPackageName());
            } else {
                mode = appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(), reactContext.getPackageName());
            }
            boolean granted;
            if (mode == AppOpsManager.MODE_DEFAULT) {
                // On some devices MODE_DEFAULT means "fall back to a runtime permission check"
                granted = reactContext.checkCallingOrSelfPermission(
                    android.Manifest.permission.PACKAGE_USAGE_STATS)
                    == PackageManager.PERMISSION_GRANTED;
            } else {
                granted = mode == AppOpsManager.MODE_ALLOWED;
            }
            promise.resolve(granted);
        } catch (Exception e) {
            promise.reject("PERMISSION_CHECK_ERROR", e.getMessage());
        }
    }

    // Opens the system "Usage Access" settings screen so the user can grant access.
    @ReactMethod
    public void openUsageAccessSettings() {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        reactContext.startActivity(intent);
    }

    // Returns total foreground minutes per day for the last `days` days (oldest -> newest).
    // Reused by the 7-day trend chart and the daily-goal streak calculation.
    @ReactMethod
    public void getDailyUsageTrend(int days, Promise promise) {
        try {
            UsageStatsManager usageStatsManager =
                (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
            String selfPackage = reactContext.getPackageName();
            String[] weekdayLabels = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};
            SimpleDateFormat dateFmt = new SimpleDateFormat("yyyy-MM-dd", Locale.US);

            WritableArray trend = Arguments.createArray();

            for (int i = days - 1; i >= 0; i--) {
                Calendar dayStart = Calendar.getInstance();
                dayStart.add(Calendar.DAY_OF_YEAR, -i);
                dayStart.set(Calendar.HOUR_OF_DAY, 0);
                dayStart.set(Calendar.MINUTE, 0);
                dayStart.set(Calendar.SECOND, 0);
                dayStart.set(Calendar.MILLISECOND, 0);
                long startTime = dayStart.getTimeInMillis();

                Calendar dayEnd = (Calendar) dayStart.clone();
                dayEnd.add(Calendar.DAY_OF_YEAR, 1);
                long endTime = Math.min(dayEnd.getTimeInMillis(), System.currentTimeMillis());

                List<UsageStats> statsList = usageStatsManager.queryUsageStats(
                    UsageStatsManager.INTERVAL_DAILY, startTime, endTime);

                long totalMillis = 0;
                if (statsList != null) {
                    for (UsageStats stats : statsList) {
                        if (stats.getPackageName().equals(selfPackage)) continue;
                        totalMillis += stats.getTotalTimeInForeground();
                    }
                }

                WritableMap dayData = Arguments.createMap();
                dayData.putString("date", dateFmt.format(new Date(startTime)));
                dayData.putString("label", weekdayLabels[dayStart.get(Calendar.DAY_OF_WEEK) - 1]);
                dayData.putInt("totalMinutes", (int) TimeUnit.MILLISECONDS.toMinutes(totalMillis));
                trend.pushMap(dayData);
            }

            promise.resolve(trend);
        } catch (Exception e) {
            android.util.Log.e("DigitalWellbeing", "Error fetching daily trend", e);
            promise.reject("DAILY_TREND_ERROR", e.getMessage());
        }
    }

    // Approximate per-hour foreground minutes for today, reconstructed from usage events.
    // UsageStatsManager exposes no native per-hour totals, so we pair MOVE_TO_FOREGROUND with
    // the next MOVE_TO_BACKGROUND and split the interval across the hour buckets it spans.
    @ReactMethod
    public void getHourlyUsageToday(Promise promise) {
        try {
            UsageStatsManager usageStatsManager =
                (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
            String selfPackage = reactContext.getPackageName();

            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, 0);
            calendar.set(Calendar.MINUTE, 0);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            long dayStart = calendar.getTimeInMillis();
            long now = System.currentTimeMillis();

            long[] bucketMillis = new long[24];

            UsageEvents events = usageStatsManager.queryEvents(dayStart, now);
            // Track the active foreground start per package so background events can be paired.
            Map<String, Long> foregroundStart = new HashMap<>();

            if (events != null) {
                UsageEvents.Event event = new UsageEvents.Event();
                while (events.getNextEvent(event)) {
                    String pkg = event.getPackageName();
                    if (pkg == null || pkg.equals(selfPackage)) continue;

                    int type = event.getEventType();
                    if (type == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                        foregroundStart.put(pkg, event.getTimeStamp());
                    } else if (type == UsageEvents.Event.MOVE_TO_BACKGROUND) {
                        Long start = foregroundStart.remove(pkg);
                        if (start != null) {
                            distributeIntoBuckets(bucketMillis, dayStart, start, event.getTimeStamp());
                        }
                    }
                }
            }

            // Any app still in the foreground at query time runs until `now`.
            for (Long start : foregroundStart.values()) {
                if (start != null) {
                    distributeIntoBuckets(bucketMillis, dayStart, start, now);
                }
            }

            WritableArray hourly = Arguments.createArray();
            for (int hour = 0; hour < 24; hour++) {
                WritableMap hourData = Arguments.createMap();
                hourData.putInt("hour", hour);
                hourData.putInt("minutes", (int) TimeUnit.MILLISECONDS.toMinutes(bucketMillis[hour]));
                hourly.pushMap(hourData);
            }

            promise.resolve(hourly);
        } catch (Exception e) {
            android.util.Log.e("DigitalWellbeing", "Error fetching hourly usage", e);
            promise.reject("HOURLY_USAGE_ERROR", e.getMessage());
        }
    }

    // Splits a [start, end] foreground interval across the hourly buckets it spans.
    private void distributeIntoBuckets(long[] bucketMillis, long dayStart, long start, long end) {
        if (end <= start) return;
        long oneHour = 60L * 60L * 1000L;
        long cursor = start;
        while (cursor < end) {
            int hour = (int) ((cursor - dayStart) / oneHour);
            if (hour < 0) hour = 0;
            if (hour > 23) break;
            long bucketEnd = dayStart + (hour + 1) * oneHour;
            long segmentEnd = Math.min(end, bucketEnd);
            bucketMillis[hour] += (segmentEnd - cursor);
            cursor = segmentEnd;
        }
    }
}