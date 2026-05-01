import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

class AppPanel extends StatelessWidget {
  const AppPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.radius = 28,
    this.glowColor,
    this.showInnerBorder = true,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final Color? glowColor;
  final bool showInnerBorder;

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: <Color>[
            colors.surfaceHighest.withValues(alpha: 0.58),
            colors.surface.withValues(alpha: 0.92),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: showInnerBorder ? colors.outlineSoft.withValues(alpha: 0.9) : Colors.transparent,
        ),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: (glowColor ?? colors.background).withValues(alpha: 0.38),
            blurRadius: 28,
            offset: const Offset(0, 18),
          ),
        ],
      ),
      child: child,
    );
  }
}
