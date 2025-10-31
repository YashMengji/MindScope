package com.mobileapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Environment;
import android.os.IBinder;
import android.util.Log;
import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Service to handle the actual audio recording using MediaRecorder.
 */
public class CallRecordingService extends Service {
    private static final String TAG = "CallRecordingService";
    private static final int NOTIFICATION_ID = 101;
    private static final String CHANNEL_ID = "CallRecordingChannel"; // Used for API 26+

    private MediaRecorder mediaRecorder;
    private String recordedFilePath;
    private boolean isRecording = false;

    // Actions for the Intent
    public static final String ACTION_START_RECORDING = "com.mobileapp.ACTION_START_RECORDING";
    public static final String ACTION_STOP_RECORDING = "com.mobileapp.ACTION_STOP_RECORDING";


    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        // Create the notification channel when the service is created
        createNotificationChannel(); 
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Call Recording Service",
                    NotificationManager.IMPORTANCE_LOW // Use LOW so it's less intrusive
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }
    
    private Notification buildNotification() {
        // Build a simple notification that will persist while the service is running
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            // Deprecated path for older APIs (though less common now)
            builder = new Notification.Builder(this); 
        }

        builder.setContentTitle("Voice Analysis Active")
               .setContentText("Recording your voice during the call.")
               .setSmallIcon(android.R.drawable.ic_btn_speak_now) 
               .setTicker("Voice recording started");

        return builder.build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // CRITICAL: Start the service in the foreground immediately after launch
        Notification notification = buildNotification();
        startForeground(NOTIFICATION_ID, notification);
        
        Log.d(TAG, "Service started and promoted to Foreground. Checking action.");

        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();
            
            if (action.equals(ACTION_START_RECORDING)) {
                if (!isRecording) {
                    startRecording();
                } else {
                    Log.d(TAG, "Recording already running.");
                }
            } else if (action.equals(ACTION_STOP_RECORDING)) {
                // Stop recording and stop the service
                stopRecording();
                stopSelf(); // Stops the service, triggering onDestroy
            }
        }
        
        return START_STICKY; 
    }

    /**
     * Initializes and starts the MediaRecorder.
     */
    private void startRecording() {
        if (mediaRecorder != null) {
            Log.w(TAG, "MediaRecorder is already active.");
            return;
        }
        
        recordedFilePath = createRecordingFilePath();
        if (recordedFilePath == null) {
            Log.e(TAG, "Failed to create recording file path. Cannot record.");
            // Stop foreground state and exit if we can't save
            stopForeground(true);
            stopSelf();
            return;
        }

        mediaRecorder = new MediaRecorder();

        try {
            // FINAL ATTEMPT: Use VOICE_RECOGNITION audio source. This source is intended for
            // high-quality, processed speech recognition and sometimes bypasses call restrictions
            // more effectively than MIC or UNPROCESSED, especially on specific OEM firmwares.
            // This is the last standardized source to try before declaring the device incompatible.
            mediaRecorder.setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION);
            
            // Reverting to the higher-quality MPEG_4/AAC setup
            mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4); 
            mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);

            // 3. Set File Path
            mediaRecorder.setOutputFile(recordedFilePath);

            // 4. Prepare and Start
            mediaRecorder.prepare();
            mediaRecorder.start();
            isRecording = true;
            Log.d(TAG, "Recording started successfully. File: " + recordedFilePath);
            
        } catch (IOException e) {
            Log.e(TAG, "Recording preparation failed.", e);
            stopRecording(); 
            stopForeground(true);
            stopSelf();
        } catch (IllegalStateException e) {
            Log.e(TAG, "Recording start failed due to IllegalState (often related to permissions or another app using mic).", e);
            stopRecording();
            stopForeground(true);
            stopSelf();
        }
    }

    /**
     * Stops the MediaRecorder and finalizes the file.
     */
    private void stopRecording() {
        if (mediaRecorder != null) {
            try {
                if (isRecording) {
                    mediaRecorder.stop();
                    // CRITICAL LOG: This should confirm successful finalization
                    Log.i(TAG, "Recording stopped and finalized successfully. File: " + recordedFilePath);
                    isRecording = false;
                }
            } catch (RuntimeException stopException) {
                // RuntimeException often occurs if stop is called on a MediaRecorder that 
                // received no valid data (i.e., less than a second of recording).
                Log.e(TAG, "MediaRecorder.stop() failed (file likely corrupt/empty). Deleting file.", stopException);
                
                // --- EXPLICITLY DELETE CORRUPT FILE ---
                File file = new File(recordedFilePath);
                if (file.exists()) {
                    // Log the size of the corrupt file before attempting to delete it
                    Log.d(TAG, "Corrupt file size before deletion: " + file.length() + " bytes.");
                    file.delete();
                    Log.d(TAG, "Corrupt file deleted: " + recordedFilePath);
                }
            } finally {
                releaseMediaRecorder();
            }
        }
        // stopForeground(true) is handled in onDestroy to ensure the notification is dismissed 
        // when the service officially ends.
    }

    /**
     * Helper to release MediaRecorder resources.
     */
    private void releaseMediaRecorder() {
        if (mediaRecorder != null) {
            mediaRecorder.reset();
            mediaRecorder.release();
            mediaRecorder = null;
            Log.d(TAG, "MediaRecorder released.");
        }
    }

    /**
     * Creates a unique file path for the recording in the app's external files directory.
     * @return The absolute path to the file.
     */
    private String createRecordingFilePath() {
        // Use a descriptive name format
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        String fileName = "CALL_REC_" + timeStamp + ".m4a";
        
        // Use the application's specific external files directory (safer permissions)
        // This generally does not require explicit WRITE_EXTERNAL_STORAGE permission on modern APIs
        File storageDir = getExternalFilesDir(Environment.DIRECTORY_PODCASTS); 
        if (storageDir != null && !storageDir.exists()) {
            storageDir.mkdirs();
        }

        if (storageDir == null) return null;
        
        return new File(storageDir, fileName).getAbsolutePath();
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "Service destroyed. Stopping recording (if active).");
        stopRecording(); // Ensure MediaRecorder is released
        // CRITICAL: Remove the notification and foreground status
        stopForeground(true); 
        super.onDestroy();
    }
}
