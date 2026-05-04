import 'package:flutter/material.dart';
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

  Future<void> _refreshHistory() async {
    await ref.read(nativeShieldBridgeProvider).flushPendingQueue(limit: 3);
    ref.invalidate(historyProvider);
    await ref.read(historyProvider.future);
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
    ref.invalidate(historyProvider);
  }

  int _severityWeight(String riskLevel) {
    return switch (riskLevel) {
      'FORT' => 3,
      'MOYEN' => 2,
      'FAIBLE' => 1,
      _ => 0,
    };
  }

  Color _riskColor(BeninShieldColors colors, String riskLevel) {
    return switch (riskLevel) {
      'FORT' => colors.danger,
      'MOYEN' => colors.warning,
      _ => colors.info,
    };
  }

  String _displayFilterLabel(_HistoryFilter filter) {
    return switch (filter) {
      _HistoryFilter.all => 'Tout',
      _HistoryFilter.high => 'FORT',
      _HistoryFilter.medium => 'MOYEN',
      _HistoryFilter.low => 'FAIBLE',
    };
  }

  bool _matchesFilter(HistoryEntry item) {
    return switch (_filter) {
      _HistoryFilter.all => true,
      _HistoryFilter.high => item.riskLevel == 'FORT',
      _HistoryFilter.medium => item.riskLevel == 'MOYEN',
      _HistoryFilter.low => item.riskLevel == 'FAIBLE',
    };
  }

  bool _matchesQuery(HistoryEntry item) {
    if (_query.trim().isEmpty) {
      return true;
    }
    final String haystack = <String>[
      item.maskedPhone,
      _previewText(item),
      item.publicReference ?? '',
      item.status ?? '',
    ].join(' ').toLowerCase();
    return haystack.contains(_query.trim().toLowerCase());
  }

  Future<void> _openPortal(HistoryEntry item) async {
    final String prefilledMessage = ((item.messageBody ?? item.messagePreview) ?? '').trim();
    final Uri baseUri = Uri.parse(AppConfig.citizenPortalUrl);
    final Map<String, String> queryParameters = <String, String>{
      ...baseUri.queryParameters,
    };
    if (prefilledMessage.isNotEmpty) {
      queryParameters['message'] = prefilledMessage;
    }
    await launchUrl(
      baseUri.replace(
        queryParameters: queryParameters.isEmpty ? null : queryParameters,
      ),
      mode: LaunchMode.externalApplication,
    );
  }

  Color _highlightColor(BeninShieldColors colors, String colorName) {
    return switch (colorName.toLowerCase()) {
      'red' => colors.danger,
      'amber' => colors.brand,
      _ => colors.warning,
    };
  }

  String _previewText(HistoryEntry item) {
    final String preview = item.messagePreview?.trim() ?? '';
    if (preview.isNotEmpty) {
      return preview;
    }
    final String category = item.primaryCategory?.trim() ?? '';
    if (category.isNotEmpty) {
      return category;
    }
    return 'Signal mobile';
  }

  Widget _buildHighlightedMessage(BuildContext context, HistoryEntry item) {
    final BeninShieldColors colors = context.shieldColors;
    final String message = item.messageBody?.trim() ?? _previewText(item);
    if (message.isEmpty || item.highlightedSpans.isEmpty) {
      return SelectableText(
        message,
        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: colors.onSurface,
              height: 1.45,
            ),
      );
    }

    final List<InlineSpan> spans = <InlineSpan>[];
    int cursor = 0;
    final List<HistoryHighlightedSpan> orderedSpans = item.highlightedSpans.toList(growable: false)
      ..sort((HistoryHighlightedSpan a, HistoryHighlightedSpan b) => a.start.compareTo(b.start));

    for (final HistoryHighlightedSpan span in orderedSpans) {
      final int safeStart = span.start.clamp(0, message.length).toInt();
      final int safeEnd = span.end.clamp(safeStart, message.length).toInt();
      if (safeStart > cursor) {
        spans.add(
          TextSpan(
            text: message.substring(cursor, safeStart),
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: colors.onSurface,
                  height: 1.45,
                ),
          ),
        );
      }
      if (safeEnd > safeStart) {
        final Color tone = _highlightColor(colors, span.color);
        spans.add(
          TextSpan(
            text: message.substring(safeStart, safeEnd),
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: colors.onSurface,
                  height: 1.45,
                  fontWeight: FontWeight.w700,
                  backgroundColor: tone.withValues(alpha: 0.18),
                ),
          ),
        );
      }
      cursor = safeEnd;
    }

    if (cursor < message.length) {
      spans.add(
        TextSpan(
          text: message.substring(cursor),
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: colors.onSurface,
                height: 1.45,
              ),
        ),
      );
    }

    return SelectableText.rich(TextSpan(children: spans));
  }

  Future<void> _showDetails(BuildContext context, HistoryEntry item) async {
    final BeninShieldColors colors = context.shieldColors;
    final Color accent = _riskColor(colors, item.riskLevel);
    await showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      useSafeArea: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (BuildContext context) {
        final double bottomInset = MediaQuery.of(context).viewPadding.bottom;
        return FractionallySizedBox(
          heightFactor: 0.84,
          child: Container(
            decoration: BoxDecoration(
              color: colors.surface,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
            ),
            child: Column(
              children: <Widget>[
                const SizedBox(height: 10),
                Container(
                  width: 48,
                  height: 4,
                  decoration: BoxDecoration(
                    color: colors.outlineSoft,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    padding: EdgeInsets.fromLTRB(20, 18, 20, bottomInset + 28),
                    child: Column(
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
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Text(
                                    item.maskedPhone,
                                    style: Theme.of(context).textTheme.headlineSmall,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    DateFormat('dd MMM yyyy - HH:mm').format(item.createdAt),
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
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
                        Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: <Widget>[
                            _DetailPill(label: 'Score ${item.riskScore}/100'),
                            if (item.status != null) _DetailPill(label: item.status!),
                            if (item.publicReference != null) _DetailPill(label: item.publicReference!),
                            for (final String category in item.categoriesDetected.take(3))
                              _DetailPill(label: category),
                          ],
                        ),
                        if ((item.fonAlert ?? '').trim().isNotEmpty) ...<Widget>[
                          const SizedBox(height: 18),
                          AppPanel(
                            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                            radius: 18,
                            child: Text(
                              item.fonAlert!,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: colors.brand,
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 18),
                        Text('Message analyse', style: Theme.of(context).textTheme.labelLarge),
                        const SizedBox(height: 10),
                        AppPanel(
                          padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
                          radius: 18,
                          child: _buildHighlightedMessage(context, item),
                        ),
                        if (item.highlightedSpans.isNotEmpty) ...<Widget>[
                          const SizedBox(height: 14),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: item.highlightedSpans
                                .map(
                                  (HistoryHighlightedSpan span) => _DetailPill(
                                    label: span.label,
                                    tone: _highlightColor(colors, span.color),
                                  ),
                                )
                                .toList(growable: false),
                          ),
                        ],
                        if (item.explanation.isNotEmpty) ...<Widget>[
                          const SizedBox(height: 22),
                          Text('Pourquoi BCS a alerte', style: Theme.of(context).textTheme.labelLarge),
                          const SizedBox(height: 10),
                          ...item.explanation.map(
                            (String line) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Padding(
                                    padding: const EdgeInsets.only(top: 6),
                                    child: Icon(Symbols.circle, size: 7, color: accent),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(line, style: Theme.of(context).textTheme.bodyMedium),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                        if (item.recommendations.isNotEmpty) ...<Widget>[
                          const SizedBox(height: 16),
                          Text('Conseils immediats', style: Theme.of(context).textTheme.labelLarge),
                          const SizedBox(height: 10),
                          ...item.recommendations.take(3).map(
                            (String line) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Icon(
                                      Symbols.check_circle_rounded,
                                      size: 16,
                                      color: colors.primary,
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(line, style: Theme.of(context).textTheme.bodyMedium),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 22),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            onPressed: () => _openPortal(item),
                            icon: const Icon(Symbols.open_in_new_rounded, size: 18),
                            label: const Text('Ouvrir le portail avec ce message'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
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
                          return RefreshIndicator(
                            onRefresh: _refreshHistory,
                            child: ListView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              children: <Widget>[
                                AppPanel(
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
                                ),
                              ],
                            ),
                          );
                        }

                        return RefreshIndicator(
                          onRefresh: _refreshHistory,
                          child: ListView.separated(
                            physics: const AlwaysScrollableScrollPhysics(),
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
                                                _previewText(item),
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
                      loading: () => RefreshIndicator(
                        onRefresh: _refreshHistory,
                        child: ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: <Widget>[
                            Shimmer.fromColors(
                              baseColor: colors.surfaceLow,
                              highlightColor: colors.surfaceHighest,
                              child: Column(
                                children: List<Widget>.generate(
                                  5,
                                  (int index) => Padding(
                                    padding: EdgeInsets.only(bottom: index == 4 ? 0 : 10),
                                    child: Container(
                                      height: 68,
                                      decoration: BoxDecoration(
                                        color: colors.surfaceLow,
                                        borderRadius: BorderRadius.circular(18),
                                        border: Border.all(color: colors.outlineSoft),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      error: (_, _) => RefreshIndicator(
                        onRefresh: _refreshHistory,
                        child: ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: <Widget>[
                            AppPanel(
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
                          ],
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
    this.tone,
  });

  final String label;
  final Color? tone;

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    final Color resolvedTone = tone ?? colors.onSurface;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: tone == null ? colors.surfaceLow : resolvedTone.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: tone == null ? colors.outlineSoft : resolvedTone.withValues(alpha: 0.24),
        ),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(color: resolvedTone),
      ),
    );
  }
}
