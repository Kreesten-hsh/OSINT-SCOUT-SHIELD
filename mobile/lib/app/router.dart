import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../presentation/about/about_page.dart';
import '../presentation/history/history_page.dart';
import '../presentation/navigation/root_shell.dart';
import '../presentation/onboarding/onboarding_page.dart';
import '../presentation/settings/settings_page.dart';
import '../presentation/splash/splash_page.dart';
import '../presentation/verify/report_confirmation_page.dart';
import '../presentation/verify/report_page.dart';
import '../presentation/verify/result_page.dart';
import '../presentation/verify/verify_page.dart';

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>();

final GoRouter appRouter = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/splash',
  routes: <RouteBase>[
    GoRoute(
      path: '/splash',
      builder: (BuildContext context, GoRouterState state) => const SplashPage(),
    ),
    GoRoute(
      path: '/onboarding',
      builder: (BuildContext context, GoRouterState state) => const OnboardingPage(),
    ),
    StatefulShellRoute.indexedStack(
      builder: (
        BuildContext context,
        GoRouterState state,
        StatefulNavigationShell navigationShell,
      ) {
        return RootShell(navigationShell: navigationShell);
      },
      branches: <StatefulShellBranch>[
        StatefulShellBranch(
          routes: <RouteBase>[
            GoRoute(
              path: '/verify',
              builder: (BuildContext context, GoRouterState state) => const VerifyPage(),
              routes: <RouteBase>[
                GoRoute(
                  path: 'result',
                  builder: (BuildContext context, GoRouterState state) => const ResultPage(),
                ),
                GoRoute(
                  path: 'report',
                  builder: (BuildContext context, GoRouterState state) => const ReportPage(),
                ),
                GoRoute(
                  path: 'confirmation',
                  builder: (BuildContext context, GoRouterState state) => const ReportConfirmationPage(),
                ),
              ],
            ),
          ],
        ),
        StatefulShellBranch(
          routes: <RouteBase>[
            GoRoute(
              path: '/history',
              builder: (BuildContext context, GoRouterState state) => const HistoryPage(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: <RouteBase>[
            GoRoute(
              path: '/about',
              builder: (BuildContext context, GoRouterState state) => const AboutPage(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: <RouteBase>[
            GoRoute(
              path: '/settings',
              builder: (BuildContext context, GoRouterState state) => const SettingsPage(),
            ),
          ],
        ),
      ],
    ),
  ],
);
