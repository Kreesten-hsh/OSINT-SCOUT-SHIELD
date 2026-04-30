class ReportResult {
  const ReportResult({
    required this.alertUuid,
    required this.status,
    required this.riskScoreInitial,
    required this.queuedForOsint,
    required this.reportUuid,
    required this.publicReference,
  });

  final String? alertUuid;
  final String status;
  final int riskScoreInitial;
  final bool queuedForOsint;
  final String? reportUuid;
  final String? publicReference;

  factory ReportResult.fromJson(Map<String, dynamic> json) {
    return ReportResult(
      alertUuid: json['alert_uuid']?.toString(),
      status: json['status']?.toString() ?? 'NEW',
      riskScoreInitial: (json['risk_score_initial'] as num?)?.toInt() ?? 0,
      queuedForOsint: json['queued_for_osint'] == true,
      reportUuid: json['report_uuid']?.toString(),
      publicReference: json['public_reference']?.toString(),
    );
  }
}
