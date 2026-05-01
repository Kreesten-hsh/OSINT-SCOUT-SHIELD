import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

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
      title: 'Détecter vite',
      body: 'Analyse un SMS, un message WhatsApp ou une notification douteuse sans créer de compte.',
      icon: Icons.shield_outlined,
    ),
    (
      title: 'Comprendre le risque',
      body: 'Le score, les indices suspects, la catégorie et les conseils s affichent en quelques secondes.',
      icon: Icons.radar_outlined,
    ),
    (
      title: 'Signaler avec preuves',
      body: 'Ajoute une URL et des captures pour transformer la vérification en signalement exploitable.',
      icon: Icons.file_present_outlined,
    ),
    (
      title: 'Partager et suivre',
      body: 'Diffuse l alerte sur WhatsApp puis retrouve tes vérifications dans l historique mobile.',
      icon: Icons.share_outlined,
    ),
  ];

  Future<void> _finish() async {
    await ref.read(installStoreProvider).setOnboardingCompleted(true);
    if (!mounted) {
      return;
    }
    context.go('/verify');
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
            showSettingsShortcut: false,
            trailing: TextButton(
              onPressed: _finish,
              child: const Text('Passer'),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
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
                              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                              decoration: BoxDecoration(
                                color: colors.surfaceLow,
                                borderRadius: BorderRadius.circular(999),
                                border: Border.all(color: colors.outlineSoft),
                              ),
                              child: Text(
                                'ÉTAPE ${index + 1} / ${_pages.length}',
                                style: Theme.of(context).textTheme.labelMedium,
                                textAlign: TextAlign.center,
                              ),
                            ),
                            const SizedBox(height: 20),
                            Expanded(
                              child: AppPanel(
                                padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
                                glowColor: colors.primary,
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: <Widget>[
                                    Container(
                                      width: 108,
                                      height: 108,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: colors.surfaceLow,
                                        border: Border.all(color: colors.outlineSoft),
                                        boxShadow: <BoxShadow>[
                                          BoxShadow(
                                            color: colors.primary.withValues(alpha: 0.18),
                                            blurRadius: 24,
                                            spreadRadius: 4,
                                          ),
                                        ],
                                      ),
                                      child: Icon(page.icon, size: 52, color: colors.primarySoft),
                                    ),
                                    const SizedBox(height: 30),
                                    Text(
                                      page.title,
                                      style: Theme.of(context).textTheme.headlineLarge,
                                      textAlign: TextAlign.center,
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      page.body,
                                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: colors.muted),
                                      textAlign: TextAlign.center,
                                    ),
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List<Widget>.generate(
                      _pages.length,
                      (int index) => AnimatedContainer(
                        duration: const Duration(milliseconds: 220),
                        margin: const EdgeInsets.symmetric(horizontal: 5),
                        width: index == _currentIndex ? 32 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: index == _currentIndex ? colors.primary : colors.outline,
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
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
                          duration: const Duration(milliseconds: 260),
                          curve: Curves.easeOutCubic,
                        );
                      },
                      child: Text(isLast ? 'COMMENCER' : 'SUIVANT'),
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
