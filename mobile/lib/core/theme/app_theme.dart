import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

ThemeData buildBeninCyberShieldTheme() {
  const BeninShieldColors palette = BeninShieldColors(
    background: Color(0xFF090C14),
    backgroundSoft: Color(0xFF111622),
    surfaceLow: Color(0xFF121724),
    surface: Color(0xFF171C29),
    surfaceHigh: Color(0xFF1D2230),
    surfaceHighest: Color(0xFF2A3040),
    outline: Color(0xFF3A4153),
    outlineSoft: Color(0xFF242B39),
    primary: Color(0xFF4D8EFF),
    primarySoft: Color(0xFFADC6FF),
    onSurface: Color(0xFFE6E9F2),
    muted: Color(0xFFAAB0C0),
    success: Color(0xFF40D992),
    warning: Color(0xFFFFA63D),
    danger: Color(0xFFFFAAA3),
  );

  final ColorScheme colorScheme = const ColorScheme.dark(
    brightness: Brightness.dark,
    primary: Color(0xFF4D8EFF),
    onPrimary: Color(0xFF0B1220),
    secondary: Color(0xFFADC6FF),
    onSecondary: Color(0xFF111622),
    surface: Color(0xFF171C29),
    onSurface: Color(0xFFE6E9F2),
    error: Color(0xFFFFB4AB),
    onError: Color(0xFF690005),
  );

  final TextTheme baseTextTheme = ThemeData.dark(useMaterial3: true).textTheme;
  final TextTheme manropeTextTheme = GoogleFonts.manropeTextTheme(baseTextTheme);

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: palette.background,
    textTheme: manropeTextTheme.copyWith(
      headlineLarge: GoogleFonts.manrope(
        fontSize: 32,
        fontWeight: FontWeight.w700,
        height: 1.1,
        letterSpacing: -0.7,
        color: palette.onSurface,
      ),
      headlineMedium: GoogleFonts.manrope(
        fontSize: 24,
        fontWeight: FontWeight.w700,
        height: 1.16,
        letterSpacing: -0.4,
        color: palette.onSurface,
      ),
      headlineSmall: GoogleFonts.manrope(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        height: 1.2,
        color: palette.onSurface,
      ),
      bodyLarge: GoogleFonts.manrope(
        fontSize: 16,
        fontWeight: FontWeight.w500,
        height: 1.45,
        color: palette.onSurface,
      ),
      bodyMedium: GoogleFonts.manrope(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        height: 1.5,
        color: palette.muted,
      ),
      bodySmall: GoogleFonts.manrope(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        height: 1.4,
        color: palette.muted,
      ),
      labelLarge: GoogleFonts.manrope(
        fontSize: 15,
        fontWeight: FontWeight.w600,
        color: palette.onSurface,
      ),
      labelMedium: GoogleFonts.spaceGrotesk(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.8,
        color: palette.primarySoft,
      ),
      labelSmall: GoogleFonts.jetBrainsMono(
        fontSize: 13,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.2,
        color: palette.muted,
      ),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: palette.background.withValues(alpha: 0.96),
      foregroundColor: palette.onSurface,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: GoogleFonts.manrope(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: palette.primary,
      ),
    ),
    cardTheme: CardThemeData(
      color: palette.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(28),
        side: BorderSide(color: palette.outlineSoft),
      ),
    ),
    dividerTheme: DividerThemeData(
      color: palette.outlineSoft,
      thickness: 1,
      space: 1,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: palette.surfaceLow.withValues(alpha: 0.92),
      hintStyle: GoogleFonts.manrope(
        fontSize: 15,
        fontWeight: FontWeight.w400,
        fontStyle: FontStyle.italic,
        color: palette.muted.withValues(alpha: 0.72),
      ),
      labelStyle: GoogleFonts.spaceGrotesk(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.5,
        color: palette.muted,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(28),
        borderSide: BorderSide(color: palette.outlineSoft),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(28),
        borderSide: BorderSide(color: palette.primary.withValues(alpha: 0.85), width: 1.25),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(28),
        borderSide: BorderSide(color: palette.danger),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(28),
        borderSide: BorderSide(color: palette.danger),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: palette.surfaceLow,
      selectedColor: palette.primary.withValues(alpha: 0.18),
      side: BorderSide(color: palette.outlineSoft),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      labelStyle: GoogleFonts.jetBrainsMono(
        fontSize: 13,
        fontWeight: FontWeight.w500,
        color: palette.onSurface,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.transparent,
      indicatorColor: palette.primary.withValues(alpha: 0.16),
      height: 72,
      labelTextStyle: WidgetStateProperty.resolveWith<TextStyle?>(
        (Set<WidgetState> states) {
          final bool selected = states.contains(WidgetState.selected);
          return GoogleFonts.spaceGrotesk(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.1,
            color: selected ? palette.primary : palette.muted,
          );
        },
      ),
      iconTheme: WidgetStateProperty.resolveWith<IconThemeData?>(
        (Set<WidgetState> states) {
          final bool selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? palette.primary : palette.muted,
            size: 24,
          );
        },
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: palette.primary,
        foregroundColor: const Color(0xFF0A1120),
        minimumSize: const Size.fromHeight(60),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        textStyle: GoogleFonts.spaceGrotesk(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: palette.onSurface,
        minimumSize: const Size.fromHeight(60),
        side: BorderSide(color: palette.outline),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        textStyle: GoogleFonts.manrope(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: palette.surfaceHighest,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      contentTextStyle: GoogleFonts.manrope(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: palette.onSurface,
      ),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith<Color?>(
        (Set<WidgetState> states) =>
            states.contains(WidgetState.selected) ? Colors.white : palette.muted,
      ),
      trackColor: WidgetStateProperty.resolveWith<Color?>(
        (Set<WidgetState> states) =>
            states.contains(WidgetState.selected) ? palette.primary : palette.outlineSoft,
      ),
    ),
    extensions: const <ThemeExtension<dynamic>>[palette],
  );
}

@immutable
class BeninShieldColors extends ThemeExtension<BeninShieldColors> {
  const BeninShieldColors({
    required this.background,
    required this.backgroundSoft,
    required this.surfaceLow,
    required this.surface,
    required this.surfaceHigh,
    required this.surfaceHighest,
    required this.outline,
    required this.outlineSoft,
    required this.primary,
    required this.primarySoft,
    required this.onSurface,
    required this.muted,
    required this.success,
    required this.warning,
    required this.danger,
  });

  final Color background;
  final Color backgroundSoft;
  final Color surfaceLow;
  final Color surface;
  final Color surfaceHigh;
  final Color surfaceHighest;
  final Color outline;
  final Color outlineSoft;
  final Color primary;
  final Color primarySoft;
  final Color onSurface;
  final Color muted;
  final Color success;
  final Color warning;
  final Color danger;

  @override
  BeninShieldColors copyWith({
    Color? background,
    Color? backgroundSoft,
    Color? surfaceLow,
    Color? surface,
    Color? surfaceHigh,
    Color? surfaceHighest,
    Color? outline,
    Color? outlineSoft,
    Color? primary,
    Color? primarySoft,
    Color? onSurface,
    Color? muted,
    Color? success,
    Color? warning,
    Color? danger,
  }) {
    return BeninShieldColors(
      background: background ?? this.background,
      backgroundSoft: backgroundSoft ?? this.backgroundSoft,
      surfaceLow: surfaceLow ?? this.surfaceLow,
      surface: surface ?? this.surface,
      surfaceHigh: surfaceHigh ?? this.surfaceHigh,
      surfaceHighest: surfaceHighest ?? this.surfaceHighest,
      outline: outline ?? this.outline,
      outlineSoft: outlineSoft ?? this.outlineSoft,
      primary: primary ?? this.primary,
      primarySoft: primarySoft ?? this.primarySoft,
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
      backgroundSoft: Color.lerp(backgroundSoft, other.backgroundSoft, t) ?? backgroundSoft,
      surfaceLow: Color.lerp(surfaceLow, other.surfaceLow, t) ?? surfaceLow,
      surface: Color.lerp(surface, other.surface, t) ?? surface,
      surfaceHigh: Color.lerp(surfaceHigh, other.surfaceHigh, t) ?? surfaceHigh,
      surfaceHighest: Color.lerp(surfaceHighest, other.surfaceHighest, t) ?? surfaceHighest,
      outline: Color.lerp(outline, other.outline, t) ?? outline,
      outlineSoft: Color.lerp(outlineSoft, other.outlineSoft, t) ?? outlineSoft,
      primary: Color.lerp(primary, other.primary, t) ?? primary,
      primarySoft: Color.lerp(primarySoft, other.primarySoft, t) ?? primarySoft,
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
