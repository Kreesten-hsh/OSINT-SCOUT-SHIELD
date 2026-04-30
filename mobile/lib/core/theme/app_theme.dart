import 'package:flutter/material.dart';

ThemeData buildBeninCyberShieldTheme() {
  const Color background = Color(0xFF031427);
  const Color surface = Color(0xFF102034);
  const Color surfaceHigh = Color(0xFF1B2B3F);
  const Color outline = Color(0xFF424754);
  const Color primary = Color(0xFF4D8EFF);
  const Color onSurface = Color(0xFFD3E4FE);
  const Color muted = Color(0xFFC2C6D6);
  const Color success = Color(0xFF4ADE80);
  const Color warning = Color(0xFFFBBF24);
  const Color danger = Color(0xFFFB7185);

  final ColorScheme colorScheme = const ColorScheme.dark(
    brightness: Brightness.dark,
    primary: primary,
    onPrimary: Color(0xFF002E6A),
    surface: surface,
    onSurface: onSurface,
    error: Color(0xFFFFB4AB),
    onError: Color(0xFF690005),
  );

  final TextTheme textTheme = const TextTheme(
    headlineLarge: TextStyle(
      fontSize: 24,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.48,
      color: onSurface,
    ),
    headlineMedium: TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.2,
      color: onSurface,
    ),
    bodyLarge: TextStyle(
      fontSize: 16,
      height: 1.5,
      color: onSurface,
    ),
    bodyMedium: TextStyle(
      fontSize: 14,
      height: 1.45,
      color: muted,
    ),
    bodySmall: TextStyle(
      fontSize: 12,
      height: 1.35,
      color: muted,
    ),
    labelLarge: TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      color: onSurface,
    ),
    labelMedium: TextStyle(
      fontSize: 11,
      fontWeight: FontWeight.w700,
      letterSpacing: 1.2,
      color: muted,
    ),
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: background,
    textTheme: textTheme,
    appBarTheme: const AppBarTheme(
      backgroundColor: background,
      foregroundColor: onSurface,
      elevation: 0,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: outline),
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: outline,
      thickness: 1,
      space: 1,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: background,
      hintStyle: const TextStyle(color: muted),
      labelStyle: const TextStyle(color: muted),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: outline),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: primary, width: 1.2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: danger),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: danger),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: surfaceHigh,
      selectedColor: primary.withValues(alpha: 0.16),
      side: const BorderSide(color: outline),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      labelStyle: const TextStyle(color: onSurface),
    ),
    navigationBarTheme: const NavigationBarThemeData(
      backgroundColor: surface,
      indicatorColor: Colors.transparent,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: surfaceHigh,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    ),
    extensions: const <ThemeExtension<dynamic>>[
      BeninShieldColors(
        background: background,
        surface: surface,
        surfaceHigh: surfaceHigh,
        outline: outline,
        primary: primary,
        onSurface: onSurface,
        muted: muted,
        success: success,
        warning: warning,
        danger: danger,
      ),
    ],
  );
}

@immutable
class BeninShieldColors extends ThemeExtension<BeninShieldColors> {
  const BeninShieldColors({
    required this.background,
    required this.surface,
    required this.surfaceHigh,
    required this.outline,
    required this.primary,
    required this.onSurface,
    required this.muted,
    required this.success,
    required this.warning,
    required this.danger,
  });

  final Color background;
  final Color surface;
  final Color surfaceHigh;
  final Color outline;
  final Color primary;
  final Color onSurface;
  final Color muted;
  final Color success;
  final Color warning;
  final Color danger;

  @override
  BeninShieldColors copyWith({
    Color? background,
    Color? surface,
    Color? surfaceHigh,
    Color? outline,
    Color? primary,
    Color? onSurface,
    Color? muted,
    Color? success,
    Color? warning,
    Color? danger,
  }) {
    return BeninShieldColors(
      background: background ?? this.background,
      surface: surface ?? this.surface,
      surfaceHigh: surfaceHigh ?? this.surfaceHigh,
      outline: outline ?? this.outline,
      primary: primary ?? this.primary,
      onSurface: onSurface ?? this.onSurface,
      muted: muted ?? this.muted,
      success: success ?? this.success,
      warning: warning ?? this.warning,
      danger: danger ?? this.danger,
    );
  }

  @override
  BeninShieldColors lerp(ThemeExtension<BeninShieldColors>? other, double t) {
    if (other is! BeninShieldColors) {
      return this;
    }
    return BeninShieldColors(
      background: Color.lerp(background, other.background, t) ?? background,
      surface: Color.lerp(surface, other.surface, t) ?? surface,
      surfaceHigh: Color.lerp(surfaceHigh, other.surfaceHigh, t) ?? surfaceHigh,
      outline: Color.lerp(outline, other.outline, t) ?? outline,
      primary: Color.lerp(primary, other.primary, t) ?? primary,
      onSurface: Color.lerp(onSurface, other.onSurface, t) ?? onSurface,
      muted: Color.lerp(muted, other.muted, t) ?? muted,
      success: Color.lerp(success, other.success, t) ?? success,
      warning: Color.lerp(warning, other.warning, t) ?? warning,
      danger: Color.lerp(danger, other.danger, t) ?? danger,
    );
  }
}

extension BeninShieldThemeX on BuildContext {
  BeninShieldColors get shieldColors => Theme.of(this).extension<BeninShieldColors>()!;
}
