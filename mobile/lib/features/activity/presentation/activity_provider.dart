import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/presentation/auth_provider.dart';
import '../domain/activity_model.dart';

class ActivityState {
  final bool isLoading;
  final String? errorMessage;
  final List<ActivityModel> activities;

  ActivityState({
    this.isLoading = false,
    this.errorMessage,
    this.activities = const [],
  });

  ActivityState copyWith({
    bool? isLoading,
    String? errorMessage,
    List<ActivityModel>? activities,
  }) {
    return ActivityState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      activities: activities ?? this.activities,
    );
  }
}

class ActivityNotifier extends StateNotifier<ActivityState> {
  final Dio _dio;

  ActivityNotifier(this._dio) : super(ActivityState()) {
    fetchActivity();
  }

  Future<void> fetchActivity() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _dio.get('/activity');
      final list = (response.data as List)
          .map((e) => ActivityModel.fromJson(e))
          .toList();

      state = state.copyWith(
        isLoading: false,
        activities: list,
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
}

final activityProvider = StateNotifierProvider<ActivityNotifier, ActivityState>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return ActivityNotifier(dioClient.dio);
});
