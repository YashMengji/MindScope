package com.mobileapp;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.os.Environment;
import android.util.Log;
import java.io.File;
import java.util.HashMap;
import java.util.Map;

public class CallRecordingService extends Service {

    public static final String ACTION_START_RECORDING = "com.mobileapp.action.START_RECORDING";

    public static final String ACTION_STOP_RECORDING = "com.mobileapp.action.STOP_RECORDING";

    private static final String TAG = "CallRecordingService";
    private Map<String, FileObserverHelper> observers = new HashMap<>();

    // Common call recording directories on Android
    private static final String[] CALL_RECORDING_PATHS = {
            Environment.getExternalStorageDirectory().getPath() + "/CallRecordings/",
            Environment.getExternalStorageDirectory().getPath() + "/Recordings/",
            Environment.getExternalStorageDirectory().getPath() + "/Voice Recorder/",
            Environment.getExternalStorageDirectory().getPath() + "/Audio/Recordings/",
            Environment.getExternalStorageDirectory().getPath() + "/Sounds/",
            Environment.getExternalStorageDirectory().getPath() + "/Phone/Recordings/",
            Environment.getExternalStorageDirectory().getPath() + "/MIUI/sound_recorder/call_rec/", // Xiaomi
            Environment.getExternalStorageDirectory().getPath() + "/Music/Call/", // Samsung
            Environment.getExternalStorageDirectory().getPath() + "/Call/", // Huawei
    };

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Call Recording Service Started");
        startMonitoring();
    }

    private void startMonitoring() {
        for (String path : CALL_RECORDING_PATHS) {
            File directory = new File(path);
            if (directory.exists() && directory.isDirectory()) {
                startWatchingDirectory(path);
            }
        }

        // Also watch root of recordings folder recursively
        File recordingsRoot = new File(Environment.getExternalStorageDirectory(), "Recordings");
        if (recordingsRoot.exists()) {
            startWatchingDirectoryRecursive(recordingsRoot.getPath());
        }
    }

    private void startWatchingDirectory(String path) {
        if (observers.containsKey(path))
            return;

        FileObserverHelper observer = new FileObserverHelper(path,
                new FileObserverHelper.OnFileChangeListener() {
                    @Override
                    public void onFileCreated(String filePath) {
                        handleNewRecording(filePath);
                    }

                    @Override
                    public void onFileModified(String filePath) {
                        // Handle modification if needed
                    }

                    @Override
                    public void onFileDeleted(String filePath) {
                        // Handle deletion if needed
                    }
                });

        observer.startWatching();
        observers.put(path, observer);
        Log.d(TAG, "Started watching: " + path);
    }

    private void startWatchingDirectoryRecursive(String path) {
        File root = new File(path);
        if (!root.exists() || !root.isDirectory())
            return;

        startWatchingDirectory(path);

        // Watch subdirectories
        File[] subDirs = root.listFiles(File::isDirectory);
        if (subDirs != null) {
            for (File subDir : subDirs) {
                startWatchingDirectoryRecursive(subDir.getPath());
            }
        }
    }

    private void handleNewRecording(String filePath) {
        Log.d(TAG, "New recording detected: " + filePath);

        // Check if it's a call recording (based on filename patterns)
        File file = new File(filePath);
        String fileName = file.getName().toLowerCase();

        // Common patterns in call recording filenames
        boolean isCallRecording = fileName.contains("call") ||
                fileName.contains("recording") ||
                fileName.contains("voice") ||
                fileName.contains("audio") ||
                fileName.matches(".*\\d{8}_\\d{6}.*") || // Timestamp pattern
                fileName.matches(".*call.*\\.(mp3|m4a|amr|wav|3gp)");

        if (isCallRecording) {
            // Send event to React Native
            sendRecordingEventToReactNative(filePath);
        }
    }

    private void sendRecordingEventToReactNative(String filePath) {
        // This will be connected to the module
        CallRecordingModule.sendRecordingEvent(filePath);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopMonitoring();
    }

    private void stopMonitoring() {
        for (FileObserverHelper observer : observers.values()) {
            observer.stopWatching();
        }
        observers.clear();
    }
}