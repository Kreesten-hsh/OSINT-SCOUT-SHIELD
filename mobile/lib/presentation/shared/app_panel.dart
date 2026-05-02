import 'dart:ui';

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
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: <Color>[
                colors.surfaceHighest.withValues(alpha: backgroundOpacity * 0.46),
                colors.surface.withValues(alpha: backgroundOpacity),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(
              color: showInnerBorder ? colors.outlineSoft.withValues(alpha: 0.92) : Colors.transparent,
            ),
            boxShadow: <BoxShadow>[
              BoxShadow(
                color: (glowColor ?? colors.background).withValues(alpha: 0.22),
                blurRadius: 22,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: child,
        ),
      ),
    );
  }
}
