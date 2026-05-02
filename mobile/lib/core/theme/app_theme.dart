import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

ThemeData buildBeninCyberShieldTheme() {
  const BeninShieldColors palette = BeninShieldColors(
    background: Color(0xFF06070C),
    backgroundSoft: Color(0xFF10131A),
    surfaceLow: Color(0xFF131722),
    surface: Color(0xFF171B26),
    surfaceHigh: Color(0xFF1C2130),
    surfaceHighest: Color(0xFF262C3E),
    outline: Color(0xFF383F53),
    outlineSoft: Color(0xFF232839),
    primary: Color(0xFFE4FF43),
    primarySoft: Color(0xFFF4FF9A),
    brand: Color(0xFF5B8CFF),
    brandSoft: Color(0xFFAEC3FF),
    onSurface: Color(0xFFF3F5FB),
    muted: Color(0xFF9EA7BC),
    success: Color(0xFFE4FF43),
    warning: Color(0xFFFFA93A),
    danger: Color(0xFFFF625C),
    info: Color(0xFF76A4FF),
  );

  final ColorScheme colorScheme = const ColorScheme.dark(
    brightness: Brightness.dark,
    primary: Color(0xFFE4FF43),
    onPrimary: Color(0xFF111300),
    secondary: Color(0xFF5B8CFF),
    onSecondary: Color(0xFF0C1324),
    surface: Color(0xFF171B26),
    onSurface: Color(0xFFF3F5FB),
    error: Color(0xFFFF625C),
    onError: Color(0xFF2A0807),
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
        fontSize: 26,
        fontWeight: FontWeight.w800,
        height: 1.05,
        letterSpacing: -0.8,
        color: palette.onSurface,
      ),
      headlineMedium: GoogleFonts.manrope(
        fontSize: 22,
        fontWeight: FontWeight.w700,
        height: 1.08,
        letterSpacing: -0.45,
        color: palette.onSurface,
      ),
      headlineSmall: GoogleFonts.manrope(
        fontSize: 17,
        fontWeight: FontWeight.w700,
        height: 1.15,
        color: palette.onSurface,
      ),
      bodyLarge: GoogleFonts.manrope(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        height: 1.42,
        color: palette.onSurface,
      ),
      bodyMedium: GoogleFonts.manrope(
        fontSize: 13,
        fontWeight: FontWeight.w500,
        height: 1.45,
        color: palette.muted,
      ),
      bodySmall: GoogleFonts.manrope(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        height: 1.35,
        color: palette.muted,
      ),
      labelLarge: GoogleFonts.manrope(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        height: 1.2,
        color: palette.onSurface,
      ),
      labelMedium: GoogleFonts.spaceGrotesk(
        fontSize: 10,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.5,
        color: palette.brandSoft,
      ),
      labelSmall: GoogleFonts.jetBrainsMono(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.1,
        color: palette.muted,
      ),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: palette.background,
      foregroundColor: palette.onSurface,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: GoogleFonts.manrope(
        fontSize: 16,
        fontWeight: FontWeight.w800,
        color: palette.brand,
      ),
    ),
    cardTheme: CardThemeData(
      color: palette.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
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
      fillColor: palette.surfaceLow.withValues(alpha: 0.96),
      hintStyle: GoogleFonts.manrope(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        fontStyle: FontStyle.italic,
        color: palette.muted.withValues(alpha: 0.76),
      ),
      labelStyle: GoogleFonts.spaceGrotesk(
        fontSize: 10,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.4,
        color: palette.muted,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(24),
        borderSide: BorderSide(color: palette.outlineSoft),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(24),
        borderSide: BorderSide(color: palette.brand.withValues(alpha: 0.9), width: 1.2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(24),
        borderSide: BorderSide(color: palette.danger),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(24),
        borderSide: BorderSide(color: palette.danger),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: palette.surfaceLow,
      selectedColor: palette.primary.withValues(alpha: 0.16),
      side: BorderSide(color: palette.outlineSoft),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      labelStyle: GoogleFonts.jetBrainsMono(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        color: palette.onSurface,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.transparent,
      indicatorColor: Colors.transparent,
      height: 72,
      labelTextStyle: WidgetStateProperty.resolveWith<TextStyle?>(
        (Set<WidgetState> states) {
          final bool selected = states.contains(WidgetState.selected);
          return GoogleFonts.manrope(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? palette.primary : palette.muted,
          );
        },
      ),
      iconTheme: WidgetStateProperty.resolveWith<IconThemeData?>(
        (Set<WidgetState> states) {
          final bool selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? palette.primary : palette.muted,
            size: 22,
          );
        },
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: palette.primary,
        foregroundColor: const Color(0xFF111300),
        minimumSize: const Size.fromHeight(52),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        textStyle: GoogleFonts.spaceGrotesk(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.8,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: palette.onSurface,
        minimumSize: const Size.fromHeight(50),
        side: BorderSide(color: palette.outline),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        textStyle: GoogleFonts.manrope(
          fontSize: 13,
          fontWeight: FontWeight.w700,
        ),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: palette.surfaceHighest,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      contentTextStyle: GoogleFonts.manrope(
        fontSize: 13,
        fontWeight: FontWeight.w600,
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
      trackOutlineColor: const WidgetStatePropertyAll<Color>(Colors.transparent),
    ),
    sliderTheme: SliderThemeData(
      activeTrackColor: palette.primary,
      inactiveTrackColor: palette.outlineSoft,
      thumbColor: palette.primary,
      overlayColor: palette.primary.withValues(alpha: 0.16),
      trackHeight: 4,
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
    required this.brand,
    required this.brandSoft,
    required this.onSurface,
    required this.muted,
    required this.success,
    required this.warning,
    required this.danger,
    required this.info,
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
  final Color brand;
  final Color brandSoft;
  final Color onSurface;
  final Color muted;
  final Color success;
  final Color warning;
  final Color danger;
  final Color info;

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
    Color? brand,
    Color? brandSoft,
    Color? onSurface,
    Color? muted,
    Color? success,
    Color? warning,
    Color? danger,
    Color? info,
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
      brand: brand ?? this.brand,
      brandSoft: brandSoft ?? this.brandSoft,
      onSurface: onSurface ?? this.onSurface,
      muted: muted ?? this.muted,
      success: success ?? this.success,
      warning: warning ?? this.warning,
      danger: danger ?? this.danger,
      info: info ?? this.info,
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
      brand: Color.lerp(brand, other.brand, t) ?? brand,
      brandSoft: Color.lerp(brandSoft, other.brandSoft, t) ?? brandSoft,
      onSurface: Color.lerp(onSurface, other.onSurface, t) ?? onSurface,
      muted: Color.lerp(muted, other.muted, t) ?? muted,
      success: Color.lerp(success, other.success, t) ?? success,
      warning: Color.lerp(warning, other.warning, t) ?? warning,
      danger: Color.lerp(danger, other.danger, t) ?? danger,
      info: Color.lerp(info, other.info, t) ?? info,
    );
  }
}

extension BeninShieldThemeX on BuildContext {
  BeninShieldColors get shieldColors => Theme.of(this).extension<BeninShieldColors>()!;
}
