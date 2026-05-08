import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../application/providers.dart';
import '../../core/config/app_config.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/mobile_shield_settings.dart';
import '../../data/models/native_shield_status.dart';
import '../shared/app_panel.dart';
import '../shared/brand_bar.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> with WidgetsBindingObserver {
  Future<void> _refreshSettings() async {
    await ref.read(nativeShieldBridgeProvider).flushPendingQueue(limit: 3);
    ref.invalidate(historyProvider);
    await ref.read(historyProvider.future);
    ref.invalidate(nativeShieldStatusProvider);
    await ref.read(nativeShieldStatusProvider.future);
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
    ref.invalidate(nativeShieldStatusProvider);
  }

  Future<void> _openCitizenPortal() async {
    await launchUrl(
      Uri.parse(AppConfig.citizenPortalUrl),
      mode: LaunchMode.externalApplication,
    );
  }

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    final MobileShieldSettings settings = ref.watch(mobileShieldSettingsProvider);
    final AsyncValue<NativeShieldStatus> statusAsync = ref.watch(nativeShieldStatusProvider);
    final ThemeMode themeMode = ref.watch(themeModeProvider);
    final MobileShieldSettingsController controller =
        ref.read(mobileShieldSettingsProvider.notifier);
    final ThemeModeController themeController = ref.read(themeModeProvider.notifier);
    final NativeShieldStatus? nativeStatus = statusAsync.valueOrNull;
    final int pendingQueueCount = nativeStatus?.pendingQueueCount ?? 0;
    final bool isLightModeEnabled = themeMode == ThemeMode.light;

    return Scaffold(
      body: Column(
        children: <Widget>[
          const BrandBar(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refreshSettings,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 132),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                  Text('Parametres', style: Theme.of(context).textTheme.headlineLarge)
                      .animate()
                      .fadeIn(duration: 260.ms)
                      .slideY(begin: 0.08, end: 0),
                  const SizedBox(height: 8),
                  Text(
                    'Controle du service, applications surveillees et niveau d alerte.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colors.muted),
                  ).animate().fadeIn(delay: 60.ms, duration: 260.ms),
                  const SizedBox(height: 18),
                  _SectionHeader(
                    icon: Symbols.shield_rounded,
                    label: 'Protection',
                  ),
                  const SizedBox(height: 10),
                  AppPanel(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                    radius: 22,
                    child: Column(
                      children: <Widget>[
                        _SettingSwitchRow(
                          icon: Symbols.shield_rounded,
                          title: 'Service actif',
                          subtitle: settings.hasActiveMonitoring
                              ? 'Surveillance des applications selectionnees'
                              : 'Protection desactivee jusqu a reactivation',
                          value: settings.hasActiveMonitoring,
                          onChanged: controller.setServiceActive,
                        ),
                        const SizedBox(height: 10),
                        _StatusInlineRow(
                          icon: Symbols.sync_rounded,
                          title: 'File locale',
                          value: pendingQueueCount > 0
                              ? '$pendingQueueCount en attente'
                              : 'Aucune attente',
                          color: pendingQueueCount > 0 ? colors.warning : colors.primary,
                        ),
                        const SizedBox(height: 14),
                        Divider(color: colors.outlineSoft),
                        const SizedBox(height: 14),
                        _StatusInlineRow(
                          icon: Symbols.notifications_active_rounded,
                          title: 'Notifications',
                          value: nativeStatus?.notificationAccessGranted == true ? 'Accordees' : 'A activer',
                          color: nativeStatus?.notificationAccessGranted == true
                              ? colors.primary
                              : colors.warning,
                        ),
                        const SizedBox(height: 10),
                        _StatusInlineRow(
                          icon: Symbols.battery_saver_rounded,
                          title: 'Batterie',
                          value: nativeStatus?.batteryOptimizationIgnored == true ? 'Protegee' : 'A verifier',
                          color: nativeStatus?.batteryOptimizationIgnored == true
                              ? colors.primary
                              : colors.warning,
                        ),
                        const SizedBox(height: 14),
                        Divider(color: colors.outlineSoft),
                        const SizedBox(height: 14),
                        Row(
                          children: <Widget>[
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () async {
                                  await ref.read(nativeShieldBridgeProvider).openNotificationAccessSettings();
                                  ref.invalidate(nativeShieldStatusProvider);
                                },
                                icon: const Icon(Symbols.settings_rounded, size: 18),
                                label: const Text('Notifications'),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () async {
                                  await ref
                                      .read(nativeShieldBridgeProvider)
                                      .requestIgnoreBatteryOptimizations();
                                  ref.invalidate(nativeShieldStatusProvider);
                                },
                                icon: const Icon(Symbols.battery_saver_rounded, size: 18),
                                label: const Text('Batterie'),
                              ),
                            ),
                          ],
                        ),
                        if ((nativeStatus?.postNotificationsGranted ?? true) == false) ...<Widget>[
                          const SizedBox(height: 10),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton.icon(
                              onPressed: () async {
                                await ref
                                    .read(nativeShieldBridgeProvider)
                                    .requestPostNotificationsPermission();
                                ref.invalidate(nativeShieldStatusProvider);
                              },
                              icon: const Icon(Symbols.notifications_rounded, size: 18),
                              label: const Text('Autoriser les alertes'),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ).animate().fadeIn(delay: 90.ms, duration: 260.ms).slideY(begin: 0.1, end: 0),
                  const SizedBox(height: 18),
                  _SectionHeader(
                    icon: Symbols.apps_rounded,
                    label: 'Apps surveillees',
                  ),
                  const SizedBox(height: 10),
                  AppPanel(
                    padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
                    radius: 22,
                    child: Row(
                      children: <Widget>[
                        Expanded(
                          child: _AppToggleTile(
                            label: 'SMS',
                            assetName: 'assets/brand/logo_sms.svg',
                            fallbackIcon: Icons.sms_rounded,
                            active: settings.monitorSms,
                            onTap: () => controller.setSms(!settings.monitorSms),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _AppToggleTile(
                            label: 'WhatsApp',
                            assetName: 'assets/brand/logo_whatsapp.svg',
                            fallbackIcon: Icons.chat_bubble_rounded,
                            active: settings.monitorWhatsapp,
                            onTap: () => controller.setWhatsapp(!settings.monitorWhatsapp),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _AppToggleTile(
                            label: 'Messenger',
                            assetName: 'assets/brand/logo_messenger.svg',
                            fallbackIcon: Icons.forum_rounded,
                            active: settings.monitorMessenger,
                            onTap: () => controller.setMessenger(!settings.monitorMessenger),
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(delay: 120.ms, duration: 260.ms).slideY(begin: 0.1, end: 0),
                  const SizedBox(height: 18),
                  _SectionHeader(
                    icon: Symbols.contrast_rounded,
                    label: 'Affichage',
                  ),
                  const SizedBox(height: 10),
                  AppPanel(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                    radius: 22,
                    child: _SettingSwitchRow(
                      icon: Symbols.light_mode_rounded,
                      title: 'Mode clair',
                      subtitle: 'Palette sobre, nette et plus adaptee aux captures imprimees',
                      value: isLightModeEnabled,
                      onChanged: themeController.setLightMode,
                    ),
                  ).animate().fadeIn(delay: 135.ms, duration: 260.ms).slideY(begin: 0.1, end: 0),
                  const SizedBox(height: 18),
                  _SectionHeader(
                    icon: Symbols.tune_rounded,
                    label: 'Alertes',
                  ),
                  const SizedBox(height: 10),
                  AppPanel(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                    radius: 22,
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
                                    'Alerte si le score atteint ${settings.alertThreshold}',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: colors.primary.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                '${settings.alertThreshold}',
                                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                      color: colors.primary,
                                      fontWeight: FontWeight.w800,
                                    ),
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
                        const SizedBox(height: 4),
                        _SettingSwitchRow(
                          icon: Symbols.warning_rounded,
                          title: 'Alertes moyen',
                          subtitle: 'Notifier aussi les scores moyens',
                          value: settings.alertMedium,
                          onChanged: controller.setAlertMedium,
                        ),
                      ],
                    ),
                  ).animate().fadeIn(delay: 150.ms, duration: 260.ms).slideY(begin: 0.1, end: 0),
                  const SizedBox(height: 18),
                  _SectionHeader(
                    icon: Symbols.info_rounded,
                    label: 'A propos',
                  ),
                  const SizedBox(height: 10),
                  AppPanel(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                    radius: 22,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text('Plateforme web BCS', style: Theme.of(context).textTheme.labelLarge),
                        const SizedBox(height: 8),
                        Text(
                          'Le portail web sert a la verification poussee, aux preuves et au signalement formel.',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: _openCitizenPortal,
                            icon: const Icon(Symbols.open_in_new_rounded, size: 18),
                            label: const Text('Visiter la plateforme web'),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'BENIN CYBER SHIELD - v1.0.0',
                          style: Theme.of(context).textTheme.labelSmall,
                        ),
                      ],
                    ),
                  ).animate().fadeIn(delay: 180.ms, duration: 260.ms).slideY(begin: 0.1, end: 0),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    return Row(
      children: <Widget>[
        Icon(icon, color: colors.brand, size: 16),
        const SizedBox(width: 8),
        Text(label, style: Theme.of(context).textTheme.labelLarge),
      ],
    );
  }
}

class _SettingSwitchRow extends StatelessWidget {
  const _SettingSwitchRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    return Row(
      children: <Widget>[
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: colors.surfaceLow,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: colors.outlineSoft),
          ),
          child: Icon(icon, size: 18, color: colors.brand),
        ),
        const SizedBox(width: 12),
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
          onChanged: onChanged,
        ),
      ],
    );
  }
}

class _StatusInlineRow extends StatelessWidget {
  const _StatusInlineRow({
    required this.icon,
    required this.title,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String title;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    return Row(
      children: <Widget>[
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: colors.surfaceLow,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: colors.outlineSoft),
          ),
          child: Icon(icon, size: 18, color: color),
        ),
        const SizedBox(width: 12),
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
                  fontWeight: FontWeight.w800,
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
    required this.assetName,
    required this.fallbackIcon,
    required this.active,
    required this.onTap,
  });

  final String label;
  final String assetName;
  final IconData fallbackIcon;
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
              _SvgAssetIcon(
                assetName: assetName,
                fallbackIcon: fallbackIcon,
                color: tone,
                size: 18,
              ),
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

class _SvgAssetIcon extends StatelessWidget {
  const _SvgAssetIcon({
    required this.assetName,
    required this.fallbackIcon,
    required this.color,
    required this.size,
  });

  final String assetName;
  final IconData fallbackIcon;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String>(
      future: DefaultAssetBundle.of(context).loadString(assetName),
      builder: (BuildContext context, AsyncSnapshot<String> snapshot) {
        if (!snapshot.hasData || snapshot.data == null || snapshot.data!.isEmpty) {
          return Icon(fallbackIcon, size: size, color: color);
        }
        return SvgPicture.string(
          snapshot.data!,
          width: size,
          height: size,
        );
      },
    );
  }
}
