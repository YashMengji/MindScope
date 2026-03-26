package com.mobileapp;

import android.app.usage.UsageEvents;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
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
}