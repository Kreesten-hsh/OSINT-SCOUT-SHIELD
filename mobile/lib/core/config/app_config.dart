class AppConfig {
  const AppConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    'BCS_API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8000/api/v1',
  );

  static String get citizenPortalUrl {
    const String explicitPortalUrl = String.fromEnvironment(
      'BCS_CITIZEN_PORTAL_URL',
      defaultValue: '',
    );
    if (explicitPortalUrl.isNotEmpty) {
      return explicitPortalUrl;
    }

    final Uri apiUri = Uri.parse(apiBaseUrl);
    final int resolvedPort = apiUri.hasPort && apiUri.port == 8000 ? 5173 : apiUri.port;
    return apiUri.replace(
      port: resolvedPort,
      path: '/verify',
      query: null,
      fragment: null,
    ).toString();
  }

  static const String minSupportedVersion = '1.0.0';
}
