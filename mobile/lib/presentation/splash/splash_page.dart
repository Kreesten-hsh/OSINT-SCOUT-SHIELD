import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../application/providers.dart';
import '../../core/theme/app_theme.dart';

class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> {
  @override
  void initState() {
    super.initState();
    Future<void>.microtask(_bootstrap);
  }

  Future<void> _bootstrap() async {
    final bool onboardingCompleted = await ref.read(onboardingCompletedProvider.future);
    await ref.read(deviceInstallIdProvider.future);
    if (!mounted) {
      return;
    }
    await Future<void>.delayed(const Duration(milliseconds: 1200));
    if (!mounted) {
      return;
    }
    context.go(onboardingCompleted ? '/verify' : '/onboarding');
  }

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    return Scaffold(
      body: DecoratedBox(
        decoration: BoxDecoration(
          gradient: RadialGradient(
            colors: <Color>[
              colors.backgroundSoft,
              colors.background,
            ],
            radius: 1.05,
          ),
        ),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                SizedBox(
                  width: 228,
                  height: 228,
                  child: Stack(
                    alignment: Alignment.center,
                    children: <Widget>[
                      Container(
                        width: 228,
                        height: 228,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: colors.primary.withValues(alpha: 0.42), width: 3),
                        ),
                      ),
                      Container(
                        width: 154,
                        height: 154,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: colors.primary.withValues(alpha: 0.6), width: 2),
                          boxShadow: <BoxShadow>[
                            BoxShadow(
                              color: colors.primary.withValues(alpha: 0.12),
                              blurRadius: 28,
                              spreadRadius: 6,
                            ),
                          ],
                        ),
                      ),
                      Container(
                        width: 96,
                        height: 96,
                        decoration: BoxDecoration(
                          color: colors.surfaceLow.withValues(alpha: 0.96),
                          shape: BoxShape.circle,
                          border: Border.all(color: colors.outlineSoft),
                        ),
                        child: Icon(Icons.shield_outlined, size: 44, color: colors.primarySoft),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 36),
                Text(
                  'BENIN CYBER\nSHIELD',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                        fontSize: 42,
                        letterSpacing: 1.8,
                        height: 1.14,
                      ),
                ),
                const SizedBox(height: 18),
                Text(
                  'Protéger · Détecter · Certifier',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: colors.muted),
                ),
                const SizedBox(height: 42),
                SizedBox(
                  width: 30,
                  height: 30,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.4,
                    color: colors.primary,
                  ),
                ),
                const SizedBox(height: 64),
                Text(
                  'v1.0.0',
                  style: Theme.of(context).textTheme.labelSmall,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
