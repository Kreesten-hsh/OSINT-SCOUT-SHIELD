import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';

class BrandBar extends StatelessWidget {
  const BrandBar({
    super.key,
    this.compact = false,
    this.trailing,
    this.showSettingsShortcut = true,
  });

  final bool compact;
  final Widget? trailing;
  final bool showSettingsShortcut;

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    final Widget action = trailing ??
        (showSettingsShortcut
            ? IconButton(
                onPressed: () => context.push('/settings'),
                icon: const Icon(Icons.more_vert_rounded),
                color: colors.muted,
              )
            : const SizedBox(width: 48));

    return Container(
      padding: EdgeInsets.fromLTRB(20, compact ? 8 : 12, 20, 18),
      decoration: BoxDecoration(
        color: colors.background.withValues(alpha: 0.96),
        border: Border(
          bottom: BorderSide(color: colors.outlineSoft.withValues(alpha: 0.8)),
        ),
      ),
      child: Row(
        children: <Widget>[
          Icon(Icons.shield_outlined, color: colors.primary, size: compact ? 24 : 28),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'BENIN CYBER SHIELD',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: colors.primary,
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
          action,
        ],
      ),
    );
  }
}
