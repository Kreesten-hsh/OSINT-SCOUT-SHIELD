import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
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
    await Future<void>.delayed(const Duration(milliseconds: 1100));
    if (!mounted) {
      return;
    }
    context.go(onboardingCompleted ? '/home' : '/onboarding');
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
            radius: 1.08,
          ),
        ),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Container(
                  width: 198,
                  height: 198,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: <Color>[
                        colors.primary.withValues(alpha: 0.2),
                        colors.brand.withValues(alpha: 0.08),
                        colors.background,
                      ],
                    ),
                    border: Border.all(color: colors.outlineSoft),
                    boxShadow: <BoxShadow>[
                      BoxShadow(
                        color: colors.brand.withValues(alpha: 0.14),
                        blurRadius: 34,
                        spreadRadius: 6,
                      ),
                    ],
                  ),
                  child: Center(
                    child: SvgPicture.asset(
                      'assets/brand/bcs_mark.svg',
                      width: 110,
                      height: 110,
                    ),
                  ),
                ).animate().scale(duration: 500.ms, curve: Curves.easeOutBack).fadeIn(),
                const SizedBox(height: 32),
                Text(
                  'BENIN CYBER\nSHIELD',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                        fontSize: 38,
                        letterSpacing: 1.1,
                        height: 1.08,
                      ),
                ).animate().fadeIn(duration: 360.ms).slideY(begin: 0.08, end: 0),
                const SizedBox(height: 14),
                Text(
                  'Sentinelle mobile contre la fraude et les faux messages.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: colors.muted),
                ).animate().fadeIn(delay: 100.ms, duration: 360.ms),
                const SizedBox(height: 32),
                SizedBox(
                  width: 26,
                  height: 26,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.4,
                    color: colors.primary,
                  ),
                ),
                const SizedBox(height: 46),
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
