class BootstrapData {
  const BootstrapData({
    required this.departments,
    required this.minimumSupportedVersion,
  });

  final List<String> departments;
  final String minimumSupportedVersion;

  factory BootstrapData.fromJson(Map<String, dynamic> json) {
    return BootstrapData(
      departments: (json['departments'] as List<dynamic>? ?? const <dynamic>[])
          .map((dynamic item) => item.toString())
          .toList(growable: false),
      minimumSupportedVersion: json['minimum_supported_version']?.toString() ?? '1.0.0',
    );
  }
}
