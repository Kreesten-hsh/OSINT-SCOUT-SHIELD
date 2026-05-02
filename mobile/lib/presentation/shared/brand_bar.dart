import 'package:flutter/material.dart';

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
    return Container(
      padding: EdgeInsets.fromLTRB(20, compact ? 8 : 10, 20, compact ? 10 : 14),
      child: Row(
        children: <Widget>[
          Text(
            'BCS',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: colors.brand,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.2,
                ),
          ),
          const Spacer(),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}
