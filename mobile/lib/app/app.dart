import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';
import 'router.dart';

class BeninCyberShieldApp extends StatelessWidget {
  const BeninCyberShieldApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'BENIN CYBER SHIELD',
      debugShowCheckedModeBanner: false,
      theme: buildBeninCyberShieldTheme(),
      routerConfig: appRouter,
    );
  }
}
