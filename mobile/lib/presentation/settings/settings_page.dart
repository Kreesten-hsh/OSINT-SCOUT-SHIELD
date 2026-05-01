import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../application/providers.dart';
import '../../core/config/app_config.dart';
import '../../core/theme/app_theme.dart';
import '../shared/app_panel.dart';
import '../shared/brand_bar.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final BeninShieldColors colors = context.shieldColors;
    final AsyncValue<String> deviceIdAsync = ref.watch(deviceInstallIdProvider);
    final String? resolvedDeviceId = deviceIdAsync.valueOrNull;

    return Scaffold(
      body: Column(
        children: <Widget>[
          BrandBar(
            trailing: IconButton(
              onPressed: () {
                if (context.canPop()) {
                  context.pop();
                  return;
                }
                context.go('/verify');
              },
              icon: const Icon(Icons.close_rounded),
            ),
            showSettingsShortcut: false,
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('Paramètres', style: Theme.of(context).textTheme.headlineLarge),
                  const SizedBox(height: 12),
                  Text(
                    'Configuration locale de l application et de ton historique mobile.',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: colors.muted),
                  ),
                  const SizedBox(height: 24),
                  Text('ANALYSE & SÉCURITÉ', style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 14),
                  AppPanel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        _SettingRow(
                          title: 'Mode d analyse',
                          subtitle: 'Analyse manuelle citoyenne',
                          trailing: Chip(label: const Text('MANUEL')),
                        ),
                        Divider(color: colors.outlineSoft),
                        const SizedBox(height: 14),
                        _SettingRow(
                          title: 'Historique backend',
                          subtitle: 'Actif via identifiant d installation',
                          trailing: Switch(
                            value: true,
                            onChanged: null,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 26),
                  Text('APPLICATION', style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 14),
                  AppPanel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text('IDENTIFIANT APPAREIL', style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 10),
                        Text(
                          resolvedDeviceId ?? 'Chargement...',
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colors.onSurface),
                        ),
                        const SizedBox(height: 16),
                        OutlinedButton(
                          onPressed: resolvedDeviceId == null
                              ? null
                              : () async {
                                  await Clipboard.setData(ClipboardData(text: resolvedDeviceId));
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Identifiant copié.')),
                                    );
                                  }
                                },
                          child: const Text('COPIER L IDENTIFIANT'),
                        ),
                        const SizedBox(height: 16),
                        Divider(color: colors.outlineSoft),
                        const SizedBox(height: 16),
                        _SettingRow(
                          title: 'Version du système',
                          subtitle: 'Obsidian citizen build',
                          trailing: Text(
                            AppConfig.minSupportedVersion,
                            style: Theme.of(context).textTheme.labelLarge?.copyWith(color: colors.primarySoft),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 26),
                  Text('DONNÉES LOCALES', style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 14),
                  AppPanel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        FilledButton.tonal(
                          onPressed: () async {
                            await ref.read(installStoreProvider).setOnboardingCompleted(false);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Onboarding réinitialisé.')),
                              );
                            }
                          },
                          child: const Text('REVOIR L ONBOARDING'),
                        ),
                        const SizedBox(height: 12),
                        OutlinedButton(
                          onPressed: () async {
                            await ref.read(installStoreProvider).clearLocalData();
                            ref.invalidate(deviceInstallIdProvider);
                            ref.invalidate(historyProvider);
                            ref.invalidate(onboardingCompletedProvider);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Données locales vidées.')),
                              );
                            }
                          },
                          child: const Text('VIDER LES DONNÉES LOCALES'),
                        ),
                      ],
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

class _SettingRow extends StatelessWidget {
  const _SettingRow({
    required this.title,
    required this.subtitle,
    required this.trailing,
  });

  final String title;
  final String subtitle;
  final Widget trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: <Widget>[
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(title, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 4),
              Text(subtitle, style: Theme.of(context).textTheme.labelSmall),
            ],
          ),
        ),
        const SizedBox(width: 16),
        trailing,
      ],
    );
  }
}
