package com.ritual.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.ContentValues;
import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.jstyle.blesdk2301x6.Util.BleSDK;
import com.jstyle.blesdk2301x6.callback.DataListener2301;
import com.jstyle.blesdk2301x6.constant.BleConst;
import com.jstyle.blesdk2301x6.constant.DeviceKey;
import com.jstyle.blesdk2301x6.model.AutoMode;
import com.jstyle.blesdk2301x6.model.AutoTestMode;
import com.jstyle.blesdk2301x6.model.MyAutomaticHRMonitoring;
import com.jstyle.blesdk2301x6.model.MyDeviceTime;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Queue;
import java.util.TimeZone;
import java.util.UUID;

@CapacitorPlugin(
    name = "X6Ring",
    permissions = {
        @Permission(alias = "scan", strings = { Manifest.permission.BLUETOOTH_SCAN }),
        @Permission(alias = "connect", strings = { Manifest.permission.BLUETOOTH_CONNECT }),
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION })
    }
)
public class X6RingPlugin extends Plugin implements DataListener2301 {
    private static final String PREFS = "ritual_x6_ring";
    private static final String KEY_ADDRESS = "address";
    private static final String KEY_NAME = "name";
    private static final String KEY_BATTERY = "battery";
    private static final String KEY_VERSION = "version";
    private static final String KEY_LAST_SYNC = "last_sync";
    private static final String[] X6_NAMES = { "2301", "x6", "ritual", "ring" };

    private final Handler main = new Handler(Looper.getMainLooper());
    private SharedPreferences prefs;
    private RingStore store;
    private X6GattClient client;
    private PluginCall scanCall;
    private PluginCall connectCall;
    private PluginCall syncCall;
    private final Map<String, JSObject> scanned = new LinkedHashMap<>();
    private String liveType;
    private String syncFrom;
    private long syncStartedAt;
    private int sleepPacketCount;
    private boolean sleepSyncActive;
    private final Runnable sleepSyncTimeout = () -> finishSleepSyncPhase(false);

    @Override
    public void load() {
        prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        store = new RingStore(getContext());
        client = new X6GattClient(getContext(), new X6GattClient.Listener() {
            @Override public void onState(String state, String message) {
                JSObject event = new JSObject().put("state", state).put("message", message);
                notifyListeners("connectionStateChanged", event, true);
                if ("connected".equals(state) && connectCall != null) {
                    PluginCall pending = connectCall;
                    connectCall = null;
                    String address = client.getAddress();
                    String name = client.getName();
                    prefs.edit().putString(KEY_ADDRESS, address).putString(KEY_NAME, name).apply();
                    pending.resolve(deviceJson());
                    probeDevice();
                } else if ("error".equals(state) && connectCall != null) {
                    PluginCall pending = connectCall;
                    connectCall = null;
                    pending.reject(message == null ? "Не удалось подключить кольцо" : message);
                }
            }
            @Override public void onData(byte[] data) {
                try { BleSDK.DataParsingWithData(data, X6RingPlugin.this); }
                catch (Exception error) { emitDiagnostic("parse_error", error.getMessage()); }
            }
        });
        String remembered = prefs.getString(KEY_ADDRESS, null);
        if (remembered != null && hasBluetoothPermissions()) client.connect(remembered, prefs.getString(KEY_NAME, "Ritual Ring"));
    }

    @PluginMethod
    public void getPermissionState(PluginCall call) {
        JSObject result = new JSObject();
        result.put("bluetooth", permissionLabel());
        result.put("bluetoothEnabled", client.isBluetoothEnabled());
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) requestPermissionForAliases(new String[]{"scan", "connect"}, call, "permissionsResult");
        else requestPermissionForAlias("location", call, "permissionsResult");
    }

    @PermissionCallback
    private void permissionsResult(PluginCall call) { getPermissionState(call); }

    @PluginMethod
    public void scan(PluginCall call) {
        if (!hasBluetoothPermissions()) { call.reject("Требуется разрешение Bluetooth"); return; }
        if (!client.isBluetoothEnabled()) { call.reject("Bluetooth выключен"); return; }
        if (scanCall != null) scanCall.reject("Начато новое сканирование");
        scanCall = call;
        scanned.clear();
        int timeout = Math.max(3000, Math.min(30000, call.getInt("timeoutMs", 10000)));
        client.scan(new X6GattClient.ScanListener() {
            @Override public void onDevice(BluetoothDevice device, int rssi) {
                String name = safeName(device);
                JSObject item = new JSObject().put("name", name).put("address", device.getAddress()).put("rssi", rssi).put("nearby", rssi >= -70).put("recognized", isCompatibleName(name));
                scanned.put(device.getAddress(), item);
                notifyListeners("scanResult", item, true);
            }
            @Override public void onError(int code) { finishScan("Ошибка сканирования: " + code); }
        });
        main.postDelayed(() -> finishScan(null), timeout);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.trim().isEmpty()) { call.reject("Не указан адрес кольца"); return; }
        if (!hasBluetoothPermissions()) { call.reject("Требуется разрешение Bluetooth"); return; }
        if (connectCall != null) connectCall.reject("Начато новое подключение");
        connectCall = call;
        client.stopScan();
        client.connect(address, call.getString("name", "Ritual Ring"));
        main.postDelayed(() -> {
            if (connectCall == call) {
                connectCall = null;
                client.disconnect();
                call.reject("Кольцо не ответило. Поднесите его ближе и повторите.");
            }
        }, 20000);
    }

    @PluginMethod public void disconnect(PluginCall call) { client.disconnect(); call.resolve(); }

    @PluginMethod
    public void forgetDevice(PluginCall call) {
        client.disconnect();
        prefs.edit().remove(KEY_ADDRESS).remove(KEY_NAME).remove(KEY_BATTERY).remove(KEY_VERSION).remove(KEY_LAST_SYNC).apply();
        call.resolve();
    }

    @PluginMethod
    public void getConnectionState(PluginCall call) {
        call.resolve(new JSObject().put("state", client.getState()).put("address", prefs.getString(KEY_ADDRESS, null)).put("remembered", prefs.contains(KEY_ADDRESS)));
    }

    @PluginMethod public void getDeviceInfo(PluginCall call) { call.resolve(deviceJson()); }

    @PluginMethod
    public void configureAutoMonitoring(PluginCall call) {
        if (!client.isConnected()) { call.reject("Кольцо не подключено"); return; }
        int interval = Math.max(5, Math.min(180, call.getInt("intervalMinutes", 30)));
        int startHour = call.getInt("startHour", 0);
        int endHour = call.getInt("endHour", 23);
        int week = call.getInt("weekMask", 127);
        boolean enabled = call.getBoolean("enabled", true);
        for (AutoMode mode : new AutoMode[]{AutoMode.AutoHeartRate, AutoMode.AutoSpo2, AutoMode.AutoTemp, AutoMode.AutoHrv}) {
            MyAutomaticHRMonitoring config = new MyAutomaticHRMonitoring();
            config.setStartHour(startHour); config.setStartMinute(0); config.setEndHour(endHour); config.setEndMinute(59);
            config.setTime(interval); config.setWeek(week); config.setOpen(enabled ? 2 : 0);
            client.enqueue(BleSDK.SetAutomaticHRMonitoring(config, mode));
        }
        call.resolve(new JSObject().put("configured", true));
    }

    @PluginMethod
    public void sync(PluginCall call) {
        if (!client.isConnected()) { call.reject("Кольцо не подключено"); return; }
        if (syncCall != null) { call.reject("Синхронизация уже выполняется"); return; }
        syncCall = call;
        syncFrom = call.getString("from", formatDeviceDate(System.currentTimeMillis() - 30L * 86400000L));
        syncStartedAt = System.currentTimeMillis();
        sleepPacketCount = 0;
        sleepSyncActive = true;
        notifyListeners("syncProgress", new JSObject().put("progress", 5).put("step", "Подготовка"), true);
        client.enqueue(BleSDK.SetDeviceTime(new MyDeviceTime()));
        client.enqueue(BleSDK.GetDeviceBatteryLevel());
        client.enqueue(BleSDK.GetDeviceVersion());
        client.enqueue(BleSDK.GetDeviceName());
        // X6 returns sleep as a paged stream. Other history commands must not
        // be interleaved until the ring sends dataEnd (or the timeout expires).
        client.enqueue(BleSDK.GetDetailSleepDataWithMode((byte) 0, syncFrom));
        main.removeCallbacks(sleepSyncTimeout);
        main.postDelayed(sleepSyncTimeout, 15000);
    }

    private void finishSleepSyncPhase(boolean completedByDevice) {
        if (!sleepSyncActive || syncCall == null) return;
        sleepSyncActive = false;
        main.removeCallbacks(sleepSyncTimeout);
        notifyListeners("syncProgress", new JSObject().put("progress", completedByDevice ? 45 : 35)
            .put("step", completedByDevice ? "Сон загружен" : "Сон: время ожидания истекло"), true);

        client.enqueue(BleSDK.GetTotalActivityDataWithMode((byte) 0, syncFrom));
        client.enqueue(BleSDK.GetDetailActivityDataWithMode((byte) 0, syncFrom));
        client.enqueue(BleSDK.GetHRVDataWithMode((byte) 0, syncFrom));
        client.enqueue(BleSDK.GetStaticHRWithMode((byte) 0, syncFrom));
        client.enqueue(BleSDK.GetDynamicHRWithMode((byte) 0, syncFrom));
        client.enqueue(BleSDK.Oxygen_data((byte) 0, syncFrom));
        client.enqueue(BleSDK.GetTemperature_historyData((byte) 0, syncFrom));
        main.postDelayed(this::completeSync, 9000);
    }

    private void completeSync() {
        PluginCall pending = syncCall;
        if (pending == null) return;
        syncCall = null;
        long completedAt = System.currentTimeMillis();
        prefs.edit().putLong(KEY_LAST_SYNC, completedAt).apply();
        JSObject result = new JSObject().put("lastSync", iso(completedAt)).put("records", store.countSince(syncStartedAt));
        notifyListeners("syncProgress", new JSObject().put("progress", 100).put("step", "Готово"), true);
        pending.resolve(result);
    }

    @PluginMethod
    public void getDailySummary(PluginCall call) {
        String date = call.getString("date", new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()));
        call.resolve(store.summary(date, prefs));
    }

    @PluginMethod
    public void getSeries(PluginCall call) {
        String type = call.getString("type", "heartRate");
        long from = call.getLong("from", System.currentTimeMillis() - 7L * 86400000L);
        long to = call.getLong("to", System.currentTimeMillis());
        String aggregation = call.getString("aggregation", "raw");
        call.resolve(new JSObject().put("points", store.series(type, from, to, aggregation)));
    }

    @PluginMethod
    public void startLiveMeasurement(PluginCall call) {
        if (!client.isConnected()) { call.reject("Кольцо не подключено"); return; }
        liveType = call.getString("type", "heartRate");
        AutoTestMode mode = "spo2".equals(liveType) ? AutoTestMode.AutoSpo2 : AutoTestMode.AutoHeartRate;
        client.enqueue(BleSDK.SetDeviceMeasurementWithType(mode, 60, true));
        call.resolve();
    }

    @PluginMethod
    public void stopLiveMeasurement(PluginCall call) {
        if (client.isConnected() && liveType != null) {
            AutoTestMode mode = "spo2".equals(liveType) ? AutoTestMode.AutoSpo2 : AutoTestMode.AutoHeartRate;
            client.enqueue(BleSDK.SetDeviceMeasurementWithType(mode, 0, false));
        }
        liveType = null;
        call.resolve();
    }

    @Override
    public void dataCallback(Map<String, Object> maps) {
        if (maps == null) return;
        String type = String.valueOf(maps.get(DeviceKey.DataType));
        long receivedAt = System.currentTimeMillis();
        String payload = new JSONObject(maps).toString();
        store.insert(prefs.getString(KEY_ADDRESS, "unknown"), type, receivedAt, payload);
        markCapabilities(payload);
        Object data = maps.get(DeviceKey.Data);
        if (BleConst.GetDeviceBatteryLevel.equals(type)) prefs.edit().putInt(KEY_BATTERY, intFrom(data, DeviceKey.BatteryLevel, -1)).apply();
        if (BleConst.GetDeviceVersion.equals(type)) prefs.edit().putString(KEY_VERSION, stringFrom(data, DeviceKey.DeviceVersion)).apply();
        if (BleConst.GetDeviceName.equals(type) || BleConst.CMD_Get_Name.equals(type)) prefs.edit().putString(KEY_NAME, stringFrom(data, DeviceKey.DeviceName)).apply();
        if (BleConst.GetDetailSleepData.equals(type) && sleepSyncActive) {
            sleepPacketCount++;
            main.removeCallbacks(sleepSyncTimeout);
            main.postDelayed(sleepSyncTimeout, 15000);
            boolean finished = Boolean.parseBoolean(String.valueOf(maps.get(DeviceKey.End)));
            if (finished) finishSleepSyncPhase(true);
            else if (sleepPacketCount % 50 == 0) {
                client.enqueue(BleSDK.GetDetailSleepDataWithMode((byte) 0x02, ""));
            }
        }
        if (BleConst.GetDeviceBatteryLevel.equals(type) || BleConst.GetDeviceVersion.equals(type) || BleConst.GetDeviceName.equals(type) || BleConst.CMD_Get_Name.equals(type)) {
            notifyListeners("deviceInfoChanged", deviceJson(), true);
        }
        if (liveType != null && (BleConst.MeasurementHrvCallback.equals(type) || BleConst.MeasurementHeartCallback.equals(type) || BleConst.MeasurementOxygenCallback.equals(type))) {
            JSObject event = new JSObject().put("type", liveType).put("timestamp", iso(receivedAt)).put("data", toJs(data));
            notifyListeners("liveMeasurement", event, true);
        }
    }

    @Override public void dataCallback(byte[] value) { emitDiagnostic("raw_data", value == null ? "0" : String.valueOf(value.length)); }

    private void probeDevice() {
        client.enqueue(BleSDK.GetDeviceBatteryLevel());
        client.enqueue(BleSDK.GetDeviceVersion());
        client.enqueue(BleSDK.GetDeviceName());
    }

    private JSObject deviceJson() {
        JSArray capabilities = new JSArray();
        for (String value : new String[]{"sleep", "activity", "heartRate", "hrv", "spo2", "temperature"}) if (prefs.getBoolean("cap_" + value, false)) capabilities.put(value);
        capabilities.put("liveMeasurement");
        long lastSync = prefs.getLong(KEY_LAST_SYNC, 0);
        return new JSObject().put("address", prefs.getString(KEY_ADDRESS, client.getAddress())).put("name", prefs.getString(KEY_NAME, client.getName()))
            .put("state", client.getState()).put("batteryLevel", prefs.getInt(KEY_BATTERY, -1)).put("firmwareVersion", prefs.getString(KEY_VERSION, null))
            .put("lastSync", lastSync == 0 ? null : iso(lastSync)).put("capabilities", capabilities);
    }

    private void finishScan(String error) {
        client.stopScan();
        PluginCall pending = scanCall; scanCall = null;
        if (pending == null) return;
        if (error != null) pending.reject(error);
        else { JSArray devices = new JSArray(); for (JSObject item : scanned.values()) devices.put(item); pending.resolve(new JSObject().put("devices", devices)); }
    }

    private boolean hasBluetoothPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) return getPermissionState("scan") == PermissionState.GRANTED && getPermissionState("connect") == PermissionState.GRANTED;
        return getPermissionState("location") == PermissionState.GRANTED;
    }
    private String permissionLabel() { return hasBluetoothPermissions() ? "granted" : "prompt"; }
    private static boolean isCompatibleName(String value) { String name = value.toLowerCase(Locale.ROOT); for (String candidate : X6_NAMES) if (name.contains(candidate)) return true; return false; }
    @SuppressLint("MissingPermission") private static String safeName(BluetoothDevice d) { String name = d.getName(); return name == null || name.trim().isEmpty() ? "BLE устройство" : name; }
    private static String formatDeviceDate(long time) { return new SimpleDateFormat("yyyy.MM.dd HH:mm:ss", Locale.US).format(new Date(time)); }
    private static String iso(long time) { SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US); f.setTimeZone(TimeZone.getDefault()); return f.format(new Date(time)); }
    private static JSObject toJs(Object value) { try { if (value instanceof Map) return JSObject.fromJSONObject(new JSONObject((Map<?, ?>) value)); return new JSObject().put("value", String.valueOf(value)); } catch (Exception e) { return new JSObject(); } }
    private static String stringFrom(Object data, String key) { if (data instanceof Map) { Object value = ((Map<?, ?>) data).get(key); return value == null ? null : String.valueOf(value); } return null; }
    private static int intFrom(Object data, String key, int fallback) { try { return Integer.parseInt(stringFrom(data, key)); } catch (Exception e) { return fallback; } }
    private void markCapabilities(String payload) { SharedPreferences.Editor e=prefs.edit(); if(payload.contains("arraySleepQuality"))e.putBoolean("cap_sleep",true); if(payload.contains("step")||payload.contains("distance")||payload.contains("calories"))e.putBoolean("cap_activity",true); if(payload.contains("heartRate")||payload.contains("onceHeartValue"))e.putBoolean("cap_heartRate",true); if(payload.contains("\"hrv\""))e.putBoolean("cap_hrv",true); if(payload.contains("Blood_oxygen"))e.putBoolean("cap_spo2",true); if(payload.contains("temperature"))e.putBoolean("cap_temperature",true); e.apply(); }
    private void emitDiagnostic(String code, String message) { notifyListeners("diagnostic", new JSObject().put("code", code).put("message", message), true); }

    @Override protected void handleOnDestroy() { if (client != null) client.close(); if (store != null) store.close(); }

    private static final class X6GattClient {
        interface Listener { void onState(String state, String message); void onData(byte[] data); }
        interface ScanListener { void onDevice(BluetoothDevice device, int rssi); void onError(int code); }
        private static final UUID SERVICE = UUID.fromString("0000fff0-0000-1000-8000-00805f9b34fb");
        private static final UUID WRITE = UUID.fromString("0000fff6-0000-1000-8000-00805f9b34fb");
        private static final UUID NOTIFY = UUID.fromString("0000fff7-0000-1000-8000-00805f9b34fb");
        private static final UUID CCCD = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");
        private final Context context; private final Listener listener; private final Handler main = new Handler(Looper.getMainLooper());
        private final BluetoothAdapter adapter; private final Queue<byte[]> writes = new ArrayDeque<>();
        private BluetoothGatt gatt; private BluetoothGattCharacteristic writeCharacteristic; private ScanCallback scanCallback;
        private boolean writing; private String state = "disconnected"; private String address; private String name;
        X6GattClient(Context context, Listener listener) { this.context = context.getApplicationContext(); this.listener = listener; BluetoothManager manager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE); adapter = manager == null ? null : manager.getAdapter(); }
        boolean isBluetoothEnabled() { return adapter != null && adapter.isEnabled(); } boolean isConnected() { return "connected".equals(state); }
        String getState() { return state; } String getAddress() { return address; } String getName() { return name == null ? "Ritual Ring" : name; }
        @SuppressLint("MissingPermission") void scan(ScanListener listener) {
            stopScan();
            scanCallback = new ScanCallback() {
                @Override public void onScanResult(int callbackType, ScanResult result) { listener.onDevice(result.getDevice(), result.getRssi()); }
                @Override public void onScanFailed(int errorCode) { listener.onError(errorCode); }
            };
            adapter.getBluetoothLeScanner().startScan(null, new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(), scanCallback);
        }
        @SuppressLint("MissingPermission") void stopScan() { if (adapter != null && adapter.getBluetoothLeScanner() != null && scanCallback != null) adapter.getBluetoothLeScanner().stopScan(scanCallback); scanCallback = null; }
        @SuppressLint("MissingPermission") void connect(String address, String name) {
            closeGatt(); this.address = address; this.name = name; setState("connecting", null);
            try { BluetoothDevice device = adapter.getRemoteDevice(address); gatt = Build.VERSION.SDK_INT >= 23 ? device.connectGatt(context, false, callback, BluetoothDevice.TRANSPORT_LE) : device.connectGatt(context, false, callback); }
            catch (Exception e) { setState("error", e.getMessage()); }
        }
        @SuppressLint("MissingPermission") void disconnect() { writes.clear(); writing = false; if (gatt != null) gatt.disconnect(); closeGatt(); setState("disconnected", null); }
        void close() { stopScan(); disconnect(); }
        void enqueue(byte[] command) { if (command == null) return; writes.offer(command); drain(); }
        @SuppressLint("MissingPermission") private void drain() {
            if (!isConnected() || writing || writeCharacteristic == null) return;
            byte[] next = writes.poll(); if (next == null) return; writing = true;
            if (Build.VERSION.SDK_INT >= 33) gatt.writeCharacteristic(writeCharacteristic, next, BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);
            else { writeCharacteristic.setValue(next); gatt.writeCharacteristic(writeCharacteristic); }
        }
        private final BluetoothGattCallback callback = new BluetoothGattCallback() {
            @SuppressLint("MissingPermission") @Override public void onConnectionStateChange(BluetoothGatt current, int status, int newState) {
                if (status == BluetoothGatt.GATT_SUCCESS && newState == BluetoothProfile.STATE_CONNECTED) { gatt = current; current.discoverServices(); }
                else if (newState == BluetoothProfile.STATE_DISCONNECTED || status != BluetoothGatt.GATT_SUCCESS) { closeGatt(); setState(status == 0 ? "disconnected" : "error", status == 133 ? "Android Bluetooth занят. Выключите и включите Bluetooth." : "GATT " + status); }
            }
            @SuppressLint("MissingPermission") @Override public void onServicesDiscovered(BluetoothGatt current, int status) {
                BluetoothGattService service = current.getService(SERVICE); if (status != BluetoothGatt.GATT_SUCCESS || service == null) { setState("error", "Устройство не поддерживает протокол Ritual Ring"); return; }
                writeCharacteristic = service.getCharacteristic(WRITE); BluetoothGattCharacteristic notify = service.getCharacteristic(NOTIFY);
                if (writeCharacteristic == null || notify == null) { setState("error", "Не найдены характеристики Ritual Ring"); return; }
                current.setCharacteristicNotification(notify, true); BluetoothGattDescriptor descriptor = notify.getDescriptor(CCCD);
                if (descriptor == null) { setState("error", "Кольцо не разрешило уведомления"); return; }
                if (Build.VERSION.SDK_INT >= 33) current.writeDescriptor(descriptor, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                else { descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE); current.writeDescriptor(descriptor); }
            }
            @Override public void onDescriptorWrite(BluetoothGatt g, BluetoothGattDescriptor d, int status) { if (status == BluetoothGatt.GATT_SUCCESS) { setState("connected", null); drain(); } else setState("error", "Не удалось включить поток данных"); }
            @Override public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic c) { listener.onData(c.getValue()); }
            @Override public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic c, byte[] value) { listener.onData(value); }
            @Override public void onCharacteristicWrite(BluetoothGatt g, BluetoothGattCharacteristic c, int status) { writing = false; main.postDelayed(() -> drain(), status == BluetoothGatt.GATT_SUCCESS ? 120 : 500); }
        };
        private void setState(String value, String message) { state = value; main.post(() -> listener.onState(value, message)); }
        @SuppressLint("MissingPermission") private void closeGatt() { if (gatt != null) { try { gatt.close(); } catch (Exception ignored) {} } gatt = null; writeCharacteristic = null; writing = false; }
    }

    private static final class RingStore extends SQLiteOpenHelper {
        RingStore(Context context) { super(context, "ritual_x6_ring.db", null, 1); }
        @Override public void onCreate(SQLiteDatabase db) { db.execSQL("CREATE TABLE ring_records (id INTEGER PRIMARY KEY AUTOINCREMENT, device TEXT NOT NULL, type TEXT NOT NULL, received_at INTEGER NOT NULL, payload TEXT NOT NULL, UNIQUE(device,type,payload) ON CONFLICT IGNORE)"); db.execSQL("CREATE INDEX ring_records_time ON ring_records(received_at)"); }
        @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {}
        void insert(String device, String type, long receivedAt, String payload) { ContentValues v = new ContentValues(); v.put("device", device); v.put("type", type); v.put("received_at", receivedAt); v.put("payload", payload); getWritableDatabase().insertWithOnConflict("ring_records", null, v, SQLiteDatabase.CONFLICT_IGNORE); }
        int countSince(long from) { try (Cursor c = getReadableDatabase().rawQuery("SELECT COUNT(*) FROM ring_records WHERE received_at>=?", new String[]{String.valueOf(from)})) { return c.moveToFirst() ? c.getInt(0) : 0; } }
        JSObject summary(String date, SharedPreferences prefs) {
            Summary s = new Summary(date);
            String dottedDate = "%" + date.replace('-', '.') + "%";
            String dashedDate = "%" + date + "%";
            long dayStart;
            try { dayStart = new SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(date).getTime(); } catch (Exception ignored) { dayStart = System.currentTimeMillis() - 86400000L; }
            long dayEnd = dayStart + 86400000L;
            try (Cursor c = getReadableDatabase().rawQuery("SELECT payload,received_at FROM ring_records WHERE payload LIKE ? OR payload LIKE ? OR received_at BETWEEN ? AND ? ORDER BY received_at", new String[]{dottedDate, dashedDate, String.valueOf(dayStart), String.valueOf(dayEnd)})) {
                while (c.moveToNext()) s.accept(c.getString(0), c.getLong(1));
            }
            long last = prefs.getLong(KEY_LAST_SYNC, 0);
            return new JSObject().put("date", date).put("steps", s.steps).put("distance", s.distance).put("calories", s.calories).put("activeMinutes", s.activeMinutes)
                .put("sleepHours", s.sleepMinutes == 0 ? null : s.sleepMinutes / 60.0).put("restingHR", s.hrAverage()).put("heartRateMin", s.hrMin == 999 ? null : s.hrMin)
                .put("heartRateMax", s.hrMax == 0 ? null : s.hrMax).put("hrv", s.average(s.hrvTotal, s.hrvCount)).put("spo2", s.average(s.spo2Total, s.spo2Count))
                .put("spo2Min", s.spo2Min == 999 ? null : s.spo2Min).put("spo2Max", s.spo2Max == 0 ? null : s.spo2Max)
                .put("temperature", s.average(s.tempTotal, s.tempCount)).put("temperatureMin", s.tempMin == Double.MAX_VALUE ? null : s.round(s.tempMin)).put("temperatureMax", s.tempMax == -Double.MAX_VALUE ? null : s.round(s.tempMax))
                .put("sleepStart", s.sleepStart == Long.MAX_VALUE ? null : iso(s.sleepStart)).put("sleepEnd", s.sleepEnd == 0 ? null : iso(s.sleepEnd))
                .put("sleepStages", s.sleepStageJson()).put("sleepIntervals", s.sleepIntervals).put("workouts", s.workouts)
                .put("batteryLevel", prefs.getInt(KEY_BATTERY, -1)).put("lastSync", last == 0 ? null : iso(last));
        }
        JSArray series(String type, long from, long to, String aggregation) {
            JSArray result = new JSArray(); String key = "heartRate".equals(type) ? "heartRate" : "spo2".equals(type) ? "Blood_oxygen" : "temperature".equals(type) ? "temperature" : "activity".equals(type) ? "step" : "sleep".equals(type) ? "sleepLength" : "hrv";
            long bucketSize = "day".equals(aggregation) ? 86400000L : "hour".equals(aggregation) ? 3600000L : 0L;
            Map<Long,double[]> buckets = new LinkedHashMap<>();
            try (Cursor c = getReadableDatabase().rawQuery("SELECT payload,received_at FROM ring_records WHERE received_at BETWEEN ? AND ? ORDER BY received_at", new String[]{String.valueOf(from), String.valueOf(to)})) {
                while (c.moveToNext()) { String payload=c.getString(0); Double value = findNumber(payload, key); if (value == null || value <= 0) continue; long timestamp=parsePayloadTime(payload,c.getLong(1)); if(timestamp<from||timestamp>to)continue; if(bucketSize==0)result.put(point(timestamp,value));else{long bucket=timestamp/bucketSize*bucketSize;double[] stat=buckets.get(bucket);if(stat==null){stat=new double[]{0,0};buckets.put(bucket,stat);}stat[0]+=value;stat[1]++;} }
            } if(bucketSize>0)for(Map.Entry<Long,double[]> entry:buckets.entrySet())result.put(point(entry.getKey(),Math.round(entry.getValue()[0]/entry.getValue()[1]*10.0)/10.0)); return result;
        }
        private static JSObject point(long timestamp,double value){return new JSObject().put("timestamp",iso(timestamp)).put("value",value).put("quality","device").put("source","ring:ritual");}
        private static long parsePayloadTime(String json,long fallback){try{String value=findString(new JSONObject(json),"date");if(value==null)return fallback;for(String pattern:new String[]{"yyyy.MM.dd HH:mm:ss","yyyy-MM-dd HH:mm:ss","yyyy.MM.dd HH:mm","yyyy-MM-dd HH:mm","yyyy-MM-dd"})try{return new SimpleDateFormat(pattern,Locale.US).parse(value.replace('T',' ')).getTime();}catch(Exception ignored){}}catch(Exception ignored){}return fallback;}
        private static String findString(Object value,String key)throws Exception{if(value instanceof JSONObject){JSONObject o=(JSONObject)value;if(o.has(key))return String.valueOf(o.get(key));for(String k:iterable(o.keys())){String found=findString(o.get(k),key);if(found!=null)return found;}}if(value instanceof JSONArray){JSONArray a=(JSONArray)value;for(int i=0;i<a.length();i++){String found=findString(a.get(i),key);if(found!=null)return found;}}return null;}
        private static Double findNumber(String json, String key) { try { return findNumber(new JSONObject(json), key); } catch (Exception e) { return null; } }
        private static Double findNumber(Object value, String key) throws Exception {
            if (value instanceof JSONObject) { JSONObject o = (JSONObject) value; if (o.has(key)) { try { return Double.parseDouble(String.valueOf(o.get(key))); } catch (Exception ignored) {} } for (String k : iterable(o.keys())) { Double found = findNumber(o.get(k), key); if (found != null) return found; } }
            if (value instanceof JSONArray) { JSONArray a = (JSONArray) value; for (int i=0;i<a.length();i++) { Double found = findNumber(a.get(i), key); if (found != null) return found; } }
            return null;
        }
        private static <T> Iterable<T> iterable(java.util.Iterator<T> iterator) { return () -> iterator; }
        private static final class Summary {
            final String targetDate;
            int steps, activeMinutes, sleepMinutes, hrMin=999, hrMax, hrCount, spo2Min=999, spo2Max;
            int awakeMinutes, lightMinutes, deepMinutes, remMinutes, unknownMinutes;
            double distance, calories, hrTotal, hrvTotal, spo2Total, tempTotal, tempMin=Double.MAX_VALUE, tempMax=-Double.MAX_VALUE;
            int hrvCount, spo2Count, tempCount; long sleepStart=Long.MAX_VALUE, sleepEnd;
            final JSArray sleepIntervals = new JSArray(); final JSArray workouts = new JSArray();
            Summary(String targetDate) { this.targetDate = targetDate; }
            void accept(String json, long receivedAt) { try { walk(new JSONObject(json)); } catch (Exception ignored) {} }
            void walk(Object value) throws Exception {
                if (value instanceof JSONObject) { JSONObject o=(JSONObject)value; if (o.has("date")) { String itemDate=String.valueOf(o.opt("date")).replace('.','-'); if (!itemDate.startsWith(targetDate)) return; } add(o,"step",0); add(o,"distance",1); add(o,"calories",2); add(o,"heartRate",3); add(o,"hrv",4); add(o,"Blood_oxygen",5); add(o,"temperature",6); if (o.has("arraySleepQuality")) parseSleep(o); if (o.has("sportModel")) parseWorkout(o); for(String k:iterable(o.keys())) walk(o.get(k)); }
                else if(value instanceof JSONArray){JSONArray a=(JSONArray)value;for(int i=0;i<a.length();i++)walk(a.get(i));}
            }
            void add(JSONObject o,String key,int kind){ if(!o.has(key))return; try{double v=Double.parseDouble(String.valueOf(o.get(key))); if(v<=0)return; switch(kind){case 0:steps=Math.max(steps,(int)v);break;case 1:distance=Math.max(distance,v);break;case 2:calories=Math.max(calories,v);break;case 3:hrTotal+=v;hrCount++;hrMin=Math.min(hrMin,(int)v);hrMax=Math.max(hrMax,(int)v);break;case 4:hrvTotal+=v;hrvCount++;break;case 5:spo2Total+=v;spo2Count++;spo2Min=Math.min(spo2Min,(int)v);spo2Max=Math.max(spo2Max,(int)v);break;case 6:tempTotal+=v;tempCount++;tempMin=Math.min(tempMin,v);tempMax=Math.max(tempMax,v);break;}}catch(Exception ignored){} }
            void parseSleep(JSONObject o) { try { int unit=Math.max(1,o.optInt("sleepUnitLength",5)); String raw=String.valueOf(o.get("arraySleepQuality")); long cursor=parseTime(o.optString("date", targetDate+" 00:00:00")); String normalized=raw.replace("[","").replace("]","").trim(); if(normalized.isEmpty())return; for(String part:normalized.split("[,\\s]+")){ int code;try{code=Integer.parseInt(part.trim());}catch(Exception e){continue;} String stage=code==0?"awake":code==1?"light":code==2?"deep":code==3?"rem":"unknown"; int minutes=unit; if(code==0)awakeMinutes+=minutes;else{sleepMinutes+=minutes;if(code==1)lightMinutes+=minutes;else if(code==2)deepMinutes+=minutes;else if(code==3)remMinutes+=minutes;else unknownMinutes+=minutes;} long end=cursor+minutes*60000L; sleepStart=Math.min(sleepStart,cursor);sleepEnd=Math.max(sleepEnd,end);sleepIntervals.put(new JSObject().put("start",iso(cursor)).put("end",iso(end)).put("stage",stage));cursor=end;} } catch(Exception ignored){} }
            void parseWorkout(JSONObject o) { try { workouts.put(new JSObject().put("start",iso(parseTime(o.optString("date",targetDate+" 00:00:00")))).put("type",o.optString("sportModel","activity")).put("durationMinutes",o.optInt("activeMinutes",o.optInt("sportTime",0))).put("calories",o.has("calories")?o.optDouble("calories"):null).put("heartRate",o.has("heartRate")?o.optDouble("heartRate"):null)); } catch(Exception ignored){} }
            long parseTime(String value) { for(String pattern:new String[]{"yyyy.MM.dd HH:mm:ss","yyyy-MM-dd HH:mm:ss","yyyy.MM.dd HH:mm","yyyy-MM-dd HH:mm","yyyy-MM-dd"})try{return new SimpleDateFormat(pattern,Locale.US).parse(value.replace('T',' ')).getTime();}catch(Exception ignored){}return System.currentTimeMillis(); }
            JSArray sleepStageJson(){JSArray result=new JSArray();result.put(new JSObject().put("stage","awake").put("minutes",awakeMinutes));result.put(new JSObject().put("stage","light").put("minutes",lightMinutes));result.put(new JSObject().put("stage","deep").put("minutes",deepMinutes));result.put(new JSObject().put("stage","rem").put("minutes",remMinutes));result.put(new JSObject().put("stage","unknown").put("minutes",unknownMinutes));return result;}
            Double round(double value){return Math.round(value*10.0)/10.0;} Double average(double total,int count){return count==0?null:round(total/count);} Double hrAverage(){return average(hrTotal,hrCount);}
        }
    }
}
