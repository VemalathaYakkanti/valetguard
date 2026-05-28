import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/presentation/auth_provider.dart';
import '../domain/share_model.dart';

class EmployeeModel {
  final int id;
  final String name;
  final String email;
  final String? companyName;
  final String? role;

  EmployeeModel({
    required this.id,
    required this.name,
    required this.email,
    this.companyName,
    this.role,
  });

  factory EmployeeModel.fromJson(Map<String, dynamic> json) {
    return EmployeeModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      name: json['name'] as String,
      email: json['email'] as String,
      companyName: json['company_name'] as String?,
      role: json['role'] as String?,
    );
  }
}

class SharingState {
  final bool isLoading;
  final String? errorMessage;
  final List<ShareModel> shares;
  final List<EmployeeModel> employees;

  SharingState({
    this.isLoading = false,
    this.errorMessage,
    this.shares = const [],
    this.employees = const [],
  });

  SharingState copyWith({
    bool? isLoading,
    String? errorMessage,
    List<ShareModel>? shares,
    List<EmployeeModel>? employees,
  }) {
    return SharingState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      shares: shares ?? this.shares,
      employees: employees ?? this.employees,
    );
  }
}

class SharingNotifier extends StateNotifier<SharingState> {
  final Dio _dio;

  SharingNotifier(this._dio) : super(SharingState()) {
    fetchShares();
    fetchEmployees();
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

  Future<void> fetchEmployees() async {
    try {
      final response = await _dio.get('/employees');
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        final list = data.map((e) => EmployeeModel.fromJson(e)).toList();
        state = state.copyWith(employees: list);
      }
    } catch (e) {
      // fail silently
    }
  }
}

final sharingProvider = StateNotifierProvider<SharingNotifier, SharingState>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return SharingNotifier(dioClient.dio);
});
