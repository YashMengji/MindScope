package com.mobileapp;

import android.os.FileObserver;
import android.util.Log;
import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class FileObserverHelper extends FileObserver {
  private static final String TAG = "FileObserverHelper";
  private String path;
  private List<String> watchExtensions;

  public interface OnFileChangeListener {
    void onFileCreated(String path);

    void onFileModified(String path);

    void onFileDeleted(String path);
  }

  private OnFileChangeListener listener;

  public FileObserverHelper(String path, OnFileChangeListener listener) {
    super(path, CREATE | MODIFY | DELETE);
    this.path = path;
    this.listener = listener;
    this.watchExtensions = new ArrayList<>();
    watchExtensions.add(".mp3");
    watchExtensions.add(".m4a");
    watchExtensions.add(".amr");
    watchExtensions.add(".wav");
    watchExtensions.add(".3gp");
  }

  @Override
  public void onEvent(int event, String filePath) {
    if (filePath == null)
      return;

    String fullPath = path + File.separator + filePath;
    File file = new File(fullPath);

    // Check if file has audio extension
    boolean isAudioFile = false;
    for (String ext : watchExtensions) {
      if (filePath.toLowerCase().endsWith(ext)) {
        isAudioFile = true;
        break;
      }
    }

    if (!isAudioFile)
      return;

    switch (event) {
      case FileObserver.CREATE:
        Log.d(TAG, "File created: " + fullPath);
        if (listener != null) {
          listener.onFileCreated(fullPath);
        }
        break;
      case FileObserver.MODIFY:
        if (listener != null) {
          listener.onFileModified(fullPath);
        }
        break;
      case FileObserver.DELETE:
        if (listener != null) {
          listener.onFileDeleted(fullPath);
        }
        break;
    }
  }
}