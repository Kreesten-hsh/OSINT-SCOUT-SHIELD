import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../application/providers.dart';
import '../core/theme/app_theme.dart';
import 'router.dart';

class BeninCyberShieldApp extends ConsumerWidget {
  const BeninCyberShieldApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ThemeMode themeMode = ref.watch(themeModeProvider);
    return MaterialApp.router(
      title: 'BENIN CYBER SHIELD',
      debugShowCheckedModeBanner: false,
      theme: buildBeninCyberShieldLightTheme(),
      darkTheme: buildBeninCyberShieldDarkTheme(),
      themeMode: themeMode,
      routerConfig: appRouter,
    );
  }
}
