import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';

import '../../application/providers.dart';
import '../../core/theme/app_theme.dart';
import '../shared/app_panel.dart';
import '../shared/brand_bar.dart';

class OnboardingPage extends ConsumerStatefulWidget {
  const OnboardingPage({super.key});

  @override
  ConsumerState<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends ConsumerState<OnboardingPage> {
  final PageController _controller = PageController();
  int _currentIndex = 0;

  static const List<({String title, String body, IconData icon})> _pages =
      <({String title, String body, IconData icon})>[
    (
      title: 'Bouclier local',
      body: 'L application tourne comme une sentinelle Android et observe les notifications les plus exposees.',
      icon: Symbols.shield_rounded,
    ),
    (
      title: 'Canaux critiques',
      body: 'SMS, WhatsApp et Messenger sont suivis sans formulaire lourd ni parcours web parasite.',
      icon: Symbols.notifications_active_rounded,
    ),
    (
      title: 'Alertes utiles',
      body: 'Seules les detections suspectes meritent ton attention avec un score clair et une action simple.',
      icon: Symbols.bolt_rounded,
    ),
    (
      title: 'Portail detaille',
      body: 'Le portail BCS reste disponible pour les preuves, la verification poussee et le signalement manuel.',
      icon: Symbols.open_in_new_rounded,
    ),
  ];

  Future<void> _finish() async {
    await ref.read(installStoreProvider).setOnboardingCompleted(true);
    await ref.read(nativeShieldBridgeProvider).requestPostNotificationsPermission();
    if (!mounted) {
      return;
    }
    context.go('/home');
    await Future<void>.delayed(const Duration(milliseconds: 320));
    await ref.read(nativeShieldBridgeProvider).openNotificationAccessSettings();
  }

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    final bool isLast = _currentIndex == _pages.length - 1;

    return Scaffold(
      body: Column(
        children: <Widget>[
          BrandBar(
            compact: true,
            trailing: TextButton(
              onPressed: _finish,
              child: const Text('Passer'),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
              child: Column(
                children: <Widget>[
                  Expanded(
                    child: PageView.builder(
                      controller: _controller,
                      itemCount: _pages.length,
                      onPageChanged: (int value) {
                        setState(() {
                          _currentIndex = value;
                        });
                      },
                      itemBuilder: (BuildContext context, int index) {
                        final ({String title, String body, IconData icon}) page = _pages[index];
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(
                                color: colors.surfaceLow.withValues(alpha: 0.78),
                                borderRadius: BorderRadius.circular(999),
                                border: Border.all(color: colors.outlineSoft),
                              ),
                              child: Text(
                                'ETAPE ${index + 1} / ${_pages.length}',
                                style: Theme.of(context).textTheme.labelMedium,
                                textAlign: TextAlign.center,
                              ),
                            ).animate().fadeIn(duration: 250.ms),
                            const SizedBox(height: 18),
                            Expanded(
                              child: AppPanel(
                                padding: const EdgeInsets.fromLTRB(24, 30, 24, 28),
                                glowColor: colors.brand,
                                radius: 28,
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: <Widget>[
                                    Container(
                                      width: 112,
                                      height: 112,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        gradient: RadialGradient(
                                          colors: <Color>[
                                            colors.primary.withValues(alpha: 0.2),
                                            colors.brand.withValues(alpha: 0.06),
                                            colors.surfaceLow,
                                          ],
                                        ),
                                        border: Border.all(color: colors.outlineSoft),
                                      ),
                                      child: Icon(
                                        page.icon,
                                        size: 46,
                                        color: colors.primary,
                                      ),
                                    ).animate().scale(duration: 300.ms, curve: Curves.easeOutBack),
                                    const SizedBox(height: 28),
                                    Text(
                                      page.title,
                                      style: Theme.of(context).textTheme.headlineLarge,
                                      textAlign: TextAlign.center,
                                    ).animate().fadeIn(duration: 280.ms).slideY(begin: 0.08, end: 0),
                                    const SizedBox(height: 14),
                                    Text(
                                      page.body,
                                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                            color: colors.muted,
                                          ),
                                      textAlign: TextAlign.center,
                                    ).animate().fadeIn(duration: 320.ms).slideY(begin: 0.1, end: 0),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 18),
                  AnimatedSmoothIndicator(
                    activeIndex: _currentIndex,
                    count: _pages.length,
                    effect: ExpandingDotsEffect(
                      dotHeight: 8,
                      dotWidth: 8,
                      spacing: 8,
                      expansionFactor: 3.4,
                      activeDotColor: colors.primary,
                      dotColor: colors.outline,
                    ),
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () async {
                        if (isLast) {
                          await _finish();
                          return;
                        }
                        await _controller.nextPage(
                          duration: const Duration(milliseconds: 280),
                          curve: Curves.easeOutCubic,
                        );
                      },
                      child: Text(isLast ? 'ACTIVER MON BOUCLIER' : 'SUIVANT'),
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
