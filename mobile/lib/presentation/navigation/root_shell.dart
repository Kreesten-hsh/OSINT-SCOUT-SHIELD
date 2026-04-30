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
    (Icons.verified_user_outlined, 'Verifier'),
    (Icons.history_rounded, 'Historique'),
    (Icons.info_outline_rounded, 'A propos'),
    (Icons.tune_rounded, 'Parametres'),
  ];

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: navigationShell,
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          decoration: BoxDecoration(
            color: colors.surface,
            border: Border(top: BorderSide(color: colors.outline)),
          ),
          child: NavigationBar(
            selectedIndex: navigationShell.currentIndex,
            onDestinationSelected: (int index) {
              navigationShell.goBranch(index, initialLocation: index == navigationShell.currentIndex);
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
    );
  }
}
