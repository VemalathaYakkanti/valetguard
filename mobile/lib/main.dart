import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'core/theme/app_theme.dart';
import 'router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Load environment variables (.env) from assets
  try {
    await dotenv.load(fileName: ".env");
  } catch (e) {
    // Fallback if file is missing in tests or debug environments
    debugPrint("⚠️ Warning: .env file failed to load: $e");
  }

  runApp(
    const ProviderScope(
      child: VaultGuardApp(),
    ),
  );
}

class VaultGuardApp extends ConsumerWidget {
  const VaultGuardApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'VaultGuard',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      themeMode: ThemeMode.dark, // VaultGuard is dark theme by default
      routerConfig: router,
    );
  }
}
