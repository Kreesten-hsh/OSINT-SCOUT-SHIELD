import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

class AppPanel extends StatelessWidget {
  const AppPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.radius = 22,
    this.glowColor,
    this.showInnerBorder = true,
    this.backgroundOpacity = 0.9,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final Color? glowColor;
  final bool showInnerBorder;
  final double backgroundOpacity;

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    final bool isLight = Theme.of(context).brightness == Brightness.light;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: <Color>[
            colors.surfaceHighest.withValues(
              alpha: backgroundOpacity * (isLight ? 0.62 : 0.42),
            ),
            colors.surface.withValues(
              alpha: backgroundOpacity * (isLight ? 0.98 : 0.9),
            ),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: showInnerBorder
              ? colors.outlineSoft.withValues(alpha: isLight ? 1 : 0.92)
              : Colors.transparent,
        ),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: (glowColor ?? (isLight ? colors.outline : colors.background)).withValues(
              alpha: isLight ? 0.1 : 0.18,
            ),
            blurRadius: isLight ? 16 : 18,
            offset: Offset(0, isLight ? 8 : 10),
          ),
        ],
      ),
      child: child,
    );
  }
}
