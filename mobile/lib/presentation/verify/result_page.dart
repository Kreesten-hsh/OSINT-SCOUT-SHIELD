import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../application/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/verify_result.dart';
import '../shared/app_panel.dart';
import '../shared/brand_bar.dart';

class ResultPage extends ConsumerWidget {
  const ResultPage({super.key});

  Color _riskColor(BeninShieldColors colors, String riskLevel) {
    return switch (riskLevel) {
      'FORT' => colors.danger,
      'MOYEN' => colors.warning,
      _ => colors.success,
    };
  }

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
    final String label = result.riskLevel == 'FORT' ? 'DANGER' : 'ALERTE';
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
        body: Column(
          children: <Widget>[
            const BrandBar(),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text('Résultat indisponible', style: Theme.of(context).textTheme.headlineLarge),
                    const SizedBox(height: 12),
                    Text(
                      'Lance d abord une vérification depuis l onglet Vérifier.',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: () => context.go('/verify'),
                      child: const Text('RETOUR À LA VÉRIFICATION'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }

    final BeninShieldColors colors = context.shieldColors;
    final Color riskColor = _riskColor(colors, result.riskLevel);
    final List<String> adviceItems =
        result.recommendations.isNotEmpty ? result.recommendations : result.citizenAdvice;

    return Scaffold(
      body: Column(
        children: <Widget>[
          Container(
            color: riskColor.withValues(alpha: 0.12),
            child: const BrandBar(),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  AppPanel(
                    padding: const EdgeInsets.fromLTRB(22, 20, 22, 22),
                    glowColor: riskColor,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: <Widget>[
                            Row(
                              children: <Widget>[
                                Icon(Icons.warning_amber_rounded, color: riskColor),
                                const SizedBox(width: 10),
                                Text(
                                  'NIVEAU D ALERTE',
                                  style: Theme.of(context).textTheme.labelMedium?.copyWith(color: riskColor),
                                ),
                              ],
                            ),
                            Chip(
                              label: Text(result.riskLevel),
                            ),
                          ],
                        ),
                        const SizedBox(height: 22),
                        Center(
                          child: SizedBox(
                            width: 132,
                            height: 132,
                            child: Stack(
                              alignment: Alignment.center,
                              children: <Widget>[
                                SizedBox(
                                  width: 132,
                                  height: 132,
                                  child: CircularProgressIndicator(
                                    value: result.riskScore / 100,
                                    strokeWidth: 8,
                                    backgroundColor: colors.outlineSoft,
                                    valueColor: AlwaysStoppedAnimation<Color>(riskColor),
                                  ),
                                ),
                                Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: <Widget>[
                                    Text(
                                      '${result.riskScore}',
                                      style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                                            fontSize: 42,
                                            color: riskColor,
                                          ),
                                    ),
                                    Text('/100', style: Theme.of(context).textTheme.labelSmall),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        Center(
                          child: Text(
                            result.riskLevel == 'FORT'
                                ? 'Risque de fraude fort'
                                : result.riskLevel == 'MOYEN'
                                    ? 'Risque à confirmer'
                                    : 'Risque faible',
                            style: Theme.of(context).textTheme.headlineMedium,
                            textAlign: TextAlign.center,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Center(
                          child: Text(
                            result.explanation.isNotEmpty
                                ? result.explanation.join(' ')
                                : 'Ce message présente plusieurs indicateurs de tentative de fraude.',
                            style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: colors.muted),
                            textAlign: TextAlign.center,
                          ),
                        ),
                        if (result.categoriesDetected.isNotEmpty) ...<Widget>[
                          const SizedBox(height: 18),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: result.categoriesDetected
                                .map((String item) => Chip(label: Text(item.replaceAll('_', ' '))))
                                .toList(growable: false),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text('Analyse détaillée', style: Theme.of(context).textTheme.headlineLarge),
                  const SizedBox(height: 14),
                  AppPanel(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Row(
                          children: <Widget>[
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: colors.surfaceHighest.withValues(alpha: 0.72),
                                border: Border.all(color: colors.outlineSoft),
                              ),
                              child: Icon(Icons.history_toggle_off_rounded, color: riskColor),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Text('Indicateur de récidive', style: Theme.of(context).textTheme.labelLarge),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Ce numéro a déjà été rencontré ${result.recurrenceCount} fois dans la base.',
                                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: colors.muted),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        Divider(color: colors.outlineSoft),
                        const SizedBox(height: 18),
                        Text('TEXTE ANALYSÉ', style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 10),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: colors.surfaceLow,
                            borderRadius: BorderRadius.circular(22),
                            border: Border.all(color: colors.outlineSoft),
                          ),
                          child: Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: result.highlightedSpans.isEmpty
                                ? <Widget>[
                                    Text(draft.message, style: Theme.of(context).textTheme.bodyLarge),
                                  ]
                                : result.highlightedSpans
                                    .map(
                                      (HighlightedSpan span) => Chip(
                                        backgroundColor:
                                            _highlightColor(context, span.color).withValues(alpha: 0.16),
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
                        ),
                        if (result.resolvedDepartment != null) ...<Widget>[
                          const SizedBox(height: 18),
                          Text('DÉPARTEMENT', style: Theme.of(context).textTheme.labelMedium),
                          const SizedBox(height: 8),
                          Text(
                            '${result.resolvedDepartment} (${result.departmentSource})',
                            style: Theme.of(context).textTheme.bodyLarge,
                          ),
                        ],
                        const SizedBox(height: 18),
                        Text('CONSEILS', style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 8),
                        for (final String item in adviceItems)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Text('- $item', style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: colors.muted)),
                          ),
                        if (result.fonAlert != null) ...<Widget>[
                          const SizedBox(height: 14),
                          Text('ALERTE FON', style: Theme.of(context).textTheme.labelMedium),
                          const SizedBox(height: 8),
                          Text(result.fonAlert!, style: Theme.of(context).textTheme.bodyLarge),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => context.go('/verify/report'),
                      style: FilledButton.styleFrom(
                        backgroundColor: riskColor.withValues(alpha: 0.95),
                        foregroundColor: colors.background,
                      ),
                      child: const Text('SIGNALER FORMELLEMENT'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => _share(draft, result),
                      child: const Text('PARTAGER SUR WHATSAPP'),
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
