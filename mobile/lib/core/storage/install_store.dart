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

  Future<void> clearLocalData() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.remove(_onboardingCompletedKey);
    await prefs.remove(_historyCacheKey);
    await _secureStorage.delete(key: _deviceInstallIdKey);
  }
}
