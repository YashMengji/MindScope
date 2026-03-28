package com.mobileapp; // ← Replace with your actual package name

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * SectionBlockerPackage.java
 *
 * Registers SectionBlockerManager with React Native.
 * Add an instance of this class to the packages list in MainApplication.java:
 *
 *   @Override
 *   protected List<ReactPackage> getPackages() {
 *     return Arrays.<ReactPackage>asList(
 *         new MainReactPackage(),
 *         new SectionBlockerPackage(),   // ← add this
 *         // ... other packages
 *     );
 *   }
 */
public class SectionBlockerPackage implements ReactPackage {

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        return Arrays.<NativeModule>asList(
                new SectionBlockerManager(reactContext)
        );
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
