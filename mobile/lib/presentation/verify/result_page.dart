import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../application/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/verify_result.dart';
import '../shared/app_panel.dart';
import '../shared/page_header.dart';

class ResultPage extends ConsumerWidget {
  const ResultPage({super.key});

  Color _highlightColor(BuildContext context, String tokenColor) {
    final BeninShieldColors colors = context.shieldColors;
    return switch (tokenColor.toLowerCase()) {
      'red' => colors.danger,
      'orange' => colors.warning,
      'amber' => const Color(0xFFB68A2D),
      'green' => colors.success,
      _ => Theme.of(context).colorScheme.secondary,
    };
  }

  Future<void> _share(VerifyDraft draft, VerifyResult result) async {
    final String label = result.riskLevel == 'HIGH' ? 'DANGER' : 'ALERTE';
    final String text = <String>[
      'BENIN CYBER SHIELD',
      '$label - ${draft.phone}',
      'Score ${result.riskScore}/100',
      'Conseil: ne partage aucun code OTP ou PIN.',
    ].join('\n');
    await Share.share(text);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final VerifyState state = ref.watch(verifyControllerProvider);
    final VerifyResult? result = state.result;
    final VerifyDraft? draft = state.draft;

    if (result == null || draft == null) {
      return Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: <Widget>[
                const PageHeader(
                  title: 'Resultat indisponible',
                  subtitle: 'Lance d abord une verification depuis l onglet Verifier.',
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () => context.go('/verify'),
                    child: const Text('Retour a la verification'),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final BeninShieldColors colors = context.shieldColors;
    final Color riskColor = switch (result.riskLevel) {
      'HIGH' => colors.danger,
      'MEDIUM' => colors.warning,
      _ => colors.success,
    };
    final List<String> adviceItems =
        result.recommendations.isNotEmpty ? result.recommendations : result.citizenAdvice;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              PageHeader(
                title: 'Resultat de verification',
                subtitle: 'Score, niveau de risque, conseils et recidive pour le numero analyse.',
                trailing: Text(
                  '${result.riskScore}/100',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: riskColor),
                ),
              ),
              const SizedBox(height: 16),
              AppPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text('NIVEAU DE RISQUE', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    Text(
                      result.riskLevel,
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: riskColor),
                    ),
                    if (result.resolvedDepartment != null) ...<Widget>[
                      const SizedBox(height: 12),
                      Text('DEPARTEMENT', style: Theme.of(context).textTheme.labelMedium),
                      const SizedBox(height: 8),
                      Text(
                        '${result.resolvedDepartment} (${result.departmentSource})',
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                    ],
                    if (result.highlightedSpans.isNotEmpty) ...<Widget>[
                      const SizedBox(height: 16),
                      Text('INDICES SUSPECTS', style: Theme.of(context).textTheme.labelMedium),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: result.highlightedSpans
                            .map(
                              (HighlightedSpan span) => Chip(
                                backgroundColor: _highlightColor(context, span.color).withValues(alpha: 0.18),
                                side: BorderSide(
                                  color: _highlightColor(context, span.color).withValues(alpha: 0.55),
                                ),
                                label: Text(
                                  span.label.isEmpty ? span.rule : span.label,
                                  style: TextStyle(color: _highlightColor(context, span.color)),
                                ),
                              ),
                            )
                            .toList(growable: false),
                      ),
                    ],
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: result.categoriesDetected
                          .map((String item) => Chip(label: Text(item.replaceAll('_', ' '))))
                          .toList(growable: false),
                    ),
                    const SizedBox(height: 16),
                    Text('CONSEILS', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    for (final String item in adviceItems)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text('- $item', style: Theme.of(context).textTheme.bodyMedium),
                      ),
                    if (result.fonAlert != null) ...<Widget>[
                      const SizedBox(height: 16),
                      Text('ALERTE FON', style: Theme.of(context).textTheme.labelMedium),
                      const SizedBox(height: 8),
                      Text(result.fonAlert!, style: Theme.of(context).textTheme.bodyLarge),
                    ],
                    const SizedBox(height: 16),
                    Text('RECIDIVE', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    Text(
                      '${result.recurrenceCount} signalement(s) precedents sur ce numero',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: <Widget>[
                        Expanded(
                          child: FilledButton(
                            onPressed: () => context.go('/verify/report'),
                            child: const Text('Signaler'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => _share(draft, result),
                            child: const Text('Partager'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
