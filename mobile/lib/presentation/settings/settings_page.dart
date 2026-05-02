import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../application/providers.dart';
import '../../core/config/app_config.dart';
import '../../core/theme/app_theme.dart';
import '../shared/app_panel.dart';
import '../shared/brand_bar.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  Future<void> _openCitizenPortal() async {
    await launchUrl(
      Uri.parse(AppConfig.citizenPortalUrl),
      mode: LaunchMode.externalApplication,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final BeninShieldColors colors = context.shieldColors;
    final MobileShieldSettings settings = ref.watch(mobileShieldSettingsProvider);
    final MobileShieldSettingsController controller =
        ref.read(mobileShieldSettingsProvider.notifier);

    return Scaffold(
      body: Column(
        children: <Widget>[
          const BrandBar(),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 132),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('Paramètres', style: Theme.of(context).textTheme.headlineLarge),
                  const SizedBox(height: 10),
                  Text(
                    'Contrôle du service, apps surveillées et règles d’alerte.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colors.muted),
                  ),
                  const SizedBox(height: 18),
                  Text('Protection', style: Theme.of(context).textTheme.labelLarge),
                  const SizedBox(height: 10),
                  AppPanel(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                    radius: 20,
                    child: Column(
                      children: <Widget>[
                        _SettingSwitchRow(
                          title: 'Service actif',
                          subtitle: 'Surveillance des apps sélectionnées',
                          value: settings.hasActiveMonitoring,
                          onChanged: (_) {},
                          enabled: false,
                        ),
                        const SizedBox(height: 14),
                        Divider(color: colors.outlineSoft),
                        const SizedBox(height: 14),
                        _StatusInlineRow(
                          title: 'Notifications',
                          value: 'Autorisées',
                          color: colors.primary,
                        ),
                        const SizedBox(height: 10),
                        _StatusInlineRow(
                          title: 'Batterie',
                          value: 'À optimiser',
                          color: colors.warning,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text('Apps surveillées', style: Theme.of(context).textTheme.labelLarge),
                  const SizedBox(height: 10),
                  AppPanel(
                    padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
                    radius: 20,
                    child: Row(
                      children: <Widget>[
                        Expanded(
                          child: _AppToggleTile(
                            label: 'SMS',
                            icon: Icons.sms_rounded,
                            active: settings.monitorSms,
                            onTap: () => controller.setSms(!settings.monitorSms),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _AppToggleTile(
                            label: 'WhatsApp',
                            icon: Icons.forum_rounded,
                            active: settings.monitorWhatsapp,
                            onTap: () => controller.setWhatsapp(!settings.monitorWhatsapp),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _AppToggleTile(
                            label: 'Messenger',
                            icon: Icons.chat_bubble_rounded,
                            active: settings.monitorMessenger,
                            onTap: () => controller.setMessenger(!settings.monitorMessenger),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text('Alertes', style: Theme.of(context).textTheme.labelLarge),
                  const SizedBox(height: 10),
                  AppPanel(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                    radius: 20,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Row(
                          children: <Widget>[
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Text('Seuil de notification', style: Theme.of(context).textTheme.labelLarge),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Alerte si score ≥ ${settings.alertThreshold}',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              '${settings.alertThreshold}',
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                    color: colors.primary,
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                          ],
                        ),
                        Slider(
                          value: settings.alertThreshold.toDouble(),
                          min: 40,
                          max: 95,
                          divisions: 11,
                          onChanged: controller.setThreshold,
                        ),
                        const SizedBox(height: 6),
                        _SettingSwitchRow(
                          title: 'Alertes moyen',
                          subtitle: 'Notifier aussi les scores moyens',
                          value: settings.alertMedium,
                          onChanged: controller.setAlertMedium,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text('À propos', style: Theme.of(context).textTheme.labelLarge),
                  const SizedBox(height: 10),
                  AppPanel(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                    radius: 20,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text('Plateforme web BCS', style: Theme.of(context).textTheme.labelLarge),
                        const SizedBox(height: 8),
                        Text(
                          'Le portail web sert à la vérification détaillée, aux preuves et au signalement formel.',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: _openCitizenPortal,
                            icon: const Icon(Icons.open_in_new_rounded),
                            label: const Text('Visiter la plateforme web'),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'BENIN CYBER SHIELD · v1.0.0',
                          style: Theme.of(context).textTheme.labelSmall,
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

class _SettingSwitchRow extends StatelessWidget {
  const _SettingSwitchRow({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
    this.enabled = true,
  });

  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: <Widget>[
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(title, style: Theme.of(context).textTheme.labelLarge),
              const SizedBox(height: 4),
              Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
        Switch(
          value: value,
          onChanged: enabled ? onChanged : null,
        ),
      ],
    );
  }
}

class _StatusInlineRow extends StatelessWidget {
  const _StatusInlineRow({
    required this.title,
    required this.value,
    required this.color,
  });

  final String title;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: <Widget>[
        Expanded(
          child: Text(title, style: Theme.of(context).textTheme.bodyLarge),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            value,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w700,
                ),
          ),
        ),
      ],
    );
  }
}

class _AppToggleTile extends StatelessWidget {
  const _AppToggleTile({
    required this.label,
    required this.icon,
    required this.active,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    final Color tone = active ? colors.primary : colors.muted;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
          decoration: BoxDecoration(
            color: active ? colors.primary.withValues(alpha: 0.1) : colors.surfaceLow,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: active ? colors.primary.withValues(alpha: 0.24) : colors.outlineSoft,
            ),
          ),
          child: Column(
            children: <Widget>[
              Icon(icon, color: tone, size: 18),
              const SizedBox(height: 8),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: tone,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
