import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import 'package:local_auth/local_auth.dart';
import '../domain/user_model.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/constants/api_constants.dart';

class AuthState {
  final bool isAuthenticated;
  final bool isLocked;
  final bool isLoading;
  final UserModel? user;
  final String? masterPassword;
  final bool biometricsEnabled;
  final String? errorMessage;
  final bool hasAppPasscode;
  final bool isPasscodeSetupRequired;

  AuthState({
    this.isAuthenticated = false,
    this.isLocked = true,
    this.isLoading = true, // Start as loading so the router doesn't flash /login
    this.user,
    this.masterPassword,
    this.biometricsEnabled = false,
    this.errorMessage,
    this.hasAppPasscode = false,
    this.isPasscodeSetupRequired = false,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isLocked,
    bool? isLoading,
    UserModel? user,
    String? masterPassword,
    bool? biometricsEnabled,
    String? errorMessage,
    bool? hasAppPasscode,
    bool? isPasscodeSetupRequired,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLocked: isLocked ?? this.isLocked,
      isLoading: isLoading ?? this.isLoading,
      user: user ?? this.user,
      masterPassword: masterPassword ?? this.masterPassword,
      biometricsEnabled: biometricsEnabled ?? this.biometricsEnabled,
      errorMessage: errorMessage ?? this.errorMessage,
      hasAppPasscode: hasAppPasscode ?? this.hasAppPasscode,
      isPasscodeSetupRequired: isPasscodeSetupRequired ?? this.isPasscodeSetupRequired,
    );
  }

  @override
  String toString() {
    return 'AuthState(isAuthenticated: $isAuthenticated, isLocked: $isLocked, '
        'isLoading: $isLoading, hasAppPasscode: $hasAppPasscode, '
        'isPasscodeSetupRequired: $isPasscodeSetupRequired, '
        'user: ${user?.email ?? "null"}, '
        'hasMasterPassword: ${masterPassword != null})';
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final DioClient _dioClient;
  final _storage = const FlutterSecureStorage();
  final _localAuth = LocalAuthentication();

  AuthNotifier(this._dioClient) : super(AuthState()) {
    _initSession();
  }

  Future<void> _initSession() async {
    // State starts as isLoading: true (set in constructor default)
    try {
      final token = await _storage.read(key: 'auth_token');
      final userJson = await _storage.read(key: 'auth_user');
      final hasPasscode = await _storage.read(key: 'app_passcode') != null;

      // Load biometrics preference
      final prefs = await SharedPreferences.getInstance();
      final bioPref = prefs.getBool('biometrics_enabled') ?? false;

      if (token != null && userJson != null) {
        // User has a saved session — they are authenticated but locked
        final user = UserModel.fromJson(json.decode(userJson));
        state = AuthState(
          isAuthenticated: true,
          isLocked: true, // Always locked on app start
          isLoading: false,
          user: user,
          biometricsEnabled: bioPref,
          hasAppPasscode: hasPasscode,
          isPasscodeSetupRequired: !hasPasscode,
        );
      } else {
        // No saved session → user needs to log in
        state = AuthState(
          isAuthenticated: false,
          isLocked: false,
          isLoading: false,
          biometricsEnabled: bioPref,
          hasAppPasscode: hasPasscode,
          isPasscodeSetupRequired: false,
        );
      }
    } catch (e) {
      // On error, default to unauthenticated
      state = AuthState(
        isAuthenticated: false,
        isLocked: false,
        isLoading: false,
        errorMessage: 'Session initialization failed: ${e.toString()}',
      );
    }
  }

  /// Normal Login via API using Email and Master Password
  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _dioClient.dio.post(
        ApiConstants.login,
        data: {
          'email': email,
          'password': password,
          'clientType': 'mobile',
        },
      );

      if (response.statusCode == 200) {
        final data = response.data;

        // The mobile bypass should return { token, user }
        // But check if the response accidentally asks for 2FA
        if (data['twoFactorRequired'] == true || data['requiresTwoFactorSetup'] == true) {
          state = state.copyWith(
            isLoading: false,
            errorMessage: 'Backend is requiring 2FA. Ensure clientType mobile bypass is enabled.',
          );
          return false;
        }

        if (data['token'] == null || data['user'] == null) {
          state = state.copyWith(
            isLoading: false,
            errorMessage: 'Unexpected server response. Missing token or user data.',
          );
          return false;
        }

        final user = UserModel.fromJson(data['user']);
        final token = data['token'];

        // Save token & user details persistently
        await _storage.write(key: 'auth_token', value: token);
        await _storage.write(key: 'auth_user', value: json.encode(user.toJson()));

        // Save master password securely for vault decryption
        await _storage.write(key: 'master_password', value: password);

        final hasPasscode = await _storage.read(key: 'app_passcode') != null;

        // After login: if passcode is NOT set, force passcode setup (isLocked = false because
        // they just authenticated). If passcode IS set, go directly to vault (unlocked).
        state = AuthState(
          isAuthenticated: true,
          isLocked: false, // Just logged in — not locked
          isLoading: false,
          user: user,
          masterPassword: password,
          hasAppPasscode: hasPasscode,
          isPasscodeSetupRequired: !hasPasscode,
        );
        return true;
      } else {
        state = state.copyWith(
          isLoading: false,
          errorMessage: 'Login failed with status: ${response.statusCode}',
        );
      }
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Login failed. Please verify credentials.';
      state = state.copyWith(isLoading: false, errorMessage: msg);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Unexpected connection error: ${e.toString()}');
    }
    return false;
  }

  /// Set the local app passcode
  Future<void> setAppPasscode(String passcode) async {
    state = state.copyWith(isLoading: true);
    try {
      await _storage.write(key: 'app_passcode', value: passcode);
      state = AuthState(
        isAuthenticated: true,
        isLocked: false,
        isLoading: false,
        user: state.user,
        masterPassword: state.masterPassword,
        biometricsEnabled: state.biometricsEnabled,
        hasAppPasscode: true,
        isPasscodeSetupRequired: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Failed to save passcode: ${e.toString()}');
    }
  }

  /// Unlock using the local app passcode
  Future<bool> unlockWithPasscode(String passcode) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final savedPasscode = await _storage.read(key: 'app_passcode');
      if (savedPasscode == null) {
        state = state.copyWith(isLoading: false, errorMessage: 'No passcode set up.');
        return false;
      }

      if (savedPasscode == passcode) {
        final savedMasterPassword = await _storage.read(key: 'master_password');
        state = state.copyWith(
          isLocked: false,
          masterPassword: savedMasterPassword,
          isLoading: false,
        );
        return true;
      } else {
        state = state.copyWith(isLoading: false, errorMessage: 'Incorrect App Passcode.');
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Unlock failed: ${e.toString()}');
    }
    return false;
  }

  /// Unlock using master password directly
  Future<bool> unlockWithPassword(String password) async {
    if (state.user == null) return false;
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      // Validate the password against the backend login API to ensure it's correct
      final response = await _dioClient.dio.post(
        ApiConstants.login,
        data: {
          'email': state.user!.email,
          'password': password,
          'clientType': 'mobile',
        },
      );

      if (response.statusCode == 200 && response.data['token'] != null) {
        await _storage.write(key: 'master_password', value: password);
        // Also update the token since the backend issued a new one
        await _storage.write(key: 'auth_token', value: response.data['token']);
        state = state.copyWith(
          isLocked: false,
          masterPassword: password,
          isLoading: false,
        );
        return true;
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Incorrect Master Password.');
    }
    return false;
  }

  /// Biometrics prompt unlock
  Future<bool> unlockWithBiometrics() async {
    if (!state.biometricsEnabled) return false;
    
    try {
      final canCheck = await _localAuth.canCheckBiometrics;
      final isSupported = await _localAuth.isDeviceSupported();
      if (!canCheck || !isSupported) return false;

      final didAuthenticate = await _localAuth.authenticate(
        localizedReason: 'Authenticate to access VaultGuard',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );

      if (didAuthenticate) {
        final savedPassword = await _storage.read(key: 'master_password');
        if (savedPassword != null) {
          state = state.copyWith(
            isLocked: false,
            masterPassword: savedPassword,
          );
          return true;
        }
      }
    } catch (e) {
      state = state.copyWith(errorMessage: 'Biometric authentication failed.');
    }
    return false;
  }

  /// Lock app manually or after timeout
  void lock() {
    state = state.copyWith(
      isLocked: true,
      masterPassword: null, // Clear master password from memory
    );
  }

  /// Toggle Biometrics settings
  Future<void> setBiometricsEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('biometrics_enabled', enabled);
    state = state.copyWith(biometricsEnabled: enabled);
  }

  /// Logout and wipe local storage securely
  Future<void> logout() async {
    state = state.copyWith(isLoading: true);
    await _storage.deleteAll();
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();

    state = AuthState(
      isAuthenticated: false,
      isLocked: false,
      isLoading: false,
      biometricsEnabled: false,
    );
  }
}

// Global Providers
final dioClientProvider = Provider<DioClient>((ref) => DioClient());

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return AuthNotifier(dioClient);
});
