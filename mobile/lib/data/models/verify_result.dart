String _normalizeRiskLevel(String? value) {
  return switch ((value ?? '').trim().toUpperCase()) {
    'HIGH' || 'FORT' => 'FORT',
    'MEDIUM' || 'MOYEN' => 'MOYEN',
    _ => 'FAIBLE',
  };
}

class HighlightedSpan {
  const HighlightedSpan({
    required this.start,
    required this.end,
    required this.rule,
    required this.label,
    required this.color,
  });

  final int start;
  final int end;
  final String rule;
  final String label;
  final String color;

  factory HighlightedSpan.fromJson(Map<String, dynamic> json) {
    return HighlightedSpan(
      start: (json['start'] as num?)?.toInt() ?? 0,
      end: (json['end'] as num?)?.toInt() ?? 0,
      rule: json['rule']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      color: json['color']?.toString() ?? 'amber',
    );
  }
}

class VerifyResult {
  const VerifyResult({
    required this.riskScore,
    required this.riskLevel,
    required this.explanation,
    required this.shouldReport,
    required this.matchedRules,
    required this.categoriesDetected,
    required this.recurrenceCount,
    required this.highlightedSpans,
    required this.recommendations,
    required this.citizenAdvice,
    required this.resolvedDepartment,
    required this.departmentSource,
    this.fonAlert,
    this.verificationMessageUuid,
    this.verificationAnalysisUuid,
  });

  final int riskScore;
  final String riskLevel;
  final List<String> explanation;
  final bool shouldReport;
  final List<String> matchedRules;
  final List<String> categoriesDetected;
  final int recurrenceCount;
  final List<HighlightedSpan> highlightedSpans;
  final List<String> recommendations;
  final List<String> citizenAdvice;
  final String? fonAlert;
  final String? resolvedDepartment;
  final String departmentSource;
  final String? verificationMessageUuid;
  final String? verificationAnalysisUuid;

  factory VerifyResult.fromJson(Map<String, dynamic> json) {
    return VerifyResult(
      riskScore: (json['risk_score'] as num?)?.toInt() ?? 0,
      riskLevel: _normalizeRiskLevel(json['risk_level']?.toString()),
      explanation: (json['explanation'] as List<dynamic>? ?? const <dynamic>[])
          .map((dynamic item) => item.toString())
          .toList(growable: false),
      shouldReport: json['should_report'] == true,
      matchedRules: (json['matched_rules'] as List<dynamic>? ?? const <dynamic>[])
          .map((dynamic item) => item.toString())
          .toList(growable: false),
      categoriesDetected: (json['categories_detected'] as List<dynamic>? ?? const <dynamic>[])
          .map((dynamic item) => item.toString())
          .toList(growable: false),
      recurrenceCount: (json['recurrence_count'] as num?)?.toInt() ?? 0,
      highlightedSpans: (json['highlighted_spans'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .map(HighlightedSpan.fromJson)
          .toList(growable: false),
      recommendations: (json['recommendations'] as List<dynamic>? ?? const <dynamic>[])
          .map((dynamic item) => item.toString())
          .toList(growable: false),
      citizenAdvice: (json['citizen_advice'] as List<dynamic>? ?? const <dynamic>[])
          .map((dynamic item) => item.toString())
          .toList(growable: false),
      fonAlert: json['fon_alert']?.toString(),
      resolvedDepartment: json['resolved_department']?.toString(),
      departmentSource: json['department_source']?.toString() ?? 'UNKNOWN',
      verificationMessageUuid: json['verification_message_uuid']?.toString(),
      verificationAnalysisUuid: json['verification_analysis_uuid']?.toString(),
    );
  }
}
