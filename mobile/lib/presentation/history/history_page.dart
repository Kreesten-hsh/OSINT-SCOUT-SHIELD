import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:shimmer/shimmer.dart';
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

class _HistoryPageState extends ConsumerState<HistoryPage> with WidgetsBindingObserver {
  _HistoryFilter _filter = _HistoryFilter.all;
  String _query = '';

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
    ref.invalidate(historyProvider);
  }

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
      _HistoryFilter.high => 'Eleve',
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

  bool _matchesQuery(HistoryEntry item) {
    if (_query.trim().isEmpty) {
      return true;
    }
    final String haystack = <String>[
      item.maskedPhone,
      item.primaryCategory ?? '',
      item.publicReference ?? '',
      item.status ?? '',
    ].join(' ').toLowerCase();
    return haystack.contains(_query.trim().toLowerCase());
  }

  Future<void> _openPortal() async {
    await launchUrl(
      Uri.parse(AppConfig.citizenPortalUrl),
      mode: LaunchMode.externalApplication,
    );
  }

  Future<void> _showDetails(BuildContext context, HistoryEntry item) async {
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
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      item.type == HistoryEntryType.report
                          ? Symbols.flag_rounded
                          : Symbols.notifications_active_rounded,
                      color: accent,
                      size: 20,
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
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                item.primaryCategory ?? 'Aucune categorie specifique',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 10),
              Text(
                DateFormat('dd MMM yyyy - HH:mm').format(item.createdAt),
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 18),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: <Widget>[
                  _DetailPill(label: 'Score ${item.riskScore}/100'),
                  if (item.publicReference != null) _DetailPill(label: item.publicReference!),
                  if (item.status != null) _DetailPill(label: item.status!),
                ],
              ),
              const SizedBox(height: 22),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _openPortal,
                  icon: const Icon(Symbols.open_in_new_rounded, size: 18),
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
                      const SnackBar(content: Text('Repere copie.')),
                    );
                  },
                  icon: const Icon(Symbols.content_copy_rounded, size: 18),
                  label: const Text('Copier le repere'),
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
                  Text('Historique', style: Theme.of(context).textTheme.headlineLarge)
                      .animate()
                      .fadeIn(duration: 260.ms)
                      .slideY(begin: 0.08, end: 0),
                  const SizedBox(height: 8),
                  Text(
                    'Registre des alertes et verifications utiles conservees sur ce mobile.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colors.muted),
                  ).animate().fadeIn(delay: 60.ms, duration: 260.ms),
                  const SizedBox(height: 16),
                  SearchBar(
                    leading: const Icon(Symbols.search_rounded, size: 20),
                    hintText: 'Rechercher un numero, une categorie ou une reference',
                    onChanged: (String value) => setState(() => _query = value),
                  ).animate().fadeIn(delay: 90.ms, duration: 260.ms),
                  const SizedBox(height: 14),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: SegmentedButton<_HistoryFilter>(
                      segments: _HistoryFilter.values
                          .map(
                            (_HistoryFilter filter) => ButtonSegment<_HistoryFilter>(
                              value: filter,
                              label: Text(_displayFilterLabel(filter)),
                            ),
                          )
                          .toList(growable: false),
                      selected: <_HistoryFilter>{_filter},
                      onSelectionChanged: (Set<_HistoryFilter> selection) {
                        setState(() {
                          _filter = selection.first;
                        });
                      },
                    ),
                  ).animate().fadeIn(delay: 120.ms, duration: 260.ms),
                  const SizedBox(height: 16),
                  Expanded(
                    child: historyAsync.when(
                      data: (List<HistoryEntry> items) {
                        final List<HistoryEntry> filtered = items
                            .where(_matchesFilter)
                            .where(_matchesQuery)
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
                                _query.isNotEmpty
                                    ? 'Aucun resultat pour cette recherche.'
                                    : 'Aucune entree pour le filtre ${_displayFilterLabel(_filter).toLowerCase()}.',
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
                                          width: 34,
                                          height: 34,
                                          decoration: BoxDecoration(
                                            color: accent.withValues(alpha: 0.12),
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
                                  ),
                                ),
                              ).animate(delay: (index * 45).ms).fadeIn(duration: 220.ms).slideY(
                                    begin: 0.08,
                                    end: 0,
                                  );
                            },
                          ),
                        );
                      },
                      loading: () => Shimmer.fromColors(
                        baseColor: colors.surfaceLow,
                        highlightColor: colors.surfaceHighest,
                        child: ListView.separated(
                          itemCount: 5,
                          separatorBuilder: (_, _) => const SizedBox(height: 10),
                          itemBuilder: (_, index) => Container(
                            height: 68,
                            decoration: BoxDecoration(
                              color: colors.surfaceLow,
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(color: colors.outlineSoft),
                            ),
                          ),
                        ),
                      ),
                      error: (_, _) => AppPanel(
                        padding: const EdgeInsets.all(18),
                        radius: 20,
                        child: Center(
                          child: Text(
                            'Impossible de charger l historique mobile.',
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
