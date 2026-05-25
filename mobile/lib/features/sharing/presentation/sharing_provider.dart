import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/presentation/auth_provider.dart';
import '../domain/share_model.dart';

class SharingState {
  final bool isLoading;
  final String? errorMessage;
  final List<ShareModel> shares;

  SharingState({
    this.isLoading = false,
    this.errorMessage,
    this.shares = const [],
  });

  SharingState copyWith({
    bool? isLoading,
    String? errorMessage,
    List<ShareModel>? shares,
  }) {
    return SharingState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      shares: shares ?? this.shares,
    );
  }
}

class SharingNotifier extends StateNotifier<SharingState> {
  final Dio _dio;

  SharingNotifier(this._dio) : super(SharingState()) {
    fetchShares();
  }

  Future<void> fetchShares() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _dio.get('/shares');
      final list = (response.data as List)
          .map((e) => ShareModel.fromJson(e))
          .toList();

      if (mounted) {
        state = state.copyWith(
          isLoading: false,
          shares: list,
        );
      }
    } on DioException catch (e) {
      if (!mounted) return;
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.response?.data['message'] ?? e.message,
      );
    } catch (e) {
      if (!mounted) return;
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
    }
  }

  Future<Map<String, dynamic>?> createShare(Map<String, dynamic> payload) async {
    try {
      final response = await _dio.post('/shares', data: payload);
      await fetchShares(); // refresh list
      return {'success': true, 'data': response.data};
    } on DioException catch (e) {
      return {'success': false, 'error': e.response?.data?['message'] ?? e.message};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<bool> revokeShare(int guestId) async {
    try {
      await _dio.delete('/shares/$guestId');
      final updatedList = state.shares.where((e) => e.id != guestId).toList();
      state = state.copyWith(shares: updatedList);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> extendShare(int guestId, String type, int amount) async {
    try {
      final body = type == 'hours' ? {'hours': amount} : {'days': amount};
      await _dio.put('/shares/$guestId/extend', data: body);
      await fetchShares(); // refresh list to get new expiration
      return true;
    } catch (e) {
      return false;
    }
  }
}

final sharingProvider = StateNotifierProvider<SharingNotifier, SharingState>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return SharingNotifier(dioClient.dio);
});
