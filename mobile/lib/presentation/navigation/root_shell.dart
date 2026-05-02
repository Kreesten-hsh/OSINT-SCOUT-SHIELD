import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../core/theme/app_theme.dart';

class RootShell extends StatelessWidget {
  const RootShell({
    super.key,
    required this.navigationShell,
  });

  final StatefulNavigationShell navigationShell;

  static const List<(IconData, String)> _destinations = <(IconData, String)>[
    (Symbols.home_rounded, 'Accueil'),
    (Symbols.history_rounded, 'Historique'),
    (Symbols.tune_rounded, 'Parametres'),
  ];

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    return Scaffold(
      extendBody: true,
      body: DecoratedBox(
        decoration: BoxDecoration(
          gradient: RadialGradient(
            colors: <Color>[
              colors.backgroundSoft,
              colors.background,
            ],
            radius: 1.38,
            center: const Alignment(0, -0.95),
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: navigationShell,
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 18),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(30),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: <Color>[
                      colors.surfaceHighest.withValues(alpha: 0.54),
                      colors.surface.withValues(alpha: 0.82),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(color: colors.outlineSoft.withValues(alpha: 0.98)),
                  boxShadow: <BoxShadow>[
                    BoxShadow(
                      color: colors.background.withValues(alpha: 0.42),
                      blurRadius: 28,
                      offset: const Offset(0, 14),
                    ),
                  ],
                ),
                child: Row(
                  children: List<Widget>.generate(_destinations.length, (int index) {
                    final (IconData, String) item = _destinations[index];
                    final bool selected = navigationShell.currentIndex == index;
                    return Expanded(
                      child: _GlassNavItem(
                        icon: item.$1,
                        label: item.$2,
                        selected: selected,
                        onTap: () {
                          navigationShell.goBranch(
                            index,
                            initialLocation: index == navigationShell.currentIndex,
                          );
                        },
                      ),
                    );
                  }),
                ),
              ),
            ),
          ).animate().fadeIn(duration: 280.ms).slideY(begin: 0.24, end: 0),
        ),
      ),
    );
  }
}

class _GlassNavItem extends StatelessWidget {
  const _GlassNavItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          decoration: BoxDecoration(
            gradient: selected
                ? LinearGradient(
                    colors: <Color>[
                      colors.primary.withValues(alpha: 0.18),
                      colors.brand.withValues(alpha: 0.08),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  )
                : null,
            color: selected ? null : Colors.transparent,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: selected ? colors.primary.withValues(alpha: 0.24) : Colors.transparent,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Icon(
                icon,
                size: 21,
                color: selected ? colors.primary : colors.muted,
              ).animate(target: selected ? 1 : 0).scaleXY(begin: 0.94, end: 1),
              const SizedBox(height: 4),
              Text(
                label,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: selected ? colors.primary : colors.muted,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
