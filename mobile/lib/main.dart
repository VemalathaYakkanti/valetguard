import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'core/theme/app_theme.dart';
import 'router.dart';
import 'features/auth/presentation/auth_provider.dart';

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

class VaultGuardApp extends ConsumerStatefulWidget {
  const VaultGuardApp({super.key});

  @override
  ConsumerState<VaultGuardApp> createState() => _VaultGuardAppState();
}

class _VaultGuardAppState extends ConsumerState<VaultGuardApp> with WidgetsBindingObserver {
  Timer? _inactivityTimer;
  static const int _inactivityTimeoutMinutes = 5;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _resetInactivityTimer();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _inactivityTimer?.cancel();
    super.dispose();
  }

  DateTime? _pausedTime;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused || state == AppLifecycleState.hidden) {
      // App went to background
      _pausedTime = DateTime.now();
    } else if (state == AppLifecycleState.resumed) {
      // App came to foreground
      if (_pausedTime != null) {
        final elapsed = DateTime.now().difference(_pausedTime!);
        // Lock the app only if it was in the background for more than 120 seconds.
        // This prevents the app from locking when picking files or authenticating biometrics.
        if (elapsed.inSeconds > 120) {
          ref.read(authProvider.notifier).lock();
        }
        _pausedTime = null;
      }
      _resetInactivityTimer();
    }
  }


  void _resetInactivityTimer() {
    _inactivityTimer?.cancel();
    _inactivityTimer = Timer(const Duration(minutes: _inactivityTimeoutMinutes), () {
      // Lock app after inactivity
      ref.read(authProvider.notifier).lock();
    });
  }

  void _handleUserInteraction([_]) {
    _resetInactivityTimer();
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);

    return GestureDetector(
      onTap: _handleUserInteraction,
      onPanDown: _handleUserInteraction,
      onScaleStart: _handleUserInteraction,
      behavior: HitTestBehavior.translucent,
      child: MaterialApp.router(
        title: 'VaultGuard',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        themeMode: ThemeMode.dark, // VaultGuard is dark theme by default
        routerConfig: router,
      ),
    );
  }
}
