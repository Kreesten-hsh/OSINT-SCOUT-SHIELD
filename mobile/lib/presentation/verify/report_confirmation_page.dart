import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../application/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/report_result.dart';
import '../shared/app_panel.dart';
import '../shared/brand_bar.dart';

class ReportConfirmationPage extends ConsumerWidget {
  const ReportConfirmationPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final BeninShieldColors colors = context.shieldColors;
    final ReportState reportState = ref.watch(reportControllerProvider);
    final ReportResult? result = reportState.result;

    if (result == null) {
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
                    Text('Confirmation indisponible', style: Theme.of(context).textTheme.headlineLarge),
                    const SizedBox(height: 12),
                    Text(
                      'Aucun signalement mobile récent n est disponible.',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: () => context.go('/verify'),
                      child: const Text('RETOUR'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      body: Column(
        children: <Widget>[
          const BrandBar(),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  AppPanel(
                    padding: const EdgeInsets.fromLTRB(22, 24, 22, 24),
                    glowColor: colors.primary,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: colors.primary.withValues(alpha: 0.14),
                            border: Border.all(color: colors.primary.withValues(alpha: 0.35)),
                          ),
                          child: Icon(Icons.check_rounded, size: 34, color: colors.primarySoft),
                        ),
                        const SizedBox(height: 22),
                        Text('Signalement confirmé', style: Theme.of(context).textTheme.headlineLarge),
                        const SizedBox(height: 12),
                        Text(
                          'La référence publique est générée et l historique mobile sera mis à jour.',
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: colors.muted),
                        ),
                        const SizedBox(height: 24),
                        Text('RÉFÉRENCE PUBLIQUE', style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 10),
                        Text(result.publicReference ?? '-', style: Theme.of(context).textTheme.headlineMedium),
                        const SizedBox(height: 20),
                        Text('STATUT', style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 10),
                        Chip(label: Text(result.status)),
                      ],
                    ),
                  ),
                  const Spacer(),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => context.go('/history'),
                      child: const Text('VOIR L HISTORIQUE'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => context.go('/verify'),
                      child: const Text('NOUVELLE VÉRIFICATION'),
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
