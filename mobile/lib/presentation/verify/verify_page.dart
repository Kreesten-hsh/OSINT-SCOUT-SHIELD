import 'package:animations/animations.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:shimmer/shimmer.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../application/providers.dart';
import '../../core/config/app_config.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/history_entry.dart';
import '../../data/models/mobile_shield_settings.dart';
import '../../data/models/native_shield_status.dart';
import '../shared/app_panel.dart';
import '../shared/brand_bar.dart';

class VerifyPage extends ConsumerStatefulWidget {
  const VerifyPage({super.key});

  @override
  ConsumerState<VerifyPage> createState() => _VerifyPageState();
}

class _VerifyPageState extends ConsumerState<VerifyPage> with WidgetsBindingObserver {
  Future<void> _refreshDashboard() async {
    await ref.read(nativeShieldBridgeProvider).flushPendingQueue(limit: 3);
    ref.invalidate(historyProvider);
    await ref.read(historyProvider.future);
    ref.invalidate(nativeShieldStatusProvider);
    await ref.read(nativeShieldStatusProvider.future);
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) {
      return;
    }
    ref.invalidate(nativeShieldStatusProvider);
    ref.invalidate(historyProvider);
  }

  Future<void> _openCitizenPortal(BuildContext context) async {
    final bool launched = await launchUrl(
      Uri.parse(AppConfig.citizenPortalUrl),
      mode: LaunchMode.externalApplication,
    );
    if (launched || !context.mounted) {
      return;
    }
    await Clipboard.setData(ClipboardData(text: AppConfig.citizenPortalUrl));
    if (!context.mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Lien du portail copie.')),
    );
  }

  int _severityWeight(String riskLevel) {
    return switch (riskLevel) {
      'FORT' => 3,
      'MOYEN' => 2,
      'FAIBLE' => 1,
      _ => 0,
    };
  }

  String _ago(DateTime? value) {
    if (value == null) {
      return '--';
    }
    final Duration delta = DateTime.now().difference(value);
    if (delta.inMinutes < 1) {
      return 'maint.';
    }
    if (delta.inHours < 1) {
      return '${delta.inMinutes} min';
    }
    if (delta.inDays < 1) {
      return '${delta.inHours} h';
    }
    return '${delta.inDays} j';
  }

  Color _riskColor(BeninShieldColors colors, String riskLevel) {
    return switch (riskLevel) {
      'FORT' => colors.danger,
      'MOYEN' => colors.warning,
      _ => colors.info,
    };
  }

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    final MobileShieldSettings settings = ref.watch(mobileShieldSettingsProvider);
    final AsyncValue<NativeShieldStatus> statusAsync = ref.watch(nativeShieldStatusProvider);
    final AsyncValue<List<HistoryEntry>> historyAsync = ref.watch(historyProvider);
    final NativeShieldStatus? nativeStatus = statusAsync.valueOrNull;
    final bool protectionActive = settings.hasActiveMonitoring &&
        (nativeStatus?.notificationAccessGranted ?? false) &&
        (nativeStatus?.postNotificationsGranted ?? true);
    final int pendingQueueCount = nativeStatus?.pendingQueueCount ?? 0;

    final List<HistoryEntry> sortedItems = (historyAsync.valueOrNull ?? const <HistoryEntry>[])
        .toList(growable: false)
      ..sort((HistoryEntry a, HistoryEntry b) {
        final int severityCompare = _severityWeight(b.riskLevel).compareTo(_severityWeight(a.riskLevel));
        if (severityCompare != 0) {
          return severityCompare;
        }
        return b.createdAt.compareTo(a.createdAt);
      });

    final DateTime now = DateTime.now();
    final int alertsToday = sortedItems
        .where(
          (HistoryEntry item) =>
              item.createdAt.year == now.year &&
              item.createdAt.month == now.month &&
              item.createdAt.day == now.day &&
              item.riskLevel != 'FAIBLE',
        )
        .length;
    final int analyzedCount = sortedItems.length;
    final int threatCount = sortedItems.where((HistoryEntry item) => item.riskLevel == 'FORT').length;
    final DateTime? lastScan = sortedItems.isEmpty ? null : sortedItems.first.createdAt;
    HistoryEntry? latestThreat;
    for (final HistoryEntry item in sortedItems) {
      if (item.riskLevel == 'FAIBLE') {
        continue;
      }
      latestThreat = item;
      break;
    }
    final List<HistoryEntry> recentItems = sortedItems.take(3).toList(growable: false);

    return Scaffold(
      body: Column(
        children: <Widget>[
          BrandBar(
            trailing: _StatusPill(
              active: protectionActive,
              label: protectionActive ? 'Actif' : 'Pause',
            ),
          ).animate().fadeIn(duration: 220.ms).slideY(begin: -0.04, end: 0),
          Expanded(
            child: Stack(
              children: <Widget>[
                IgnorePointer(
                  child: Stack(
                    children: <Widget>[
                      Positioned(
                        top: 0,
                        left: -80,
                        child: Container(
                          width: 220,
                          height: 220,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: RadialGradient(
                              colors: <Color>[
                                colors.primary.withValues(alpha: 0.12),
                                Colors.transparent,
                              ],
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        top: 90,
                        right: -70,
                        child: Container(
                          width: 220,
                          height: 220,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: RadialGradient(
                              colors: <Color>[
                                colors.brand.withValues(alpha: 0.14),
                                Colors.transparent,
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                RefreshIndicator(
                  onRefresh: _refreshDashboard,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 132),
                  children: <Widget>[
                    AppPanel(
                      padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
                      radius: 30,
                      glowColor: protectionActive ? colors.primary : colors.brand,
                      backgroundOpacity: 0.98,
                      child: Column(
                        children: <Widget>[
                          _ShieldOrb(active: protectionActive),
                          const SizedBox(height: 16),
                          Text(
                            '$alertsToday',
                            style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                                  fontSize: 54,
                                  letterSpacing: -1.6,
                                  color: colors.onSurface,
                                ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            alertsToday > 1 ? 'alertes aujourd hui' : 'alerte aujourd hui',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            settings.hasActiveMonitoring
                                ? protectionActive
                                    ? 'Votre protection est active'
                                    : 'Autorise le service Android pour demarrer la veille'
                                : 'Active au moins un canal pour lancer la surveillance',
                            style: Theme.of(context).textTheme.bodySmall,
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ).animate().fadeIn(duration: 260.ms).slideY(begin: 0.05, end: 0),
                    const SizedBox(height: 22),
                    Row(
                      children: <Widget>[
                        Expanded(
                          child: _MetricCard(
                            label: 'Analyses',
                            value: '$analyzedCount',
                            caption: 'messages',
                            icon: Symbols.analytics_rounded,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _MetricCard(
                            label: 'Menaces',
                            value: '$threatCount',
                            caption: 'eleve',
                            icon: Symbols.warning_rounded,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _MetricCard(
                            label: 'Dernier',
                            value: _ago(lastScan),
                            caption: 'scan',
                            icon: Symbols.schedule_rounded,
                          ),
                        ),
                      ],
                    ).animate().fadeIn(delay: 50.ms, duration: 260.ms).slideY(begin: 0.05, end: 0),
                    if (pendingQueueCount > 0) ...<Widget>[
                      const SizedBox(height: 18),
                      AppPanel(
                        padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                        radius: 20,
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Icon(Symbols.sync_rounded, color: colors.warning, size: 18),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Text(
                                    pendingQueueCount > 1
                                        ? '$pendingQueueCount analyses en attente'
                                        : '1 analyse en attente',
                                    style: Theme.of(context).textTheme.labelLarge,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'BCS relancera automatiquement ces messages des que la connexion revient.',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ).animate().fadeIn(delay: 70.ms, duration: 260.ms).slideY(begin: 0.06, end: 0),
                    ],
                    if (nativeStatus != null && !nativeStatus.notificationAccessGranted) ...<Widget>[
                      const SizedBox(height: 18),
                      AppPanel(
                        padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                        radius: 20,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Row(
                              children: <Widget>[
                                Icon(Symbols.notifications_off_rounded, color: colors.warning, size: 18),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    'Le service de lecture des notifications n est pas encore autorise.',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                onPressed: () async {
                                  await ref.read(nativeShieldBridgeProvider).openNotificationAccessSettings();
                                  ref.invalidate(nativeShieldStatusProvider);
                                },
                                icon: const Icon(Symbols.settings_rounded, size: 18),
                                label: const Text('Activer l acces notifications'),
                              ),
                            ),
                            if ((nativeStatus.postNotificationsGranted) == false) ...<Widget>[
                              const SizedBox(height: 10),
                              SizedBox(
                                width: double.infinity,
                                child: FilledButton.icon(
                                  onPressed: () async {
                                    await ref
                                        .read(nativeShieldBridgeProvider)
                                        .requestPostNotificationsPermission();
                                    ref.invalidate(nativeShieldStatusProvider);
                                  },
                                  icon: const Icon(Symbols.notifications_rounded, size: 18),
                                  label: const Text('Autoriser les alertes'),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ).animate().fadeIn(delay: 80.ms, duration: 260.ms).slideY(begin: 0.06, end: 0),
                    ],
                    const SizedBox(height: 18),
                    AppPanel(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                      radius: 22,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Row(
                            children: <Widget>[
                              Text('Apps surveillees', style: Theme.of(context).textTheme.labelLarge),
                              const Spacer(),
                              Text(
                                '${settings.activeChannelCount}/3',
                                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                      color: colors.primary,
                                    ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: <Widget>[
                              _WatchChip(
                                label: 'SMS',
                                active: settings.monitorSms,
                                assetName: 'assets/brand/logo_sms.svg',
                              ),
                              _WatchChip(
                                label: 'WhatsApp',
                                active: settings.monitorWhatsapp,
                                assetName: 'assets/brand/logo_whatsapp.svg',
                              ),
                              _WatchChip(
                                label: 'Messenger',
                                active: settings.monitorMessenger,
                                assetName: 'assets/brand/logo_messenger.svg',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ).animate().fadeIn(delay: 100.ms, duration: 260.ms).slideY(begin: 0.06, end: 0),
                    const SizedBox(height: 18),
                    AppPanel(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                      radius: 22,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Row(
                            children: <Widget>[
                              Container(
                                width: 42,
                                height: 42,
                                decoration: BoxDecoration(
                                  color: colors.brand.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Icon(
                                  Symbols.open_in_new_rounded,
                                  color: colors.brand,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: <Widget>[
                                    Text('Portail citoyen', style: Theme.of(context).textTheme.labelLarge),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Pour verifier un message manuellement, joindre des preuves ou signaler un cas precis.',
                                      style: Theme.of(context).textTheme.bodySmall,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton.icon(
                              onPressed: () => _openCitizenPortal(context),
                              icon: const Icon(Symbols.open_in_new_rounded, size: 18),
                              label: const Text('Ouvrir le portail BCS'),
                            ),
                          ),
                        ],
                      ),
                    ).animate().fadeIn(delay: 120.ms, duration: 260.ms).slideY(begin: 0.06, end: 0),
                    const SizedBox(height: 18),
                    Row(
                      children: <Widget>[
                        Text('Derniere alerte', style: Theme.of(context).textTheme.labelLarge),
                        const Spacer(),
                        if (latestThreat != null)
                          Text(
                            DateFormat('HH:mm').format(latestThreat.createdAt),
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    PageTransitionSwitcher(
                      duration: 280.ms,
                      reverse: latestThreat == null,
                      transitionBuilder: (
                        Widget child,
                        Animation<double> primaryAnimation,
                        Animation<double> secondaryAnimation,
                      ) {
                        return FadeThroughTransition(
                          animation: primaryAnimation,
                          secondaryAnimation: secondaryAnimation,
                          child: child,
                        );
                      },
                      child: latestThreat == null
                          ? AppPanel(
                              key: const ValueKey<String>('no-threat'),
                              padding: const EdgeInsets.fromLTRB(16, 18, 16, 18),
                              radius: 20,
                              child: Text(
                                settings.hasActiveMonitoring
                                    ? 'Aucune menace recente. La sentinelle reste en veille.'
                                    : 'Aucune menace recente. Active les canaux pour demarrer la veille.',
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            )
                          : _RecentAlertCard(
                              key: ValueKey<String>(latestThreat.createdAt.toIso8601String()),
                              item: latestThreat,
                              accent: _riskColor(colors, latestThreat.riskLevel),
                            ),
                    ),
                    const SizedBox(height: 18),
                    Row(
                      children: <Widget>[
                        Text('Recents', style: Theme.of(context).textTheme.labelLarge),
                        const Spacer(),
                        Text(
                          'journal',
                          style: Theme.of(context).textTheme.labelSmall,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (historyAsync.isLoading)
                      const _RecentListSkeleton()
                    else if (recentItems.isEmpty)
                      AppPanel(
                        padding: const EdgeInsets.fromLTRB(16, 18, 16, 18),
                        radius: 20,
                        child: Text(
                          'Le journal commencera a se remplir des les premiers messages analyses.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      )
                    else
                      Column(
                        children: recentItems
                            .map(
                              (HistoryEntry item) => Padding(
                                padding: EdgeInsets.only(bottom: item == recentItems.last ? 0 : 10),
                                child: _RecentAlertCard(
                                  item: item,
                                  accent: _riskColor(colors, item.riskLevel),
                                ),
                              ),
                            )
                            .toList(growable: false),
                      ),
                  ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({
    required this.active,
    required this.label,
  });

  final bool active;
  final String label;

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    final Color tone = active ? colors.primary : colors.warning;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: tone.withValues(alpha: 0.22)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: tone,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            label.toUpperCase(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: tone,
                  fontWeight: FontWeight.w800,
                ),
          ),
        ],
      ),
    );
  }
}

class _ShieldOrb extends StatelessWidget {
  const _ShieldOrb({
    required this.active,
  });

  final bool active;

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    final Color tone = active ? colors.primary : colors.warning;
    final Widget orb = Center(
      child: Container(
        width: 142,
        height: 142,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: <Color>[
              tone.withValues(alpha: 0.24),
              colors.brand.withValues(alpha: 0.08),
              colors.surfaceLow,
            ],
          ),
          border: Border.all(color: colors.outlineSoft),
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: tone.withValues(alpha: 0.18),
              blurRadius: 34,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Center(
          child: Container(
            width: 68,
            height: 68,
            decoration: BoxDecoration(
              color: colors.background.withValues(alpha: 0.52),
              shape: BoxShape.circle,
              border: Border.all(color: tone.withValues(alpha: 0.2)),
            ),
            child: Icon(
              Symbols.shield_rounded,
              color: tone,
              size: 28,
            ),
          ),
        ),
      ),
    );
    if (!active) {
      return orb;
    }
    return orb
        .animate(onPlay: (AnimationController controller) => controller.repeat(reverse: true))
        .scale(
          begin: const Offset(0.985, 0.985),
          end: const Offset(1.015, 1.015),
          duration: 1600.ms,
          curve: Curves.easeInOut,
        );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.caption,
    required this.icon,
  });

  final String label;
  final String value;
  final String caption;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    return AppPanel(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      radius: 18,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(icon, size: 16, color: colors.brand),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label.toUpperCase(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelMedium,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(value, style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 2),
          Text(caption, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _WatchChip extends StatelessWidget {
  const _WatchChip({
    required this.label,
    required this.active,
    required this.assetName,
  });

  final String label;
  final bool active;
  final String assetName;

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    final Color tone = active ? colors.primary : colors.muted;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: active ? colors.primary.withValues(alpha: 0.08) : colors.surfaceLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: active ? colors.primary.withValues(alpha: 0.2) : colors.outlineSoft,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          SvgPicture.asset(
            assetName,
            width: 16,
            height: 16,
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tone),
          ),
        ],
      ),
    );
  }
}

class _RecentAlertCard extends StatelessWidget {
  const _RecentAlertCard({
    super.key,
    required this.item,
    required this.accent,
  });

  final HistoryEntry item;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final String preview = item.messagePreview?.trim().isNotEmpty == true
        ? item.messagePreview!
        : (item.primaryCategory ?? 'Alerte mobile');
    return AppPanel(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      radius: 18,
      child: Row(
        children: <Widget>[
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.14),
              shape: BoxShape.circle,
            ),
            child: Icon(
              item.type == HistoryEntryType.report
                  ? Symbols.flag_rounded
                  : Symbols.notifications_active_rounded,
              color: accent,
              size: 17,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  item.maskedPhone,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelLarge,
                ),
                const SizedBox(height: 2),
                Text(
                  preview,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: <Widget>[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '${item.riskScore} - ${item.riskLevel}',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: accent,
                        fontWeight: FontWeight.w800,
                      ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                DateFormat('HH:mm').format(item.createdAt),
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RecentListSkeleton extends StatelessWidget {
  const _RecentListSkeleton();

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    return Shimmer.fromColors(
      baseColor: colors.surfaceLow,
      highlightColor: colors.surfaceHighest,
      child: Column(
        children: List<Widget>.generate(
          3,
          (int index) => Padding(
            padding: EdgeInsets.only(bottom: index == 2 ? 0 : 10),
            child: Container(
              height: 72,
              decoration: BoxDecoration(
                color: colors.surfaceLow,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: colors.outlineSoft),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
