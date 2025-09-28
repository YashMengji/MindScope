package com.mobileapp;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;

public class ChatAccessibilityModule extends ReactContextBaseJavaModule {

    public ChatAccessibilityModule(ReactApplicationContext reactContext) {
        super(reactContext);
        ChatAccessibilityService.setReactContext(reactContext); // connect service with RN
    }

    @Override
    public String getName() {
        return "ChatAccessibility";
    }
}
