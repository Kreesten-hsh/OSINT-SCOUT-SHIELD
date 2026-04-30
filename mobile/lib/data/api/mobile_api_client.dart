import 'dart:convert';

import 'package:dio/dio.dart';

import '../../core/config/app_config.dart';
import '../models/bootstrap_data.dart';
import '../models/history_entry.dart';
import '../models/report_result.dart';
import '../models/verify_result.dart';

class MobileApiClient {
  MobileApiClient([Dio? dio])
      : _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: AppConfig.apiBaseUrl,
                connectTimeout: const Duration(seconds: 15),
                receiveTimeout: const Duration(seconds: 20),
                sendTimeout: const Duration(seconds: 20),
                headers: const <String, String>{'Accept': 'application/json'},
              ),
            );

  final Dio _dio;

  Future<BootstrapData> fetchBootstrap() async {
    final Response<Map<String, dynamic>> response =
        await _dio.get<Map<String, dynamic>>('/mobile/bootstrap');
    return BootstrapData.fromJson(_extractData(response.data));
  }

  Future<VerifyResult> verify({
    required String message,
    required String phone,
    required String deviceInstallId,
    String? department,
    String? url,
  }) async {
    final Response<Map<String, dynamic>> response =
        await _dio.post<Map<String, dynamic>>(
      '/analysis/verify',
      data: <String, dynamic>{
        'message': message,
        'phone': phone,
        'channel': 'MOBILE_APP',
        'department': department,
        'url': url,
        'device_install_id': deviceInstallId,
      },
    );
    return VerifyResult.fromJson(_extractData(response.data));
  }

  Future<ReportResult> submitReport({
    required String message,
    required String phone,
    required String deviceInstallId,
    required VerifyResult verification,
    List<MultipartFile> screenshots = const <MultipartFile>[],
    String? department,
    String? url,
  }) async {
    final FormData formData = FormData.fromMap(<String, dynamic>{
      'message': message,
      'phone': phone,
      'channel': 'MOBILE_APP',
      'department': department,
      'url': url,
      'device_install_id': deviceInstallId,
      'verification_message_uuid': verification.verificationMessageUuid,
      'verification_analysis_uuid': verification.verificationAnalysisUuid,
      'verification': jsonEncode(<String, dynamic>{
        'risk_score': verification.riskScore,
        'risk_level': verification.riskLevel,
        'should_report': verification.shouldReport,
        'matched_rules': verification.matchedRules,
        'categories_detected': verification.categoriesDetected,
      }),
      if (screenshots.isNotEmpty) 'screenshots': screenshots,
    });

    final Response<Map<String, dynamic>> response =
        await _dio.post<Map<String, dynamic>>(
      '/signalements/with-media',
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );
    return ReportResult.fromJson(_extractData(response.data));
  }

  Future<List<HistoryEntry>> fetchHistory({
    required String deviceInstallId,
  }) async {
    final Response<Map<String, dynamic>> response =
        await _dio.get<Map<String, dynamic>>(
      '/mobile/history',
      queryParameters: <String, dynamic>{
        'device_install_id': deviceInstallId,
      },
    );
    final Map<String, dynamic> data = _extractData(response.data);
    final List<dynamic> items = data['items'] as List<dynamic>? ?? const <dynamic>[];
    return items
        .whereType<Map<String, dynamic>>()
        .map(HistoryEntry.fromJson)
        .toList(growable: false);
  }

  static Map<String, dynamic> _extractData(Map<String, dynamic>? responseData) {
    final Map<String, dynamic> payload = responseData ?? const <String, dynamic>{};
    final Object? data = payload['data'];
    if (data is Map<String, dynamic>) {
      return data;
    }
    return const <String, dynamic>{};
  }
}
