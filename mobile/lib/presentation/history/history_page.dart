import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../application/providers.dart';
import '../../data/models/history_entry.dart';
import '../shared/app_panel.dart';
import '../shared/page_header.dart';

class HistoryPage extends ConsumerStatefulWidget {
  const HistoryPage({super.key});

  @override
  ConsumerState<HistoryPage> createState() => _HistoryPageState();
}

class _HistoryPageState extends ConsumerState<HistoryPage> {
  HistoryEntryType? _filter;

  @override
  Widget build(BuildContext context) {
    final AsyncValue<List<HistoryEntry>> historyAsync = ref.watch(historyProvider);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: <Widget>[
              const PageHeader(
                title: 'Historique',
                subtitle: 'Recupere depuis le backend grace a l identifiant de ton installation mobile.',
              ),
              const SizedBox(height: 16),
              Row(
                children: <Widget>[
                  ChoiceChip(
                    label: const Text('Tous'),
                    selected: _filter == null,
                    onSelected: (_) => setState(() => _filter = null),
                  ),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: const Text('Verifications'),
                    selected: _filter == HistoryEntryType.verify,
                    onSelected: (_) => setState(() => _filter = HistoryEntryType.verify),
                  ),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: const Text('Signalements'),
                    selected: _filter == HistoryEntryType.report,
                    onSelected: (_) => setState(() => _filter = HistoryEntryType.report),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: historyAsync.when(
                  data: (List<HistoryEntry> items) {
                    final List<HistoryEntry> filtered = _filter == null
                        ? items
                        : items.where((HistoryEntry item) => item.type == _filter).toList(growable: false);
                    if (filtered.isEmpty) {
                      return const AppPanel(
                        child: Center(
                          child: Text('Aucun element dans l historique.'),
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
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (BuildContext context, int index) {
                          final HistoryEntry item = filtered[index];
                          return AppPanel(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: <Widget>[
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: <Widget>[
                                    Text(
                                      item.type == HistoryEntryType.report ? 'Signalement' : 'Verification',
                                      style: Theme.of(context).textTheme.labelLarge,
                                    ),
                                    Text(DateFormat('dd MMM yyyy, HH:mm').format(item.createdAt)),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text('Numero: ${item.maskedPhone}'),
                                Text('Score: ${item.riskScore}/100 - ${item.riskLevel}'),
                                if (item.primaryCategory != null) Text('Categorie: ${item.primaryCategory}'),
                                if (item.publicReference != null) Text('Reference: ${item.publicReference}'),
                              ],
                            ),
                          );
                        },
                      ),
                    );
                  },
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (_, _) => const AppPanel(
                    child: Center(
                      child: Text('Impossible de charger l historique mobile.'),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
