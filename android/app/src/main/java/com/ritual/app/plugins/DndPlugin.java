package com.ritual.app.plugins;

import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Dnd")
public class DndPlugin extends Plugin {

    private NotificationManager getNotificationManager() {
        Context ctx = getContext();
        return (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
    }

    @PluginMethod
    public void enter(PluginCall call) {
        NotificationManager nm = getNotificationManager();
        if (nm == null) {
            call.reject("NotificationManager not available");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!nm.isNotificationPolicyAccessGranted()) {
                call.reject("ACCESS_NOTIFICATION_POLICY permission not granted");
                return;
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY);
        }

        JSObject res = new JSObject();
        res.put("active", true);
        call.resolve(res);
    }

    @PluginMethod
    public void exit(PluginCall call) {
        NotificationManager nm = getNotificationManager();
        if (nm == null) {
            call.reject("NotificationManager not available");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL);
        }

        JSObject res = new JSObject();
        res.put("active", false);
        call.resolve(res);
    }

    @PluginMethod
    public void isActive(PluginCall call) {
        NotificationManager nm = getNotificationManager();
        JSObject res = new JSObject();

        boolean active = false;
        if (nm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            active = nm.getCurrentInterruptionFilter() == NotificationManager.INTERRUPTION_FILTER_PRIORITY;
        }

        res.put("active", active);
        call.resolve(res);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            NotificationManager nm = getNotificationManager();
            if (nm != null && !nm.isNotificationPolicyAccessGranted()) {
                // Open system DND settings
                android.content.Intent intent = new android.content.Intent(android.provider.Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
        }

        JSObject res = new JSObject();
        res.put("granted", isPermissionGranted());
        call.resolve(res);
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject res = new JSObject();
        res.put("granted", isPermissionGranted());
        call.resolve(res);
    }

    private boolean isPermissionGranted() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            NotificationManager nm = getNotificationManager();
            return nm != null && nm.isNotificationPolicyAccessGranted();
        }
        return true;
    }
}
