import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';

class RootShell extends StatelessWidget {
  const RootShell({
    super.key,
    required this.navigationShell,
  });

  final StatefulNavigationShell navigationShell;

  static const List<(IconData, String)> _destinations = <(IconData, String)>[
    (Icons.home_rounded, 'Accueil'),
    (Icons.history_rounded, 'Historique'),
    (Icons.tune_rounded, 'Paramètres'),
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
            radius: 1.35,
            center: const Alignment(0, -0.9),
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
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 16),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                decoration: BoxDecoration(
                  color: colors.surfaceLow.withValues(alpha: 0.76),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: colors.outlineSoft.withValues(alpha: 0.95)),
                  boxShadow: <BoxShadow>[
                    BoxShadow(
                      color: colors.background.withValues(alpha: 0.36),
                      blurRadius: 26,
                      offset: const Offset(0, 10),
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
          ),
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
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          decoration: BoxDecoration(
            color: selected ? colors.primary.withValues(alpha: 0.12) : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
            border: selected
                ? Border.all(color: colors.primary.withValues(alpha: 0.28))
                : Border.all(color: Colors.transparent),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Icon(
                icon,
                size: 20,
                color: selected ? colors.primary : colors.muted,
              ),
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
