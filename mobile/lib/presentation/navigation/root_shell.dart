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
    (Icons.shield_outlined, 'Vérifier'),
    (Icons.history_toggle_off_rounded, 'Historique'),
    (Icons.info_outline_rounded, 'À propos'),
  ];

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    return Scaffold(
      extendBody: true,
      body: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: <Color>[
              colors.background,
              colors.backgroundSoft,
              colors.background,
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
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
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 18),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: colors.surfaceLow.withValues(alpha: 0.96),
              borderRadius: BorderRadius.circular(32),
              border: Border.all(color: colors.outlineSoft),
              boxShadow: <BoxShadow>[
                BoxShadow(
                  color: colors.background.withValues(alpha: 0.45),
                  blurRadius: 24,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: NavigationBar(
              selectedIndex: navigationShell.currentIndex,
              onDestinationSelected: (int index) {
                navigationShell.goBranch(
                  index,
                  initialLocation: index == navigationShell.currentIndex,
                );
              },
              destinations: _destinations
                  .map(
                    ((IconData, String) item) => NavigationDestination(
                      icon: Icon(item.$1),
                      label: item.$2,
                    ),
                  )
                  .toList(growable: false),
            ),
          ),
        ),
      ),
    );
  }
}
