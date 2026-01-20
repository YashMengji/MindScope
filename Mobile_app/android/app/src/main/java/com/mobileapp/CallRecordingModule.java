package com.mobileapp;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.content.SharedPreferences;
import android.content.Context;
import androidx.annotation.Nullable;
import androidx.documentfile.provider.DocumentFile;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.HashMap;
import java.util.Map;

public class CallRecordingModule extends ReactContextBaseJavaModule {
    private static final String TAG = "CallRecordingModule";
    private static final int REQUEST_CODE_OPEN_DIRECTORY = 9999;
    private static final String PREFS_NAME = "CallRecordingPrefs";
    private static final String KEY_SELECTED_URI = "selected_uri";

    private Promise pendingPromise;
    private static ReactApplicationContext reactContext;

    // --- Activity Listener to handle the Folder Picker Result ---
    private final ActivityEventListener activityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
            if (requestCode == REQUEST_CODE_OPEN_DIRECTORY) {
                if (pendingPromise == null) return;

                if (resultCode == Activity.RESULT_OK && data != null) {
                    Uri treeUri = data.getData();
                    if (treeUri != null) {
                        try {
                            // 1. Take persistable permission so we can access this folder after app restarts
                            final int takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION |
                                    Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
                            reactContext.getContentResolver().takePersistableUriPermission(treeUri, takeFlags);
                        } catch (SecurityException e) {
                            // Even if persistable fails (rare), we might still have temporary access
                            e.printStackTrace();
                        }

                        // 2. Save the URI string to SharedPreferences
                        saveUriToPrefs(treeUri.toString());

                        // 3. Resolve the promise with the URI string
                        pendingPromise.resolve(treeUri.toString());
                    } else {
                        pendingPromise.reject("URI_NULL", "Selected URI was null");
                    }
                } else {
                    // User cancelled the picker
                    pendingPromise.resolve(null);
                }
                pendingPromise = null;
            }
        }
    };

    public CallRecordingModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
        // Register the listener to catch the "onActivityResult" event
        reactContext.addActivityEventListener(activityEventListener);
    }

    @Override
    public String getName() {
        return "CallRecordingManager";
    }

    // --- React Methods ---

    /**
     * Opens the Android System Folder Picker (SAF) to let the user select the recording folder.
     */
    @ReactMethod
    public void requestRecordingFolderAccess(Promise promise) {
        Activity currentActivity = getCurrentActivity();
        if (currentActivity == null) {
            promise.reject("ACTIVITY_NULL", "Activity doesn't exist");
            return;
        }

        this.pendingPromise = promise;

        try {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
            // Flags to ensure we get a persistent URI that works across reboots
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
            
            currentActivity.startActivityForResult(intent, REQUEST_CODE_OPEN_DIRECTORY);
        } catch (Exception e) {
            this.pendingPromise.reject("START_FAILED", e);
            this.pendingPromise = null;
        }
    }

    /**
     * Starts the background monitoring service using the saved URI.
     */
    @ReactMethod
    public void startMonitoring(Promise promise) {
        String uriString = getSavedUri();
        if (uriString == null) {
            promise.reject("NO_URI", "No recording directory selected. Please select a folder first.");
            return;
        }

        try {
            Intent serviceIntent = new Intent(reactContext, CallRecordingService.class);
            serviceIntent.setAction("START_MONITORING");
            serviceIntent.putExtra("directoryUri", uriString);
            
            // Start the service
            reactContext.startService(serviceIntent);
            
            promise.resolve("Monitoring started");
        } catch (Exception e) {
            promise.reject("SERVICE_ERROR", "Failed to start service", e);
        }
    }

    /**
     * Stops the monitoring service.
     */
    @ReactMethod
    public void stopMonitoring(Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, CallRecordingService.class);
            reactContext.stopService(serviceIntent);
            promise.resolve("Monitoring stopped");
        } catch (Exception e) {
            promise.reject("STOP_ERROR", "Failed to stop service", e);
        }
    }

    /**
     * Gets file information for a specific URI (name, size).
     */
    @ReactMethod
    public void getFileInfo(String uriString, Promise promise) {
        try {
            Uri fileUri = Uri.parse(uriString);
            DocumentFile file = DocumentFile.fromSingleUri(reactContext, fileUri);
            
            if (file != null && file.exists()) {
                WritableMap map = Arguments.createMap();
                map.putString("name", file.getName());
                map.putDouble("size", file.length());
                map.putString("uri", file.getUri().toString());
                promise.resolve(map);
            } else {
                promise.reject("FILE_NOT_FOUND", "Could not resolve file info from URI");
            }
        } catch (Exception e) {
            promise.reject("ERROR", e);
        }
    }

    /**
     * Lists all files in the currently selected recording directory.
     * Returns an array of objects: { name, uri, lastModified }
     */
    @ReactMethod
    public void listRecordings(Promise promise) {
        String uriString = getSavedUri();
        if (uriString == null) {
            promise.reject("NO_URI", "No recording directory selected.");
            return;
        }

        try {
            Uri treeUri = Uri.parse(uriString);
            DocumentFile dir = DocumentFile.fromTreeUri(reactContext, treeUri);

            if (dir != null && dir.isDirectory()) {
                WritableArray fileList = Arguments.createArray();
                DocumentFile[] files = dir.listFiles();

                for (DocumentFile file : files) {
                    // Only add files, skip sub-directories
                    if (!file.isDirectory() && file.getName() != null) {
                        WritableMap fileMap = Arguments.createMap();
                        fileMap.putString("name", file.getName());
                        fileMap.putString("uri", file.getUri().toString());
                        // Send timestamp as double (milliseconds)
                        fileMap.putDouble("lastModified", (double) file.lastModified()); 
                        fileList.pushMap(fileMap);
                    }
                }
                promise.resolve(fileList);
            } else {
                promise.reject("DIR_ERROR", "Could not access the directory or it is invalid.");
            }
        } catch (Exception e) {
            promise.reject("LIST_ERROR", "Failed to list recordings: " + e.getMessage(), e);
        }
    }
    
    // --- Helper Methods ---

    private void saveUriToPrefs(String uri) {
        SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_SELECTED_URI, uri).apply();
    }

    private String getSavedUri() {
        SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_SELECTED_URI, null);
    }

    /**
     * Static method to send events to JavaScript.
     * Used by CallRecordingService to notify of new files.
     */
    public static void sendEvent(String eventName, WritableMap params) {
        if (reactContext != null) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        }
    }
}