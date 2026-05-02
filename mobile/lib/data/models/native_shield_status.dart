class NativeShieldStatus {
  const NativeShieldStatus({
    required this.notificationAccessGranted,
    required this.batteryOptimizationIgnored,
    required this.postNotificationsGranted,
    required this.serviceReady,
  });

  final bool notificationAccessGranted;
  final bool batteryOptimizationIgnored;
  final bool postNotificationsGranted;
  final bool serviceReady;

  factory NativeShieldStatus.fromJson(Map<Object?, Object?> json) {
    return NativeShieldStatus(
      notificationAccessGranted: json['notification_access_granted'] == true,
      batteryOptimizationIgnored: json['battery_optimization_ignored'] == true,
      postNotificationsGranted: json['post_notifications_granted'] == true,
      serviceReady: json['service_ready'] == true,
    );
  }
}
