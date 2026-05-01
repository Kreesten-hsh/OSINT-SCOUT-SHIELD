import 'package:flutter/material.dart';

class PageHeader extends StatelessWidget {
  const PageHeader({
    super.key,
    required this.title,
    required this.subtitle,
    this.eyebrow,
    this.trailing,
  });

  final String title;
  final String subtitle;
  final String? eyebrow;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              if (eyebrow != null) ...<Widget>[
                Text(
                  eyebrow!,
                  style: Theme.of(context).textTheme.labelMedium,
                ),
                const SizedBox(height: 10),
              ],
              Text(title, style: Theme.of(context).textTheme.headlineLarge),
              const SizedBox(height: 12),
              Text(subtitle, style: Theme.of(context).textTheme.bodyLarge),
            ],
          ),
        ),
        if (trailing != null) ...<Widget>[
          const SizedBox(width: 16),
          trailing!,
        ],
      ],
    );
  }
}
