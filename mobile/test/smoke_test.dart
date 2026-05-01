import 'package:benin_cyber_shield_mobile/app/app.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  testWidgets('boots BENIN CYBER SHIELD app shell', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: BeninCyberShieldApp()));
    expect(find.textContaining('BENIN CYBER'), findsOneWidget);
    expect(find.textContaining('SHIELD'), findsOneWidget);
  });
}
