package com.mobileapp;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

/**
 * DevicePermissionsModule
 *
 * Deep-links the user into the OEM settings pages that Android (and especially
 * MIUI / Xiaomi / Redmi / Poco) require for background accessibility services to
 * keep working. Each "open" method tries the most specific OEM intent first and
 * gracefully falls back to the generic App Details page if that component does
 * not exist on the device.
 *
 * JS name: DevicePermissions
 */
public class DevicePermissionsModule extends ReactContextBaseJavaModule {

    private static final String TAG = "DevicePermissions";
    private final ReactApplicationContext reactContext;

    public DevicePermissionsModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "DevicePermissions";
    }

    private String pkg() {
        return reactContext.getPackageName();
    }

    /** Try to launch an intent; returns true if it started, false otherwise. */
    private boolean tryStart(Intent intent) {
        if (intent == null) return false;
        try {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            return true;
        } catch (Exception e) {
            Log.w(TAG, "Intent failed: " + e.getMessage());
            return false;
        }
    }

    /** Generic fallback: the standard per-app system settings page. */
    private boolean openAppDetails() {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + pkg()));
        return tryStart(intent);
    }

    // ─── Device info ────────────────────────────────────────────────────────────

    @ReactMethod
    public void getManufacturer(Promise promise) {
        promise.resolve(Build.MANUFACTURER == null ? "" : Build.MANUFACTURER);
    }

    @ReactMethod
    public void isMiui(Promise promise) {
        promise.resolve(isMiuiDevice());
    }

    private boolean isMiuiDevice() {
        String m = Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.toLowerCase();
        String b = Build.BRAND == null ? "" : Build.BRAND.toLowerCase();
        return m.contains("xiaomi") || m.contains("redmi") || m.contains("poco")
                || b.contains("xiaomi") || b.contains("redmi") || b.contains("poco");
    }

    // ─── 1. Autostart (MIUI) ─────────────────────────────────────────────────────

    @ReactMethod
    public void openAutoStartSettings(Promise promise) {
        // MIUI Security Center → Autostart
        Intent miui = new Intent();
        miui.setClassName("com.miui.securitycenter",
                "com.miui.permcenter.autostart.AutoStartManagementActivity");
        if (tryStart(miui)) { promise.resolve(true); return; }

        // Letv / older variants sometimes expose this list
        Intent miui2 = new Intent();
        miui2.setClassName("com.miui.securitycenter",
                "com.miui.permcenter.autostart.AutoStartDetailManagementActivity");
        if (tryStart(miui2)) { promise.resolve(true); return; }

        promise.resolve(openAppDetails());
    }

    // ─── 2. Background pop-up / "Display pop-up windows" (MIUI other permissions) ──

    @ReactMethod
    public void openOtherPermissions(Promise promise) {
        // MIUI "Other permissions" editor — contains "Display pop-up windows while
        // running in the background" and "Show on Lock screen".
        Intent editor = new Intent("miui.intent.action.APP_PERM_EDITOR");
        editor.setClassName("com.miui.securitycenter",
                "com.miui.permcenter.permissions.PermissionsEditorActivity");
        editor.putExtra("extra_pkgname", pkg());
        if (tryStart(editor)) { promise.resolve(true); return; }

        // Older MIUI class name
        Intent editor2 = new Intent("miui.intent.action.APP_PERM_EDITOR");
        editor2.setClassName("com.miui.securitycenter",
                "com.miui.permcenter.permissions.AppPermissionsEditorActivity");
        editor2.putExtra("extra_pkgname", pkg());
        if (tryStart(editor2)) { promise.resolve(true); return; }

        promise.resolve(openAppDetails());
    }

    // ─── 3. Battery → "No restrictions" ──────────────────────────────────────────

    @ReactMethod
    public void openBatterySettings(Promise promise) {
        // Direct system dialog to exempt from battery optimization.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent req = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    Uri.parse("package:" + pkg()));
            if (tryStart(req)) { promise.resolve(true); return; }
        }

        // MIUI Power Keeper per-app battery saver ("No restrictions").
        Intent miuiPower = new Intent();
        miuiPower.setClassName("com.miui.powerkeeper",
                "com.miui.powerkeeper.ui.HiddenAppsConfigActivity");
        miuiPower.putExtra("package_name", pkg());
        miuiPower.putExtra("package_label", "MindScope");
        if (tryStart(miuiPower)) { promise.resolve(true); return; }

        // Generic battery-optimization list.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent list = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
            if (tryStart(list)) { promise.resolve(true); return; }
        }

        promise.resolve(openAppDetails());
    }

    @ReactMethod
    public void isIgnoringBatteryOptimizations(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
                promise.resolve(pm != null && pm.isIgnoringBatteryOptimizations(pkg()));
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    // ─── 4. Display over other apps (overlay / pop-up) ───────────────────────────

    @ReactMethod
    public void openOverlaySettings(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + pkg()));
            if (tryStart(intent)) { promise.resolve(true); return; }
        }
        promise.resolve(openAppDetails());
    }

    @ReactMethod
    public void canDrawOverlays(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                promise.resolve(Settings.canDrawOverlays(reactContext));
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    // ─── 5. Accessibility ────────────────────────────────────────────────────────

    @ReactMethod
    public void openAccessibilitySettings(Promise promise) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        if (tryStart(intent)) { promise.resolve(true); return; }
        promise.resolve(openAppDetails());
    }

    /** True only if the critical Chat Analysis accessibility service is enabled. */
    @ReactMethod
    public void isAccessibilityServiceEnabled(Promise promise) {
        promise.resolve(isServiceEnabled(ChatAccessibilityService.class.getName()));
    }

    private boolean isServiceEnabled(String serviceClass) {
        String expected = pkg() + "/" + serviceClass;
        int enabled = 0;
        try {
            enabled = Settings.Secure.getInt(reactContext.getContentResolver(),
                    Settings.Secure.ACCESSIBILITY_ENABLED);
        } catch (Settings.SettingNotFoundException e) {
            Log.w(TAG, "ACCESSIBILITY_ENABLED not found: " + e.getMessage());
        }
        if (enabled != 1) return false;

        String value = Settings.Secure.getString(reactContext.getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (TextUtils.isEmpty(value)) return false;

        TextUtils.SimpleStringSplitter splitter = new TextUtils.SimpleStringSplitter(':');
        splitter.setString(value);
        while (splitter.hasNext()) {
            if (splitter.next().equalsIgnoreCase(expected)) return true;
        }
        return false;
    }
}
