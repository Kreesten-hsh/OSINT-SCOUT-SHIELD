import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

ThemeData buildBeninCyberShieldTheme() {
  const BeninShieldColors palette = BeninShieldColors(
    background: Color(0xFF05070C),
    backgroundSoft: Color(0xFF0D1017),
    surfaceLow: Color(0xFF111621),
    surface: Color(0xFF141A27),
    surfaceHigh: Color(0xFF1A2030),
    surfaceHighest: Color(0xFF21283A),
    outline: Color(0xFF394156),
    outlineSoft: Color(0xFF232A39),
    primary: Color(0xFF45E08A),
    primarySoft: Color(0xFFB8F7CF),
    brand: Color(0xFF5B8CFF),
    brandSoft: Color(0xFFA8BEFF),
    onSurface: Color(0xFFF5F7FC),
    muted: Color(0xFF97A2B8),
    success: Color(0xFF45E08A),
    warning: Color(0xFFFF8E47),
    danger: Color(0xFFFF625C),
    info: Color(0xFF79A6FF),
  );

  final ThemeData base = FlexThemeData.dark(
    useMaterial3: true,
    colors: const FlexSchemeColor(
      primary: Color(0xFF45E08A),
      primaryContainer: Color(0xFF113523),
      secondary: Color(0xFF5B8CFF),
      secondaryContainer: Color(0xFF15233F),
      tertiary: Color(0xFF79A6FF),
      tertiaryContainer: Color(0xFF16263E),
      appBarColor: Color(0xFF05070C),
      error: Color(0xFFFF625C),
    ),
    visualDensity: FlexColorScheme.comfortablePlatformDensity,
    surfaceMode: FlexSurfaceMode.levelSurfacesLowScaffold,
    blendLevel: 22,
  );

  final ColorScheme colorScheme = base.colorScheme.copyWith(
    brightness: Brightness.dark,
    primary: palette.primary,
    onPrimary: const Color(0xFF06110B),
    primaryContainer: const Color(0xFF113523),
    secondary: palette.brand,
    onSecondary: const Color(0xFF091222),
    secondaryContainer: const Color(0xFF15233F),
    tertiary: palette.info,
    tertiaryContainer: const Color(0xFF16263E),
    surface: palette.surface,
    onSurface: palette.onSurface,
    outline: palette.outline,
    outlineVariant: palette.outlineSoft,
    error: palette.danger,
    onError: const Color(0xFF220809),
  );

  final TextTheme baseTextTheme = GoogleFonts.interTextTheme(base.textTheme);
  final TextTheme textTheme = baseTextTheme.copyWith(
    headlineLarge: GoogleFonts.inter(
      fontSize: 28,
      fontWeight: FontWeight.w800,
      height: 1.02,
      letterSpacing: -0.9,
      color: palette.onSurface,
    ),
    headlineMedium: GoogleFonts.inter(
      fontSize: 22,
      fontWeight: FontWeight.w700,
      height: 1.08,
      letterSpacing: -0.5,
      color: palette.onSurface,
    ),
    headlineSmall: GoogleFonts.inter(
      fontSize: 18,
      fontWeight: FontWeight.w700,
      height: 1.14,
      color: palette.onSurface,
    ),
    titleLarge: GoogleFonts.inter(
      fontSize: 16,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.2,
      color: palette.onSurface,
    ),
    bodyLarge: GoogleFonts.inter(
      fontSize: 14,
      fontWeight: FontWeight.w500,
      height: 1.42,
      color: palette.onSurface,
    ),
    bodyMedium: GoogleFonts.inter(
      fontSize: 13,
      fontWeight: FontWeight.w500,
      height: 1.45,
      color: palette.muted,
    ),
    bodySmall: GoogleFonts.inter(
      fontSize: 11,
      fontWeight: FontWeight.w500,
      height: 1.35,
      color: palette.muted,
    ),
    labelLarge: GoogleFonts.inter(
      fontSize: 13,
      fontWeight: FontWeight.w700,
      height: 1.2,
      color: palette.onSurface,
    ),
    labelMedium: GoogleFonts.inter(
      fontSize: 10,
      fontWeight: FontWeight.w800,
      letterSpacing: 1.1,
      color: palette.brandSoft,
    ),
    labelSmall: GoogleFonts.inter(
      fontSize: 11,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.05,
      color: palette.muted,
    ),
  );

  return base.copyWith(
    colorScheme: colorScheme,
    scaffoldBackgroundColor: palette.background,
    textTheme: textTheme,
    splashColor: palette.primary.withValues(alpha: 0.12),
    highlightColor: Colors.transparent,
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      foregroundColor: palette.onSurface,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: textTheme.headlineSmall?.copyWith(
        color: palette.brand,
        fontWeight: FontWeight.w800,
      ),
    ),
    cardTheme: CardThemeData(
      color: palette.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
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
      fillColor: palette.surfaceLow.withValues(alpha: 0.94),
      hintStyle: textTheme.bodyMedium?.copyWith(
        color: palette.muted.withValues(alpha: 0.72),
      ),
      labelStyle: textTheme.labelMedium,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(24),
        borderSide: BorderSide(color: palette.outlineSoft),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(24),
        borderSide: BorderSide(
          color: palette.primary.withValues(alpha: 0.9),
          width: 1.25,
        ),
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
    searchBarTheme: SearchBarThemeData(
      backgroundColor: WidgetStatePropertyAll<Color>(
        palette.surfaceLow.withValues(alpha: 0.96),
      ),
      elevation: const WidgetStatePropertyAll<double>(0),
      shadowColor: const WidgetStatePropertyAll<Color>(Colors.transparent),
      surfaceTintColor: const WidgetStatePropertyAll<Color>(Colors.transparent),
      padding: const WidgetStatePropertyAll<EdgeInsets>(
        EdgeInsets.symmetric(horizontal: 16, vertical: 0),
      ),
      textStyle: WidgetStatePropertyAll<TextStyle?>(textTheme.bodyLarge),
      hintStyle: WidgetStatePropertyAll<TextStyle?>(
        textTheme.bodyMedium?.copyWith(
          color: palette.muted.withValues(alpha: 0.72),
        ),
      ),
      side: WidgetStatePropertyAll<BorderSide>(
        BorderSide(color: palette.outlineSoft),
      ),
      shape: WidgetStatePropertyAll<RoundedRectangleBorder>(
        RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: palette.surfaceLow,
      selectedColor: palette.primary.withValues(alpha: 0.14),
      side: BorderSide(color: palette.outlineSoft),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(999),
      ),
      labelStyle: textTheme.labelSmall?.copyWith(color: palette.onSurface),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.transparent,
      indicatorColor: Colors.transparent,
      height: 72,
      labelTextStyle: WidgetStateProperty.resolveWith<TextStyle?>(
        (Set<WidgetState> states) {
          final bool selected = states.contains(WidgetState.selected);
          return textTheme.bodySmall?.copyWith(
            color: selected ? palette.primary : palette.muted,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          );
        },
      ),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        backgroundColor: WidgetStateProperty.resolveWith<Color?>(
          (Set<WidgetState> states) => states.contains(WidgetState.selected)
              ? palette.primary.withValues(alpha: 0.14)
              : palette.surfaceLow,
        ),
        foregroundColor: WidgetStateProperty.resolveWith<Color?>(
          (Set<WidgetState> states) =>
              states.contains(WidgetState.selected) ? palette.primary : palette.muted,
        ),
        side: WidgetStatePropertyAll<BorderSide>(
          BorderSide(color: palette.outlineSoft),
        ),
        padding: const WidgetStatePropertyAll<EdgeInsets>(
          EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
        textStyle: WidgetStatePropertyAll<TextStyle?>(textTheme.bodySmall?.copyWith(
          fontWeight: FontWeight.w700,
        )),
        shape: WidgetStatePropertyAll<RoundedRectangleBorder>(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: palette.primary,
        foregroundColor: const Color(0xFF08120C),
        minimumSize: const Size.fromHeight(52),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        textStyle: textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w800,
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
        textStyle: textTheme.labelLarge,
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: palette.surfaceHighest,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      contentTextStyle: textTheme.bodyLarge?.copyWith(
        fontWeight: FontWeight.w600,
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
      overlayColor: palette.primary.withValues(alpha: 0.14),
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
