import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/dio_client.dart';
import '../../auth/presentation/auth_provider.dart';
import '../domain/spreadsheet_model.dart';

class WorkspacesState {
  final bool isLoading;
  final String? errorMessage;
  final List<SpreadsheetModel> spreadsheets;

  WorkspacesState({
    this.isLoading = false,
    this.errorMessage,
    this.spreadsheets = const [],
  });

  WorkspacesState copyWith({
    bool? isLoading,
    String? errorMessage,
    List<SpreadsheetModel>? spreadsheets,
  }) {
    return WorkspacesState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      spreadsheets: spreadsheets ?? this.spreadsheets,
    );
  }
}

class WorkspacesNotifier extends StateNotifier<WorkspacesState> {
  final Dio _dio;

  WorkspacesNotifier(this._dio) : super(WorkspacesState()) {
    fetchSpreadsheets();
  }

  Future<void> fetchSpreadsheets() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _dio.get('/spreadsheets');
      final list = (response.data as List)
          .map((e) => SpreadsheetModel.fromJson(e))
          .toList();

      state = state.copyWith(
        isLoading: false,
        spreadsheets: list,
      );
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.response?.data['message'] ?? e.message,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
    }
  }

  Future<bool> saveSpreadsheet(String id, String name, dynamic data) async {
    try {
      final response = await _dio.post('/spreadsheets', data: {
        if (id.isNotEmpty) 'id': id,
        'name': name,
        'data': data,
      });

      final savedObj = SpreadsheetModel.fromJson(response.data);
      
      List<SpreadsheetModel> updatedList;
      final exists = state.spreadsheets.any((e) => e.id == savedObj.id);
      if (exists) {
        updatedList = state.spreadsheets.map((e) => e.id == savedObj.id ? savedObj : e).toList();
      } else {
        updatedList = [...state.spreadsheets, savedObj];
      }

      state = state.copyWith(spreadsheets: updatedList);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteSpreadsheet(String id) async {
    try {
      await _dio.delete('/spreadsheets/$id');
      final updatedList = state.spreadsheets.where((e) => e.id != id).toList();
      state = state.copyWith(spreadsheets: updatedList);
      return true;
    } catch (e) {
      return false;
    }
  }
}

final workspacesProvider = StateNotifierProvider<WorkspacesNotifier, WorkspacesState>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return WorkspacesNotifier(dioClient.dio);
});
