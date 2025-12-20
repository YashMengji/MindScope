package com.mobileapp;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import android.content.Intent;
import android.net.Uri;
import android.os.Environment;
import android.util.Log;
import java.io.File;
import java.util.HashMap;
import java.util.Map;
import androidx.annotation.NonNull;

public class CallRecordingModule extends ReactContextBaseJavaModule {
    private static final String TAG = "CallRecordingModule";
    private static ReactApplicationContext reactContext;
    private static CallRecordingModule instance;
    
    public CallRecordingModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
        instance = this;
    }
    
    @NonNull
    @Override
    public String getName() {
        return "CallRecordingManager";
    }
    
    // Constants exposed to JS
    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("CALL_RECORDING_PATHS", getDefaultRecordingPaths());
        return constants;
    }
    
    private String[] getDefaultRecordingPaths() {
        return new String[]{
            Environment.getExternalStorageDirectory().getPath() + "/CallRecordings/",
            Environment.getExternalStorageDirectory().getPath() + "/Recordings/",
            Environment.getExternalStorageDirectory().getPath() + "/Voice Recorder/",
            Environment.getExternalStorageDirectory().getPath() + "/Audio/Recordings/",
        };
    }
    
    // Method to start monitoring
    @ReactMethod
    public void startMonitoring(Promise promise) {
        try {
            Intent serviceIntent = new Intent(getReactApplicationContext(), CallRecordingService.class);
            getReactApplicationContext().startService(serviceIntent);
            promise.resolve("Monitoring started");
        } catch (Exception e) {
            promise.reject("MONITORING_ERROR", "Failed to start monitoring", e);
        }
    }
    
    // Method to stop monitoring
    @ReactMethod
    public void stopMonitoring(Promise promise) {
        try {
            Intent serviceIntent = new Intent(getReactApplicationContext(), CallRecordingService.class);
            getReactApplicationContext().stopService(serviceIntent);
            promise.resolve("Monitoring stopped");
        } catch (Exception e) {
            promise.reject("MONITORING_ERROR", "Failed to stop monitoring", e);
        }
    }
    
    // Get latest call recordings
    @ReactMethod
    public void getLatestRecordings(int limit, Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            WritableMap recordings = Arguments.createMap();
            
            int count = 0;
            for (String path : getDefaultRecordingPaths()) {
                File dir = new File(path);
                if (dir.exists() && dir.isDirectory()) {
                    File[] files = dir.listFiles((dir1, filename) -> 
                        filename.toLowerCase().matches(".*\\.(mp3|m4a|amr|wav|3gp)$"));
                    
                    if (files != null) {
                        for (File file : files) {
                            if (count >= limit) break;
                            
                            WritableMap fileInfo = Arguments.createMap();
                            fileInfo.putString("path", file.getAbsolutePath());
                            fileInfo.putString("name", file.getName());
                            fileInfo.putDouble("size", file.length());
                            fileInfo.putDouble("lastModified", file.lastModified());
                            
                            recordings.putMap("recording_" + count, fileInfo);
                            count++;
                        }
                    }
                }
            }
            
            result.putMap("recordings", recordings);
            result.putInt("count", count);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("READ_ERROR", "Failed to read recordings", e);
        }
    }
    
    // Static method to send events to React Native
    public static void sendRecordingEvent(String filePath) {
        if (reactContext != null && instance != null) {
            WritableMap params = Arguments.createMap();
            params.putString("filePath", filePath);
            params.putString("fileName", new File(filePath).getName());
            params.putDouble("timestamp", System.currentTimeMillis());
            
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onNewCallRecording", params);
        }
    }
    
    // Check if directory exists
    @ReactMethod
    public void checkDirectoryExists(String path, Promise promise) {
        try {
            File dir = new File(path);
            promise.resolve(dir.exists() && dir.isDirectory());
        } catch (Exception e) {
            promise.reject("CHECK_ERROR", "Failed to check directory", e);
        }
    }
    
    // Get file info
    @ReactMethod
    public void getFileInfo(String filePath, Promise promise) {
        try {
            File file = new File(filePath);
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "File does not exist");
                return;
            }
            
            WritableMap fileInfo = Arguments.createMap();
            fileInfo.putString("path", file.getAbsolutePath());
            fileInfo.putString("name", file.getName());
            fileInfo.putDouble("size", file.length());
            fileInfo.putDouble("lastModified", file.lastModified());
            fileInfo.putBoolean("isFile", file.isFile());
            
            promise.resolve(fileInfo);
        } catch (Exception e) {
            promise.reject("FILE_ERROR", "Failed to get file info", e);
        }
    }
}