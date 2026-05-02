class MobileShieldSettings {
  const MobileShieldSettings({
    this.monitorSms = true,
    this.monitorWhatsapp = true,
    this.monitorMessenger = true,
    this.alertThreshold = 70,
    this.alertMedium = true,
  });

  final bool monitorSms;
  final bool monitorWhatsapp;
  final bool monitorMessenger;
  final int alertThreshold;
  final bool alertMedium;

  bool get hasActiveMonitoring => monitorSms || monitorWhatsapp || monitorMessenger;

  int get activeChannelCount =>
      <bool>[monitorSms, monitorWhatsapp, monitorMessenger].where((bool item) => item).length;

  MobileShieldSettings copyWith({
    bool? monitorSms,
    bool? monitorWhatsapp,
    bool? monitorMessenger,
    int? alertThreshold,
    bool? alertMedium,
  }) {
    return MobileShieldSettings(
      monitorSms: monitorSms ?? this.monitorSms,
      monitorWhatsapp: monitorWhatsapp ?? this.monitorWhatsapp,
      monitorMessenger: monitorMessenger ?? this.monitorMessenger,
      alertThreshold: alertThreshold ?? this.alertThreshold,
      alertMedium: alertMedium ?? this.alertMedium,
    );
  }
}
