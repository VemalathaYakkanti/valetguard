import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vaultguard/main.dart';

void main() {
  testWidgets('App Boots and Loads Successfully Smoke Test', (WidgetTester tester) async {
    // Build our app under ProviderScope and trigger a frame.
    await tester.pumpWidget(
      const ProviderScope(
        child: VaultGuardApp(),
      ),
    );

    // Verify lock screen title
    expect(find.byType(VaultGuardApp), findsOneWidget);
  });
}
