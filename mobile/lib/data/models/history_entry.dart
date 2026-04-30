enum HistoryEntryType { verify, report }

class HistoryEntry {
  const HistoryEntry({
    required this.type,
    required this.createdAt,
    required this.riskScore,
    required this.riskLevel,
    required this.maskedPhone,
    this.primaryCategory,
    this.publicReference,
    this.status,
  });

  final HistoryEntryType type;
  final DateTime createdAt;
  final int riskScore;
  final String riskLevel;
  final String maskedPhone;
  final String? primaryCategory;
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
      'public_reference': publicReference,
      'status': status,
    };
  }
}
