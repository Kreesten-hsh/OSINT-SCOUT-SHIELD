enum HistoryEntryType { verify, report }

class HistoryHighlightedSpan {
  const HistoryHighlightedSpan({
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

  factory HistoryHighlightedSpan.fromJson(Map<String, dynamic> json) {
    return HistoryHighlightedSpan(
      start: (json['start'] as num?)?.toInt() ?? 0,
      end: (json['end'] as num?)?.toInt() ?? 0,
      rule: json['rule']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      color: json['color']?.toString() ?? 'orange',
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'start': start,
      'end': end,
      'rule': rule,
      'label': label,
      'color': color,
    };
  }
}

class HistoryEntry {
  const HistoryEntry({
    required this.type,
    required this.createdAt,
    required this.riskScore,
    required this.riskLevel,
    required this.maskedPhone,
    this.primaryCategory,
    this.messagePreview,
    this.messageBody,
    this.categoriesDetected = const <String>[],
    this.matchedRules = const <String>[],
    this.explanation = const <String>[],
    this.recommendations = const <String>[],
    this.highlightedSpans = const <HistoryHighlightedSpan>[],
    this.fonAlert,
    this.publicReference,
    this.status,
  });

  final HistoryEntryType type;
  final DateTime createdAt;
  final int riskScore;
  final String riskLevel;
  final String maskedPhone;
  final String? primaryCategory;
  final String? messagePreview;
  final String? messageBody;
  final List<String> categoriesDetected;
  final List<String> matchedRules;
  final List<String> explanation;
  final List<String> recommendations;
  final List<HistoryHighlightedSpan> highlightedSpans;
  final String? fonAlert;
  final String? publicReference;
  final String? status;

  factory HistoryEntry.fromJson(Map<String, dynamic> json) {
    return HistoryEntry(
      type: json['type'] == 'REPORT' ? HistoryEntryType.report : HistoryEntryType.verify,
      createdAt: DateTime.parse(json['created_at'].toString()),
      riskScore: (json['risk_score'] as num?)?.toInt() ?? 0,
      riskLevel: json['risk_level']?.toString() ?? 'LOW',
      maskedPhone: json['masked_phone']?.toString() ?? '-',
      primaryCategory: json['primary_category']?.toString(),
      messagePreview: json['message_preview']?.toString(),
      messageBody: json['message_body']?.toString(),
      categoriesDetected: (json['categories_detected'] as List<dynamic>? ?? const <dynamic>[])
          .map((dynamic value) => value.toString())
          .where((String value) => value.isNotEmpty)
          .toList(growable: false),
      matchedRules: (json['matched_rules'] as List<dynamic>? ?? const <dynamic>[])
          .map((dynamic value) => value.toString())
          .where((String value) => value.isNotEmpty)
          .toList(growable: false),
      explanation: (json['explanation'] as List<dynamic>? ?? const <dynamic>[])
          .map((dynamic value) => value.toString())
          .where((String value) => value.isNotEmpty)
          .toList(growable: false),
      recommendations: (json['recommendations'] as List<dynamic>? ?? const <dynamic>[])
          .map((dynamic value) => value.toString())
          .where((String value) => value.isNotEmpty)
          .toList(growable: false),
      highlightedSpans: (json['highlighted_spans'] as List<dynamic>? ?? const <dynamic>[])
          .map((dynamic value) {
            if (value is Map<String, dynamic>) {
              return value;
            }
            if (value is Map<Object?, Object?>) {
              return value.map(
                (Object? key, Object? nestedValue) => MapEntry(key.toString(), nestedValue),
              );
            }
            return const <String, dynamic>{};
          })
          .where((Map<String, dynamic> value) => value.isNotEmpty)
          .map(HistoryHighlightedSpan.fromJson)
          .toList(growable: false),
      fonAlert: json['fon_alert']?.toString(),
      publicReference: json['public_reference']?.toString(),
      status: json['status']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'type': type == HistoryEntryType.report ? 'REPORT' : 'VERIFY',
      'created_at': createdAt.toIso8601String(),
      'risk_score': riskScore,
      'risk_level': riskLevel,
      'masked_phone': maskedPhone,
      'primary_category': primaryCategory,
      'message_preview': messagePreview,
      'message_body': messageBody,
      'categories_detected': categoriesDetected,
      'matched_rules': matchedRules,
      'explanation': explanation,
      'recommendations': recommendations,
      'highlighted_spans': highlightedSpans
          .map((HistoryHighlightedSpan span) => span.toJson())
          .toList(growable: false),
      'fon_alert': fonAlert,
      'public_reference': publicReference,
      'status': status,
    };
  }
}
