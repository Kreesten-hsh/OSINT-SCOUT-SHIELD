import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/providers.dart';
import '../../core/config/app_config.dart';
import '../shared/app_panel.dart';
import '../shared/page_header.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<String> deviceIdAsync = ref.watch(deviceInstallIdProvider);
    final String? resolvedDeviceId = deviceIdAsync.valueOrNull;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const PageHeader(
                title: 'Parametres',
                subtitle: 'Controle l onboarding, l identifiant de l appareil et le cache local de l application.',
              ),
              const SizedBox(height: 16),
              AppPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text('IDENTIFIANT APPAREIL', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    Text(resolvedDeviceId ?? 'Chargement...'),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: resolvedDeviceId == null
                          ? null
                          : () async {
                              await Clipboard.setData(ClipboardData(text: resolvedDeviceId));
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Identifiant copie.')),
                                );
                              }
                            },
                      child: const Text('Copier l identifiant de l appareil'),
                    ),
                    const SizedBox(height: 16),
                    Text('APPLICATION', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    Text('Version ${AppConfig.minSupportedVersion}'),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: <Widget>[
                        FilledButton.tonal(
                          onPressed: () async {
                            await ref.read(installStoreProvider).setOnboardingCompleted(false);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Onboarding reinitialise.')),
                              );
                            }
                          },
                          child: const Text('Reinitialiser l onboarding'),
                        ),
                        FilledButton.tonal(
                          onPressed: () async {
                            await ref.read(installStoreProvider).clearLocalData();
                            ref.invalidate(deviceInstallIdProvider);
                            ref.invalidate(historyProvider);
                            ref.invalidate(onboardingCompletedProvider);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Cache local vide.')),
                              );
                            }
                          },
                          child: const Text('Vider les donnees locales'),
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
