import 'dart:convert';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/constants/benin_departments.dart';
import '../core/storage/install_store.dart';
import '../data/api/mobile_api_client.dart';
import '../data/models/bootstrap_data.dart';
import '../data/models/history_entry.dart';
import '../data/models/report_result.dart';
import '../data/models/verify_result.dart';

final installStoreProvider = Provider<InstallStore>((Ref ref) {
  return InstallStore();
});

final apiClientProvider = Provider<MobileApiClient>((Ref ref) {
  return MobileApiClient();
});

final deviceInstallIdProvider = FutureProvider<String>((Ref ref) async {
  final InstallStore store = ref.watch(installStoreProvider);
  final String? existing = await store.readDeviceInstallId();
  if (existing != null && existing.isNotEmpty) {
    return existing;
  }
  final Random random = Random.secure();
  final String created = List<String>.generate(
    4,
    (_) => random.nextInt(0xFFFFFF).toRadixString(16).padLeft(6, '0'),
  ).join('-');
  await store.writeDeviceInstallId(created);
  return created;
});

final onboardingCompletedProvider = FutureProvider<bool>((Ref ref) async {
  return ref.watch(installStoreProvider).isOnboardingCompleted();
});

final bootstrapProvider = FutureProvider<BootstrapData>((Ref ref) async {
  final MobileApiClient client = ref.watch(apiClientProvider);
  try {
    return await client.fetchBootstrap();
  } catch (_) {
    return const BootstrapData(
      departments: beninDepartments,
      minimumSupportedVersion: '1.0.0',
    );
  }
});

class VerifyDraft {
  const VerifyDraft({
    required this.message,
    required this.phone,
    this.attachments = const <DraftAttachment>[],
    this.department,
    this.url,
  });

  final String message;
  final String phone;
  final List<DraftAttachment> attachments;
  final String? department;
  final String? url;
}

class DraftAttachment {
  const DraftAttachment({
    required this.path,
    required this.name,
  });

  final String path;
  final String name;
}

class VerifyState {
  const VerifyState({
    this.isSubmitting = false,
    this.draft,
    this.result,
    this.errorMessage,
  });

  final bool isSubmitting;
  final VerifyDraft? draft;
  final VerifyResult? result;
  final String? errorMessage;

  VerifyState copyWith({
    bool? isSubmitting,
    VerifyDraft? draft,
    VerifyResult? result,
    String? errorMessage,
    bool clearError = false,
  }) {
    return VerifyState(
      isSubmitting: isSubmitting ?? this.isSubmitting,
      draft: draft ?? this.draft,
      result: result ?? this.result,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

class VerifyController extends StateNotifier<VerifyState> {
  VerifyController(this._ref) : super(const VerifyState());

  final Ref _ref;

  Future<void> submit({
    required String message,
    required String phone,
    List<DraftAttachment> attachments = const <DraftAttachment>[],
    String? department,
    String? url,
  }) async {
    state = state.copyWith(
      isSubmitting: true,
      draft: VerifyDraft(
        message: message.trim(),
        phone: phone.trim(),
        attachments: attachments,
        department: department,
        url: url,
      ),
      clearError: true,
    );
    try {
      final String deviceInstallId = await _ref.read(deviceInstallIdProvider.future);
      final VerifyResult result = await _ref.read(apiClientProvider).verify(
            message: message.trim(),
            phone: phone.trim(),
            deviceInstallId: deviceInstallId,
            department: department,
            url: url,
          );
      state = state.copyWith(
        isSubmitting: false,
        result: result,
        clearError: true,
      );
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Verification impossible pour le moment.',
      );
    }
  }

  void reset() {
    state = const VerifyState();
  }
}

final verifyControllerProvider =
    StateNotifierProvider<VerifyController, VerifyState>((Ref ref) {
  return VerifyController(ref);
});

class ReportState {
  const ReportState({
    this.isSubmitting = false,
    this.result,
    this.errorMessage,
  });

  final bool isSubmitting;
  final ReportResult? result;
  final String? errorMessage;

  ReportState copyWith({
    bool? isSubmitting,
    ReportResult? result,
    String? errorMessage,
    bool clearError = false,
  }) {
    return ReportState(
      isSubmitting: isSubmitting ?? this.isSubmitting,
      result: result ?? this.result,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

class ReportController extends StateNotifier<ReportState> {
  ReportController(this._ref) : super(const ReportState());

  final Ref _ref;

  Future<void> submit({
    required VerifyDraft draft,
    required VerifyResult verification,
    required List<MultipartFile> screenshots,
  }) async {
    state = state.copyWith(isSubmitting: true, clearError: true);
    try {
      final String deviceInstallId = await _ref.read(deviceInstallIdProvider.future);
      final ReportResult result = await _ref.read(apiClientProvider).submitReport(
            message: draft.message,
            phone: draft.phone,
            department: draft.department,
            url: draft.url,
            deviceInstallId: deviceInstallId,
            verification: verification,
            screenshots: screenshots,
          );
      state = state.copyWith(
        isSubmitting: false,
        result: result,
        clearError: true,
      );
      _ref.invalidate(historyProvider);
    } catch (_) {
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: 'Signalement impossible pour le moment.',
      );
    }
  }

  void clear() {
    state = const ReportState();
  }
}

final reportControllerProvider =
    StateNotifierProvider<ReportController, ReportState>((Ref ref) {
  return ReportController(ref);
});

final historyProvider = FutureProvider<List<HistoryEntry>>((Ref ref) async {
  final InstallStore store = ref.watch(installStoreProvider);
  final String deviceInstallId = await ref.watch(deviceInstallIdProvider.future);
  final MobileApiClient client = ref.watch(apiClientProvider);
  try {
    final List<HistoryEntry> items = await client.fetchHistory(deviceInstallId: deviceInstallId);
    await store.cacheHistoryJson(
      jsonEncode(
        items.map((HistoryEntry item) => item.toJson()).toList(growable: false),
      ),
    );
    return items;
  } catch (_) {
    final String? cached = await store.readHistoryCacheJson();
    if (cached == null || cached.isEmpty) {
      return const <HistoryEntry>[];
    }
    final List<dynamic> decoded = jsonDecode(cached) as List<dynamic>;
    return decoded
        .whereType<Map<String, dynamic>>()
        .map(HistoryEntry.fromJson)
        .toList(growable: false);
  }
});
