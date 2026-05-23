import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'features/auth/presentation/auth_provider.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/auth/presentation/passcode_setup_screen.dart';
import 'features/security/presentation/lock_screen.dart';
import 'features/vault/presentation/vault_screen.dart';

/// A ChangeNotifier that listens to auth state changes and notifies GoRouter
/// to re-evaluate its redirect logic — without recreating the entire router.
class AuthStateNotifier extends ChangeNotifier {
  AuthStateNotifier(Ref ref) {
    ref.listen<AuthState>(authProvider, (_, __) {
      notifyListeners();
    });
  }
}

final _authStateNotifierProvider = Provider<AuthStateNotifier>((ref) {
  return AuthStateNotifier(ref);
});

final routerProvider = Provider<GoRouter>((ref) {
  final refreshNotifier = ref.watch(_authStateNotifierProvider);

  return GoRouter(
    initialLocation: '/login',
    refreshListenable: refreshNotifier,
    debugLogDiagnostics: true, // Helpful for debugging redirect issues
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/lock',
        builder: (context, state) => const LockScreen(),
      ),
      GoRoute(
        path: '/setup-passcode',
        builder: (context, state) => const PasscodeSetupScreen(),
      ),
      GoRoute(
        path: '/vault',
        builder: (context, state) => const VaultScreen(),
      ),
    ],
    redirect: (context, state) {
      final authState = ref.read(authProvider);
      final isAuthenticated = authState.isAuthenticated;
      final isLocked = authState.isLocked;
      final isLoading = authState.isLoading;

      // While loading (session initialization), don't redirect — stay put
      if (isLoading) return null;

      final currentPath = state.matchedLocation;

      // 1. Not authenticated → must go to /login
      if (!isAuthenticated) {
        return currentPath == '/login' ? null : '/login';
      }

      // 2. Authenticated but passcode not set → must set passcode first
      if (authState.isPasscodeSetupRequired) {
        return currentPath == '/setup-passcode' ? null : '/setup-passcode';
      }

      // 3. Authenticated, passcode set, but app is locked → go to lock screen
      if (isLocked) {
        return currentPath == '/lock' ? null : '/lock';
      }

      // 4. Fully authenticated and unlocked → if still on auth/lock pages, go to vault
      if (currentPath == '/login' ||
          currentPath == '/lock' ||
          currentPath == '/setup-passcode') {
        return '/vault';
      }

      // 5. Already on an authenticated page, no redirect needed
      return null;
    },
  );
});
