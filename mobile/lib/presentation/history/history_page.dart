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

enum _HistoryFilter { all, high, medium, low }

class HistoryPage extends ConsumerStatefulWidget {
  const HistoryPage({super.key});

  @override
  ConsumerState<HistoryPage> createState() => _HistoryPageState();
}

class _HistoryPageState extends ConsumerState<HistoryPage> {
  _HistoryFilter _filter = _HistoryFilter.all;

  int _severityWeight(String riskLevel) {
    return switch (riskLevel) {
      'HIGH' => 3,
      'MEDIUM' => 2,
      'LOW' => 1,
      _ => 0,
    };
  }

  Color _riskColor(BeninShieldColors colors, String riskLevel) {
    return switch (riskLevel) {
      'HIGH' => colors.danger,
      'MEDIUM' => colors.warning,
      _ => colors.info,
    };
  }

  String _displayFilterLabel(_HistoryFilter filter) {
    return switch (filter) {
      _HistoryFilter.all => 'Tout',
      _HistoryFilter.high => 'Élevé',
      _HistoryFilter.medium => 'Moyen',
      _HistoryFilter.low => 'Faible',
    };
  }

  bool _matchesFilter(HistoryEntry item) {
    return switch (_filter) {
      _HistoryFilter.all => true,
      _HistoryFilter.high => item.riskLevel == 'HIGH',
      _HistoryFilter.medium => item.riskLevel == 'MEDIUM',
      _HistoryFilter.low => item.riskLevel == 'LOW',
    };
  }

  Future<void> _openPortal() async {
    await launchUrl(
      Uri.parse(AppConfig.citizenPortalUrl),
      mode: LaunchMode.externalApplication,
    );
  }

  Future<void> _showDetails(
    BuildContext context,
    HistoryEntry item,
  ) async {
    final BeninShieldColors colors = context.shieldColors;
    final Color accent = _riskColor(colors, item.riskLevel);
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      backgroundColor: colors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (BuildContext context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      item.type == HistoryEntryType.report
                          ? Icons.flag_rounded
                          : Icons.notifications_active_rounded,
                      color: accent,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      item.maskedPhone,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      item.riskLevel,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: accent,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                item.primaryCategory ?? 'Aucune catégorie spécifique',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 10),
              Text(
                DateFormat('dd MMM yyyy · HH:mm').format(item.createdAt),
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 18),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: <Widget>[
                  _DetailPill(label: 'Score ${item.riskScore}/100'),
                  if (item.publicReference != null)
                    _DetailPill(label: item.publicReference!),
                  if (item.status != null) _DetailPill(label: item.status!),
                ],
              ),
              const SizedBox(height: 22),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _openPortal,
                  icon: const Icon(Icons.open_in_new_rounded),
                  label: const Text('Ouvrir le portail BCS'),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: item.maskedPhone));
                    if (!context.mounted) {
                      return;
                    }
                    Navigator.of(context).pop();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Référence copiée.')),
                    );
                  },
                  icon: const Icon(Icons.copy_rounded),
                  label: const Text('Copier le repère'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    final AsyncValue<List<HistoryEntry>> historyAsync = ref.watch(historyProvider);

    return Scaffold(
      body: Column(
        children: <Widget>[
          const BrandBar(),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 132),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('Historique', style: Theme.of(context).textTheme.headlineLarge),
                  const SizedBox(height: 10),
                  Text(
                    'Registre des alertes et vérifications archivées sur ce mobile.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colors.muted),
                  ),
                  const SizedBox(height: 16),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _HistoryFilter.values
                          .map(
                            (_HistoryFilter filter) => Padding(
                              padding: EdgeInsets.only(
                                right: filter == _HistoryFilter.values.last ? 0 : 8,
                              ),
                              child: ChoiceChip(
                                label: Text(_displayFilterLabel(filter)),
                                selected: _filter == filter,
                                onSelected: (_) => setState(() => _filter = filter),
                              ),
                            ),
                          )
                          .toList(growable: false),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: historyAsync.when(
                      data: (List<HistoryEntry> items) {
                        final List<HistoryEntry> filtered = items
                            .where(_matchesFilter)
                            .toList(growable: false)
                          ..sort((HistoryEntry a, HistoryEntry b) {
                            final int severityCompare =
                                _severityWeight(b.riskLevel).compareTo(_severityWeight(a.riskLevel));
                            if (severityCompare != 0) {
                              return severityCompare;
                            }
                            return b.createdAt.compareTo(a.createdAt);
                          });

                        if (filtered.isEmpty) {
                          return AppPanel(
                            padding: const EdgeInsets.all(18),
                            radius: 20,
                            child: Center(
                              child: Text(
                                'Aucune entrée pour le filtre ${_displayFilterLabel(_filter).toLowerCase()}.',
                                style: Theme.of(context).textTheme.bodyLarge,
                                textAlign: TextAlign.center,
                              ),
                            ),
                          );
                        }

                        return RefreshIndicator(
                          onRefresh: () async {
                            ref.invalidate(historyProvider);
                            await ref.read(historyProvider.future);
                          },
                          child: ListView.separated(
                            itemCount: filtered.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 10),
                            itemBuilder: (BuildContext context, int index) {
                              final HistoryEntry item = filtered[index];
                              final Color accent = _riskColor(colors, item.riskLevel);
                              return Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(18),
                                  onTap: () => _showDetails(context, item),
                                  child: AppPanel(
                                    padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                                    radius: 18,
                                    child: Row(
                                      children: <Widget>[
                                        Container(
                                          width: 30,
                                          height: 30,
                                          decoration: BoxDecoration(
                                            color: accent.withValues(alpha: 0.12),
                                            shape: BoxShape.circle,
                                          ),
                                          child: Icon(
                                            item.type == HistoryEntryType.report
                                                ? Icons.flag_rounded
                                                : Icons.notifications_active_rounded,
                                            color: accent,
                                            size: 16,
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
                                                item.primaryCategory ?? 'Signal mobile',
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
                                                '${item.riskScore}',
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
                                  ),
                                ),
                              );
                            },
                          ),
                        );
                      },
                      loading: () => ListView.separated(
                        itemCount: 5,
                        separatorBuilder: (_, _) => const SizedBox(height: 10),
                        itemBuilder: (_, __) => Container(
                          height: 68,
                          decoration: BoxDecoration(
                            color: colors.surfaceLow,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: colors.outlineSoft),
                          ),
                        ),
                      ),
                      error: (_, _) => AppPanel(
                        padding: const EdgeInsets.all(18),
                        radius: 20,
                        child: Center(
                          child: Text(
                            'Impossible de charger l’historique mobile.',
                            style: Theme.of(context).textTheme.bodyLarge,
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ),
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

class _DetailPill extends StatelessWidget {
  const _DetailPill({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: colors.surfaceLow,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colors.outlineSoft),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colors.onSurface),
      ),
    );
  }
}
