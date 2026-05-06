import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class InstallStore {
  InstallStore({
    FlutterSecureStorage? secureStorage,
  }) : _secureStorage = secureStorage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _secureStorage;

  static const String _deviceInstallIdKey = 'device_install_id';
  static const String _onboardingCompletedKey = 'onboarding_completed';
  static const String _historyCacheKey = 'history_cache_v1';
  static const String _lightModeEnabledKey = 'light_mode_enabled';
  static const String _lastMonitorSmsKey = 'last_monitor_sms';
  static const String _lastMonitorWhatsappKey = 'last_monitor_whatsapp';
  static const String _lastMonitorMessengerKey = 'last_monitor_messenger';

  Future<String?> readDeviceInstallId() {
    return _secureStorage.read(key: _deviceInstallIdKey);
  }

  Future<void> writeDeviceInstallId(String value) {
    return _secureStorage.write(key: _deviceInstallIdKey, value: value);
  }

  Future<bool> isOnboardingCompleted() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_onboardingCompletedKey) ?? false;
  }

  Future<void> setOnboardingCompleted(bool value) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_onboardingCompletedKey, value);
  }

  Future<void> cacheHistoryJson(String value) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString(_historyCacheKey, value);
  }

  Future<String?> readHistoryCacheJson() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    return prefs.getString(_historyCacheKey);
  }

  Future<bool> isLightModeEnabled() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_lightModeEnabledKey) ?? false;
  }

  Future<void> setLightModeEnabled(bool value) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_lightModeEnabledKey, value);
  }

  Future<void> writeLastActiveMonitoringSelection({
    required bool monitorSms,
    required bool monitorWhatsapp,
    required bool monitorMessenger,
  }) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_lastMonitorSmsKey, monitorSms);
    await prefs.setBool(_lastMonitorWhatsappKey, monitorWhatsapp);
    await prefs.setBool(_lastMonitorMessengerKey, monitorMessenger);
  }

  Future<({bool sms, bool whatsapp, bool messenger})?> readLastActiveMonitoringSelection() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    if (!prefs.containsKey(_lastMonitorSmsKey) ||
        !prefs.containsKey(_lastMonitorWhatsappKey) ||
        !prefs.containsKey(_lastMonitorMessengerKey)) {
      return null;
    }
    return (
      sms: prefs.getBool(_lastMonitorSmsKey) ?? true,
      whatsapp: prefs.getBool(_lastMonitorWhatsappKey) ?? true,
      messenger: prefs.getBool(_lastMonitorMessengerKey) ?? true,
    );
  }

  Future<void> clearLocalData() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.remove(_onboardingCompletedKey);
    await prefs.remove(_historyCacheKey);
    await prefs.remove(_lightModeEnabledKey);
    await prefs.remove(_lastMonitorSmsKey);
    await prefs.remove(_lastMonitorWhatsappKey);
    await prefs.remove(_lastMonitorMessengerKey);
    await _secureStorage.delete(key: _deviceInstallIdKey);
  }
}
