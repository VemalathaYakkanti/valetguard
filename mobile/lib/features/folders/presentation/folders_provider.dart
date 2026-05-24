import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/dio_client.dart';
import '../../auth/presentation/auth_provider.dart';
import '../domain/folder_model.dart';

class FoldersState {
  final bool isLoading;
  final String? errorMessage;
  final List<FolderModel> folders;
  final List<FolderFileModel> files; // All files or files for a specific folder

  FoldersState({
    this.isLoading = false,
    this.errorMessage,
    this.folders = const [],
    this.files = const [],
  });

  FoldersState copyWith({
    bool? isLoading,
    String? errorMessage,
    List<FolderModel>? folders,
    List<FolderFileModel>? files,
  }) {
    return FoldersState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage, // can be null
      folders: folders ?? this.folders,
      files: files ?? this.files,
    );
  }
}

class FoldersNotifier extends StateNotifier<FoldersState> {
  final Dio _dio;

  FoldersNotifier(this._dio) : super(FoldersState()) {
    fetchAll();
  }

  Future<void> fetchAll() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _dio.get('/folders/all');
      final data = response.data;
      
      final foldersList = (data['folders'] as List?)
              ?.map((e) => FolderModel.fromJson(e))
              .toList() ??
          [];
      final filesList = (data['files'] as List?)
              ?.map((e) => FolderFileModel.fromJson(e))
              .toList() ??
          [];

      state = state.copyWith(
        isLoading: false,
        folders: foldersList,
        files: filesList,
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

  Future<bool> fetchFolderFiles(String slug) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _dio.get('/folders/$slug/files');
      final filesList = (response.data as List)
          .map((e) => FolderFileModel.fromJson(e))
          .toList();

      state = state.copyWith(
        isLoading: false,
        files: filesList,
      );
      return true;
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.response?.data['message'] ?? e.message,
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
      return false;
    }
  }

  Future<bool> createDocument(String folderSlug, String name, String type, String size, String content) async {
    try {
      final response = await _dio.post('/folders/$folderSlug/files', data: {
        'name': name,
        'type': type,
        'size': size,
        'content': content,
      });

      final newFile = FolderFileModel.fromJson(response.data);
      state = state.copyWith(
        files: [newFile, ...state.files],
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateDocument(int id, String content, String size) async {
    try {
      final response = await _dio.put('/folders/files/$id', data: {
        'content': content,
        'size': size,
      });

      final updatedFile = FolderFileModel.fromJson(response.data);
      final updatedList = state.files.map((e) => e.id == id ? updatedFile : e).toList();
      state = state.copyWith(files: updatedList);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteDocument(int id) async {
    try {
      await _dio.delete('/folders/files/$id');
      final updatedList = state.files.where((e) => e.id != id).toList();
      state = state.copyWith(files: updatedList);
      return true;
    } catch (e) {
      return false;
    }
  }
}

final foldersProvider = StateNotifierProvider<FoldersNotifier, FoldersState>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return FoldersNotifier(dioClient.dio);
});
