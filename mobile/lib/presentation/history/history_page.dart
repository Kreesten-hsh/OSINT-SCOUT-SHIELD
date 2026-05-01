import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../application/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/history_entry.dart';
import '../shared/app_panel.dart';
import '../shared/brand_bar.dart';

class HistoryPage extends ConsumerStatefulWidget {
  const HistoryPage({super.key});

  @override
  ConsumerState<HistoryPage> createState() => _HistoryPageState();
}

class _HistoryPageState extends ConsumerState<HistoryPage> {
  HistoryEntryType? _filter;

  Color _accentForRisk(BeninShieldColors colors, String riskLevel) {
    return switch (riskLevel) {
      'HIGH' => colors.danger,
      'MEDIUM' => colors.warning,
      _ => colors.primarySoft,
    };
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
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('Historique', style: Theme.of(context).textTheme.headlineLarge),
                  const SizedBox(height: 12),
                  Text(
                    'Journal des analyses et signalements liés à ton installation mobile.',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: colors.muted),
                  ),
                  const SizedBox(height: 18),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: <Widget>[
                        ChoiceChip(
                          label: const Text('Tous'),
                          selected: _filter == null,
                          onSelected: (_) => setState(() => _filter = null),
                        ),
                        const SizedBox(width: 10),
                        ChoiceChip(
                          label: const Text('Signalés'),
                          selected: _filter == HistoryEntryType.report,
                          onSelected: (_) => setState(() => _filter = HistoryEntryType.report),
                        ),
                        const SizedBox(width: 10),
                        ChoiceChip(
                          label: const Text('Vérifiés'),
                          selected: _filter == HistoryEntryType.verify,
                          onSelected: (_) => setState(() => _filter = HistoryEntryType.verify),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  Expanded(
                    child: historyAsync.when(
                      data: (List<HistoryEntry> items) {
                        final List<HistoryEntry> filtered = _filter == null
                            ? items
                            : items.where((HistoryEntry item) => item.type == _filter).toList(growable: false);
                        if (filtered.isEmpty) {
                          return AppPanel(
                            child: Center(
                              child: Text(
                                'Aucun élément dans l historique mobile.',
                                style: Theme.of(context).textTheme.bodyLarge,
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
                            separatorBuilder: (_, _) => const SizedBox(height: 14),
                            itemBuilder: (BuildContext context, int index) {
                              final HistoryEntry item = filtered[index];
                              final Color accent = _accentForRisk(colors, item.riskLevel);
                              return Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(28),
                                  boxShadow: <BoxShadow>[
                                    BoxShadow(
                                      color: colors.background.withValues(alpha: 0.36),
                                      blurRadius: 22,
                                      offset: const Offset(0, 12),
                                    ),
                                  ],
                                ),
                                child: Stack(
                                  children: <Widget>[
                                    Positioned.fill(
                                      child: Align(
                                        alignment: Alignment.centerLeft,
                                        child: Container(
                                          width: 6,
                                          margin: const EdgeInsets.symmetric(vertical: 16),
                                          decoration: BoxDecoration(
                                            color: accent,
                                            borderRadius: BorderRadius.circular(999),
                                          ),
                                        ),
                                      ),
                                    ),
                                    AppPanel(
                                      padding: const EdgeInsets.fromLTRB(24, 22, 20, 20),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: <Widget>[
                                          Row(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: <Widget>[
                                              Container(
                                                width: 56,
                                                height: 56,
                                                decoration: BoxDecoration(
                                                  shape: BoxShape.circle,
                                                  color: accent.withValues(alpha: 0.12),
                                                  border: Border.all(color: accent.withValues(alpha: 0.35)),
                                                ),
                                                child: Icon(
                                                  item.type == HistoryEntryType.report
                                                      ? Icons.warning_amber_rounded
                                                      : Icons.verified_outlined,
                                                  color: accent,
                                                ),
                                              ),
                                              const SizedBox(width: 16),
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: <Widget>[
                                                    Text(
                                                      item.maskedPhone,
                                                      style: Theme.of(context).textTheme.headlineSmall,
                                                    ),
                                                    const SizedBox(height: 4),
                                                    Text(
                                                      DateFormat('dd MMM yyyy, HH:mm').format(item.createdAt),
                                                      style: Theme.of(context).textTheme.labelSmall,
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              Chip(
                                                label: Text(
                                                  item.type == HistoryEntryType.report ? 'Signalé' : 'Vérifié',
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 18),
                                          Divider(color: colors.outlineSoft),
                                          const SizedBox(height: 16),
                                          Wrap(
                                            spacing: 18,
                                            runSpacing: 10,
                                            children: <Widget>[
                                              if (item.primaryCategory != null)
                                                _HistoryMeta(
                                                  icon: Icons.policy_outlined,
                                                  label: item.primaryCategory!,
                                                ),
                                              _HistoryMeta(
                                                icon: Icons.speed_rounded,
                                                label: 'Score ${item.riskScore}/100',
                                              ),
                                              if (item.publicReference != null)
                                                _HistoryMeta(
                                                  icon: Icons.badge_outlined,
                                                  label: item.publicReference!,
                                                ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                        );
                      },
                      loading: () => const Center(child: CircularProgressIndicator()),
                      error: (_, _) => AppPanel(
                        child: Center(
                          child: Text(
                            'Impossible de charger l historique mobile.',
                            style: Theme.of(context).textTheme.bodyLarge,
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

class _HistoryMeta extends StatelessWidget {
  const _HistoryMeta({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Icon(icon, size: 18, color: Theme.of(context).textTheme.bodyMedium?.color),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            label,
            style: Theme.of(context).textTheme.labelLarge,
          ),
        ),
      ],
    );
  }
}
