import 'package:flutter/services.dart';

import '../../data/models/history_entry.dart';
import '../../data/models/mobile_shield_settings.dart';
import '../../data/models/native_shield_status.dart';

class NativeShieldBridge {
  const NativeShieldBridge();

  static const MethodChannel _channel = MethodChannel('bcs/native_shield');

  Future<NativeShieldStatus> getShieldStatus() async {
    final Map<Object?, Object?> raw =
        await _channel.invokeMapMethod<Object?, Object?>('getShieldStatus') ?? const <Object?, Object?>{};
    return NativeShieldStatus.fromJson(raw);
  }

  Future<MobileShieldSettings> getShieldSettings() async {
    final Map<Object?, Object?> raw =
        await _channel.invokeMapMethod<Object?, Object?>('getShieldSettings') ?? const <Object?, Object?>{};
    return MobileShieldSettings(
      monitorSms: raw['monitor_sms'] != false,
      monitorWhatsapp: raw['monitor_whatsapp'] != false,
      monitorMessenger: raw['monitor_messenger'] != false,
      alertThreshold: (raw['alert_threshold'] as num?)?.toInt() ?? 70,
      alertMedium: raw['alert_medium'] != false,
    );
  }

  Future<MobileShieldSettings> syncShieldSettings({
    required MobileShieldSettings settings,
    required String deviceInstallId,
    required String apiBaseUrl,
    required String citizenPortalUrl,
  }) async {
    final Map<Object?, Object?> raw = await _channel.invokeMapMethod<Object?, Object?>(
          'syncShieldSettings',
          <String, Object?>{
            'monitor_sms': settings.monitorSms,
            'monitor_whatsapp': settings.monitorWhatsapp,
            'monitor_messenger': settings.monitorMessenger,
            'alert_threshold': settings.alertThreshold,
            'alert_medium': settings.alertMedium,
            'device_install_id': deviceInstallId,
            'api_base_url': apiBaseUrl,
            'citizen_portal_url': citizenPortalUrl,
          },
        ) ??
        const <Object?, Object?>{};
    return MobileShieldSettings(
      monitorSms: raw['monitor_sms'] != false,
      monitorWhatsapp: raw['monitor_whatsapp'] != false,
      monitorMessenger: raw['monitor_messenger'] != false,
      alertThreshold: (raw['alert_threshold'] as num?)?.toInt() ?? settings.alertThreshold,
      alertMedium: raw['alert_medium'] != false,
    );
  }

  Future<List<HistoryEntry>> fetchLocalHistory({int limit = 60}) async {
    final List<Object?> raw = await _channel.invokeListMethod<Object?>(
          'fetchLocalHistory',
          <String, Object?>{'limit': limit},
        ) ??
        const <Object?>[];
    return raw
        .whereType<Map<Object?, Object?>>()
        .map(
          (Map<Object?, Object?> item) => HistoryEntry.fromJson(
            item.map((Object? key, Object? value) => MapEntry(key.toString(), value)),
          ),
        )
        .toList(growable: false);
  }

  Future<String?> consumePendingOpenSurface() {
    return _channel.invokeMethod<String>('consumePendingOpenSurface');
  }

  Future<int> flushPendingQueue() async {
    final int? pending = await _channel.invokeMethod<int>('flushPendingQueue');
    return pending ?? 0;
  }

  Future<void> openNotificationAccessSettings() {
    return _channel.invokeMethod<void>('openNotificationAccessSettings');
  }

  Future<void> requestIgnoreBatteryOptimizations() {
    return _channel.invokeMethod<void>('requestIgnoreBatteryOptimizations');
  }

  Future<bool> requestPostNotificationsPermission() async {
    final bool? granted = await _channel.invokeMethod<bool>('requestPostNotificationsPermission');
    return granted == true;
  }
}
