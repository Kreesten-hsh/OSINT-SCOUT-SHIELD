import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../application/providers.dart';
import '../../data/models/report_result.dart';
import '../shared/app_panel.dart';
import '../shared/page_header.dart';

class ReportConfirmationPage extends ConsumerWidget {
  const ReportConfirmationPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ReportState reportState = ref.watch(reportControllerProvider);
    final ReportResult? result = reportState.result;

    if (result == null) {
      return Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: <Widget>[
                const PageHeader(
                  title: 'Confirmation indisponible',
                  subtitle: 'Aucun signalement mobile recent n est disponible.',
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => context.go('/verify'),
                  child: const Text('Retour'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const PageHeader(
                title: 'Signalement confirme',
                subtitle: 'La reference publique est generee et l historique mobile sera mis a jour.',
              ),
              const SizedBox(height: 16),
              AppPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text('REFERENCE PUBLIQUE', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    Text(result.publicReference ?? '-', style: Theme.of(context).textTheme.headlineMedium),
                    const SizedBox(height: 16),
                    Text('STATUT', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    Text(result.status, style: Theme.of(context).textTheme.bodyLarge),
                    const SizedBox(height: 20),
                    Row(
                      children: <Widget>[
                        Expanded(
                          child: FilledButton(
                            onPressed: () => context.go('/history'),
                            child: const Text('Voir l historique'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => context.go('/verify'),
                            child: const Text('Nouvelle verification'),
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
