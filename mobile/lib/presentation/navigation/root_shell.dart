import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../application/providers.dart';
import '../../core/theme/app_theme.dart';

class RootShell extends ConsumerStatefulWidget {
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
  ConsumerState<RootShell> createState() => _RootShellState();
}

class _RootShellState extends ConsumerState<RootShell> with WidgetsBindingObserver {
  static const Map<String, int> _surfaceIndexMap = <String, int>{
    'home': 0,
    'history': 1,
    'settings': 2,
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _consumePendingSurface());
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
    _consumePendingSurface();
  }

  Future<void> _consumePendingSurface() async {
    final String? pendingSurface =
        await ref.read(nativeShieldBridgeProvider).consumePendingOpenSurface();
    if (!mounted || pendingSurface == null) {
      return;
    }
    final int? branchIndex = _surfaceIndexMap[pendingSurface];
    if (branchIndex == null) {
      return;
    }
    widget.navigationShell.goBranch(
      branchIndex,
      initialLocation: branchIndex == widget.navigationShell.currentIndex,
    );
  }

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
          child: widget.navigationShell,
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(42),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: <Color>[
                      Colors.white.withValues(alpha: 0.09),
                      Colors.white.withValues(alpha: 0.03),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(42),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.16)),
                  boxShadow: <BoxShadow>[
                    BoxShadow(
                      color: colors.background.withValues(alpha: 0.48),
                      blurRadius: 36,
                      offset: const Offset(0, 16),
                    ),
                  ],
                ),
                child: Stack(
                  children: <Widget>[
                    Positioned(
                      left: 18,
                      right: 18,
                      top: 0,
                      child: Container(
                        height: 1.2,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: <Color>[
                              Colors.transparent,
                              Colors.white.withValues(alpha: 0.34),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    ),
                    Row(
                      children: List<Widget>.generate(_destinations.length, (int index) {
                        final (IconData, String) item = _destinations[index];
                        final bool selected = widget.navigationShell.currentIndex == index;
                        return Expanded(
                          child: _GlassNavItem(
                            icon: item.$1,
                            label: item.$2,
                            selected: selected,
                            onTap: () {
                              widget.navigationShell.goBranch(
                                index,
                                initialLocation: index == widget.navigationShell.currentIndex,
                              );
                            },
                          ),
                        );
                      }),
                    ),
                  ],
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
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 9),
          decoration: BoxDecoration(
            gradient: selected
                ? LinearGradient(
                    colors: <Color>[
                      Colors.white.withValues(alpha: 0.12),
                      colors.primary.withValues(alpha: 0.18),
                      colors.brand.withValues(alpha: 0.08),
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomRight,
                  )
                : null,
            color: selected ? null : Colors.transparent,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: selected ? Colors.white.withValues(alpha: 0.16) : Colors.transparent,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Icon(
                icon,
                size: 21,
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
