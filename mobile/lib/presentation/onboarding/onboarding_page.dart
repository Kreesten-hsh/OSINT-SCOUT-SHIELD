import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../application/providers.dart';
import '../../core/theme/app_theme.dart';
import '../shared/app_panel.dart';

class OnboardingPage extends ConsumerStatefulWidget {
  const OnboardingPage({super.key});

  @override
  ConsumerState<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends ConsumerState<OnboardingPage> {
  final PageController _controller = PageController();
  int _currentIndex = 0;

  static const List<({String title, String body, IconData icon})> _pages = <({String title, String body, IconData icon})>[
    (
      title: 'Verifier un message suspect',
      body: 'Analyse un SMS, un message WhatsApp ou une notification douteuse sans creer de compte.',
      icon: Icons.text_snippet_outlined,
    ),
    (
      title: 'Comprendre le niveau de risque',
      body: 'L application affiche le score, les mots suspects, les conseils pratiques et l alerte fon si necessaire.',
      icon: Icons.track_changes_outlined,
    ),
    (
      title: 'Signaler avec preuves',
      body: 'Ajoute des captures ou une URL suspecte pour transformer ta verification en signalement exploitable.',
      icon: Icons.outbox_outlined,
    ),
    (
      title: 'Proteger ton entourage',
      body: 'Partage rapidement l alerte sur WhatsApp et consulte l historique depuis ton telephone.',
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
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: <Widget>[
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(
                  onPressed: _finish,
                  child: const Text('Passer'),
                ),
              ),
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
                    return Center(
                      child: AppPanel(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: <Widget>[
                            Icon(page.icon, size: 60, color: colors.primary),
                            const SizedBox(height: 20),
                            Text(
                              page.title,
                              style: Theme.of(context).textTheme.headlineMedium,
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              page.body,
                              style: Theme.of(context).textTheme.bodyMedium,
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List<Widget>.generate(
                  _pages.length,
                  (int index) => AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: index == _currentIndex ? 28 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: index == _currentIndex ? colors.primary : colors.outline,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () async {
                  if (isLast) {
                    await _finish();
                    return;
                  }
                  await _controller.nextPage(
                    duration: const Duration(milliseconds: 240),
                    curve: Curves.easeOut,
                  );
                },
                child: Text(isLast ? 'Commencer' : 'Suivant'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
