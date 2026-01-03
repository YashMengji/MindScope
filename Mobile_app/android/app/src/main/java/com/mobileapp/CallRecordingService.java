package com.mobileapp;

import android.app.Service;
import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.documentfile.provider.DocumentFile;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

import java.util.HashSet;
import java.util.Set;

public class CallRecordingService extends Service {
    private static final String TAG = "CallRecordingService";
    private Handler handler;
    private Runnable monitorRunnable;
    private boolean isMonitoring = false;
    private Uri directoryUri;
    private Set<String> knownFiles = new HashSet<>();
    
    // Configuration: How often to check for new files (in milliseconds)
    // 5000ms = 5 seconds. You can adjust this if needed.
    private static final long POLLING_INTERVAL = 5000; 

    @Override
    public void onCreate() {
        super.onCreate();
        // We use the Main Looper for the handler to ensure safe communication
        handler = new Handler(Looper.getMainLooper());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "START_MONITORING".equals(intent.getAction())) {
            String uriString = intent.getStringExtra("directoryUri");
            if (uriString != null) {
                try {
                    directoryUri = Uri.parse(uriString);
                    startPolling();
                } catch (Exception e) {
                    Log.e(TAG, "Invalid URI provided", e);
                }
            }
        }
        // START_STICKY ensures the service restarts if the system kills it to save memory
        return START_STICKY;
    }

    private void startPolling() {
        if (isMonitoring) return;
        
        isMonitoring = true;
        Log.d(TAG, "Started monitoring directory: " + directoryUri);

        // 1. First, scan existing files so we don't treat old recordings as "new"
        initialScan();

        // 2. Start the recurring task to check for NEW files
        monitorRunnable = new Runnable() {
            @Override
            public void run() {
                if (!isMonitoring) return;
                
                scanForNewFiles();
                
                // Schedule the next check
                handler.postDelayed(this, POLLING_INTERVAL);
            }
        };
        // Run immediately
        handler.post(monitorRunnable);
    }

    /**
     * Scans the directory once to populate the 'knownFiles' list.
     * This prevents the app from alerting you about 100 old recordings when you first start it.
     */
    private void initialScan() {
        try {
            DocumentFile dir = DocumentFile.fromTreeUri(this, directoryUri);
            if (dir != null && dir.isDirectory()) {
                for (DocumentFile file : dir.listFiles()) {
                    if (!file.isDirectory()) {
                        // Add the unique URI of the file to our known set
                        knownFiles.add(file.getUri().toString());
                    }
                }
                Log.d(TAG, "Initial scan complete. Found " + knownFiles.size() + " existing files.");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error during initial scan", e);
        }
    }

    /**
     * Checks the directory for any file that isn't in our 'knownFiles' list.
     */
    private void scanForNewFiles() {
        try {
            DocumentFile dir = DocumentFile.fromTreeUri(this, directoryUri);
            if (dir == null || !dir.isDirectory()) return;

            DocumentFile[] files = dir.listFiles();
            for (DocumentFile file : files) {
                // Skip sub-directories
                if (file.isDirectory()) continue;

                String fileUri = file.getUri().toString();
                
                // If this file is NOT in our known set, it must be new!
                if (!knownFiles.contains(fileUri)) {
                    knownFiles.add(fileUri);
                    Log.d(TAG, "New recording detected: " + file.getName());
                    
                    // Send the event to React Native
                    sendEventToJS(file);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error scanning files", e);
        }
    }

    /**
     * Packages the file info into a map and sends it to the Native Module.
     */
    private void sendEventToJS(DocumentFile file) {
        WritableMap params = Arguments.createMap();
        params.putString("filePath", file.getUri().toString()); // We use the URI as the path
        params.putString("fileName", file.getName());
        params.putDouble("timestamp", file.lastModified());
        
        // This static method call sends the data to your React Native JS
        CallRecordingModule.sendEvent("onNewCallRecording", params);
    }

    @Override
    public void onDestroy() {
        isMonitoring = false;
        if (handler != null && monitorRunnable != null) {
            handler.removeCallbacks(monitorRunnable);
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        // We don't use binding for this service
        return null;
    }
}