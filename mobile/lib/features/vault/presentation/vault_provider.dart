import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/utils/encryption_helper.dart';
import '../../auth/presentation/auth_provider.dart';
import '../domain/credential_model.dart';

class VaultState {
  final List<CredentialModel> credentials;
  final bool isLoading;
  final String? errorMessage;
  final String searchQuery;

  VaultState({
    this.credentials = const [],
    this.isLoading = false,
    this.errorMessage,
    this.searchQuery = '',
  });

  VaultState copyWith({
    List<CredentialModel>? credentials,
    bool? isLoading,
    String? errorMessage,
    String? searchQuery,
  }) {
    return VaultState(
      credentials: credentials ?? this.credentials,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }
}

class VaultNotifier extends StateNotifier<VaultState> {
  final DioClient _dioClient;
  final AuthState _authState;

  VaultNotifier(this._dioClient, this._authState) : super(VaultState()) {
    if (_authState.isAuthenticated && !_authState.isLocked) {
      fetchCredentials();
    }
  }

  /// Sets the search query for filtering credentials
  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  /// Fetches credentials from backend
  Future<void> fetchCredentials() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _dioClient.dio.get(ApiConstants.credentials);
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        final credentials = data.map((json) => CredentialModel.fromJson(json)).toList();
        state = state.copyWith(
          credentials: credentials,
          isLoading: false,
        );
      }
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Failed to load credentials.';
      state = state.copyWith(isLoading: false, errorMessage: msg);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Unexpected error occurred.');
    }
  }

  /// Add a new credential with client-side encryption
  Future<bool> addCredential({
    required String title,
    required String username,
    required String password,
    String? url,
    String? notes,
    String? totpSecret,
  }) async {
    final masterPassword = _authState.masterPassword;
    if (masterPassword == null) {
      state = state.copyWith(errorMessage: 'Master password missing. Lock and unlock the app.');
      return false;
    }

    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      // 1. Encrypt password client-side
      final encryptedPwd = EncryptionHelper.encryptData(password, masterPassword);

      // 2. Encrypt notes client-side if present
      String? encryptedNotesJson;
      if (notes != null && notes.isNotEmpty) {
        final encNotes = EncryptionHelper.encryptData(notes, masterPassword);
        encryptedNotesJson = json.encode(encNotes);
      }

      // 3. Encrypt TOTP secret client-side if present
      Map<String, String>? encryptedTotp;
      if (totpSecret != null && totpSecret.trim().isNotEmpty) {
        encryptedTotp = EncryptionHelper.encryptData(totpSecret.replaceAll(' ', ''), masterPassword);
      }

      final payload = {
        'title': title,
        'username': username,
        'url': url ?? '',
        'encrypted_password': encryptedPwd['ciphertext'],
        'iv': encryptedPwd['iv'],
        'salt': encryptedPwd['salt'],
        'encrypted_notes': encryptedNotesJson,
        'encrypted_totp_secret': encryptedTotp?['ciphertext'],
        'totp_iv': encryptedTotp?['iv'],
        'totp_salt': encryptedTotp?['salt'],
        'tags': [],
      };

      final response = await _dioClient.dio.post(ApiConstants.credentials, data: payload);
      if (response.statusCode == 201) {
        await fetchCredentials();
        return true;
      }
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Failed to save credential.';
      state = state.copyWith(isLoading: false, errorMessage: msg);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Encryption or network failure.');
    }
    return false;
  }

  /// Edit a credential with client-side encryption
  Future<bool> editCredential({
    required int id,
    required String title,
    required String username,
    required String password,
    String? url,
    String? notes,
    String? totpSecret,
  }) async {
    final masterPassword = _authState.masterPassword;
    if (masterPassword == null) {
      state = state.copyWith(errorMessage: 'Master password missing.');
      return false;
    }

    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      // 1. Encrypt password client-side
      final encryptedPwd = EncryptionHelper.encryptData(password, masterPassword);

      // 2. Encrypt notes client-side if present
      String? encryptedNotesJson;
      if (notes != null && notes.isNotEmpty) {
        final encNotes = EncryptionHelper.encryptData(notes, masterPassword);
        encryptedNotesJson = json.encode(encNotes);
      }

      // 3. Encrypt TOTP secret client-side if present
      Map<String, String>? encryptedTotp;
      if (totpSecret != null && totpSecret.trim().isNotEmpty) {
        encryptedTotp = EncryptionHelper.encryptData(totpSecret.replaceAll(' ', ''), masterPassword);
      }

      final payload = {
        'title': title,
        'username': username,
        'url': url ?? '',
        'encrypted_password': encryptedPwd['ciphertext'],
        'iv': encryptedPwd['iv'],
        'salt': encryptedPwd['salt'],
        'encrypted_notes': encryptedNotesJson,
        'encrypted_totp_secret': encryptedTotp?['ciphertext'],
        'totp_iv': encryptedTotp?['iv'],
        'totp_salt': encryptedTotp?['salt'],
        'tags': [],
      };

      final response = await _dioClient.dio.put('${ApiConstants.credentials}/$id', data: payload);
      if (response.statusCode == 200) {
        await fetchCredentials();
        return true;
      }
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Failed to update credential.';
      state = state.copyWith(isLoading: false, errorMessage: msg);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Encryption or network failure.');
    }
    return false;
  }

  /// Delete a credential
  Future<bool> deleteCredential(int id) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _dioClient.dio.delete('${ApiConstants.credentials}/$id');
      if (response.statusCode == 200) {
        await fetchCredentials();
        return true;
      }
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Failed to delete credential.';
      state = state.copyWith(isLoading: false, errorMessage: msg);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Network failure.');
    }
    return false;
  }
}

// Providers
final vaultProvider = StateNotifierProvider<VaultNotifier, VaultState>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  final authState = ref.watch(authProvider);
  return VaultNotifier(dioClient, authState);
});

final filteredCredentialsProvider = Provider<List<CredentialModel>>((ref) {
  final vaultState = ref.watch(vaultProvider);
  final query = vaultState.searchQuery.toLowerCase();

  if (query.isEmpty) {
    return vaultState.credentials;
  }

  return vaultState.credentials.where((item) {
    final title = item.title.toLowerCase();
    final username = item.username?.toLowerCase() ?? '';
    final url = item.url?.toLowerCase() ?? '';
    return title.contains(query) || username.contains(query) || url.contains(query);
  }).toList();
});
