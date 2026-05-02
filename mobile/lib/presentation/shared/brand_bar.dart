import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../core/theme/app_theme.dart';

class BrandBar extends StatelessWidget {
  const BrandBar({
    super.key,
    this.trailing,
    this.compact = false,
  });

  final Widget? trailing;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, compact ? 8 : 10, 20, compact ? 10 : 14),
      child: Row(
        children: <Widget>[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
            decoration: BoxDecoration(
              color: colors.surfaceLow.withValues(alpha: 0.78),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: colors.outlineSoft),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                SvgPicture.asset(
                  'assets/brand/bcs_mark.svg',
                  width: 20,
                  height: 20,
                ),
                const SizedBox(width: 10),
                Text(
                  'BCS',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: colors.onSurface,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.35,
                      ),
                ),
              ],
            ),
          ).animate().fadeIn(duration: 260.ms).slideX(begin: -0.08, end: 0),
          const Spacer(),
          if (trailing != null)
            trailing!.animate().fadeIn(duration: 240.ms).slideX(begin: 0.08, end: 0),
        ],
      ),
    );
  }
}
