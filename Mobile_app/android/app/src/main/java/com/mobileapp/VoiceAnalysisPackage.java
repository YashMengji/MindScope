package com.mobileapp;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.react.bridge.ReactApplicationContext;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Dedicated package to register the CallAnalysis Native Module.
 */
public class VoiceAnalysisPackage implements ReactPackage {

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        // Register the new CallAnalysisModule
        modules.add(new CallAnalysisModule(reactContext)); 
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
