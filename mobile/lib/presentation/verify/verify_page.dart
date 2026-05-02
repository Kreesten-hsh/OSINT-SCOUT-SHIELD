import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../application/providers.dart';
import '../../core/config/app_config.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/history_entry.dart';
import '../shared/app_panel.dart';
import '../shared/brand_bar.dart';

class VerifyPage extends ConsumerWidget {
  const VerifyPage({super.key});

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
      const SnackBar(content: Text('Lien du portail copié.')),
    );
  }

  int _severityWeight(String riskLevel) {
    return switch (riskLevel) {
      'HIGH' => 3,
      'MEDIUM' => 2,
      'LOW' => 1,
      _ => 0,
    };
  }

  String _ago(DateTime? value) {
    if (value == null) {
      return '—';
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
      'HIGH' => colors.danger,
      'MEDIUM' => colors.warning,
      _ => colors.info,
    };
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final BeninShieldColors colors = context.shieldColors;
    final MobileShieldSettings settings = ref.watch(mobileShieldSettingsProvider);
    final AsyncValue<List<HistoryEntry>> historyAsync = ref.watch(historyProvider);

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
              item.riskLevel != 'LOW',
        )
        .length;
    final int analyzedCount = sortedItems.length;
    final int threatCount = sortedItems.where((HistoryEntry item) => item.riskLevel == 'HIGH').length;
    final DateTime? lastScan = sortedItems.isEmpty ? null : sortedItems.first.createdAt;
    final List<HistoryEntry> recentItems = sortedItems.take(4).toList(growable: false);

    return Scaffold(
      body: Column(
        children: <Widget>[
          BrandBar(
            trailing: _StatusPill(
              active: settings.hasActiveMonitoring,
              label: settings.hasActiveMonitoring ? 'Actif' : 'Pause',
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 132),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const SizedBox(height: 6),
                  Center(
                    child: Column(
                      children: <Widget>[
                        _ShieldOrb(active: settings.hasActiveMonitoring),
                        const SizedBox(height: 16),
                        Text(
                          '$alertsToday',
                          style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                                fontSize: 52,
                                color: colors.onSurface,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          alertsToday > 1 ? 'alertes aujourd’hui' : 'alerte aujourd’hui',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          settings.hasActiveMonitoring
                              ? 'Vous êtes protégé'
                              : 'Activez vos canaux de surveillance',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 22),
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: _MetricCard(
                          label: 'Analysés',
                          value: '$analyzedCount',
                          caption: 'messages',
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _MetricCard(
                          label: 'Menaces',
                          value: '$threatCount',
                          caption: 'score élevé',
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _MetricCard(
                          label: 'Dernier',
                          value: _ago(lastScan),
                          caption: 'scan',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  AppPanel(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                    radius: 20,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Row(
                          children: <Widget>[
                            Text('Apps surveillées', style: Theme.of(context).textTheme.labelLarge),
                            const Spacer(),
                            Text(
                              '${settings.activeChannelCount}/3',
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colors.primary),
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
                              icon: Icons.sms_rounded,
                            ),
                            _WatchChip(
                              label: 'WhatsApp',
                              active: settings.monitorWhatsapp,
                              icon: Icons.forum_rounded,
                            ),
                            _WatchChip(
                              label: 'Messenger',
                              active: settings.monitorMessenger,
                              icon: Icons.chat_bubble_rounded,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: <Widget>[
                      Text('Récents', style: Theme.of(context).textTheme.labelLarge),
                      const Spacer(),
                      TextButton(
                        onPressed: () => _openCitizenPortal(context),
                        child: const Text('Signaler manuellement'),
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
                        'Aucune activité récente. La sentinelle commencera à remplir ce journal dès les premiers messages analysés.',
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
        border: Border.all(color: tone.withValues(alpha: 0.24)),
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
                  fontWeight: FontWeight.w700,
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
    return Container(
      width: 124,
      height: 124,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: <Color>[
            tone.withValues(alpha: 0.24),
            tone.withValues(alpha: 0.08),
            colors.surfaceLow,
          ],
        ),
        border: Border.all(color: colors.outlineSoft),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: tone.withValues(alpha: 0.14),
            blurRadius: 30,
            spreadRadius: 4,
          ),
        ],
      ),
      child: Center(
        child: Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: colors.background.withValues(alpha: 0.54),
            shape: BoxShape.circle,
            border: Border.all(color: tone.withValues(alpha: 0.2)),
          ),
          child: Icon(
            active ? Icons.shield_outlined : Icons.shield_moon_outlined,
            color: tone,
            size: 26,
          ),
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.caption,
  });

  final String label;
  final String value;
  final String caption;

  @override
  Widget build(BuildContext context) {
    return AppPanel(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      radius: 18,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(label.toUpperCase(), style: Theme.of(context).textTheme.labelMedium),
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
    required this.icon,
  });

  final String label;
  final bool active;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    final Color tone = active ? colors.primary : colors.outline;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: active ? colors.primary.withValues(alpha: 0.08) : colors.surfaceLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: active ? colors.primary.withValues(alpha: 0.2) : colors.outlineSoft),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(icon, size: 15, color: tone),
          const SizedBox(width: 6),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: active ? colors.primary : colors.muted,
                ),
          ),
        ],
      ),
    );
  }
}

class _RecentAlertCard extends StatelessWidget {
  const _RecentAlertCard({
    required this.item,
    required this.accent,
  });

  final HistoryEntry item;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    final bool isElevated = item.riskLevel == 'HIGH' || item.riskLevel == 'MEDIUM';
    return AppPanel(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      radius: 18,
      child: Row(
        children: <Widget>[
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.14),
              shape: BoxShape.circle,
            ),
            child: Icon(
              item.type == HistoryEntryType.report ? Icons.flag_rounded : Icons.notifications_active_rounded,
              color: accent,
              size: 15,
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
                  item.primaryCategory ?? 'Message surveillé',
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
                  isElevated ? '${item.riskScore} · ${item.riskLevel}' : '${item.riskScore}',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: accent,
                        fontWeight: FontWeight.w700,
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
    return Column(
      children: List<Widget>.generate(
        3,
        (int index) => Padding(
          padding: EdgeInsets.only(bottom: index == 2 ? 0 : 10),
          child: Container(
            height: 70,
            decoration: BoxDecoration(
              color: colors.surfaceLow,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: colors.outlineSoft),
            ),
          ),
        ),
      ),
    );
  }
}
