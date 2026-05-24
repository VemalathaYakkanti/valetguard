import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'folders_provider.dart';
import '../domain/folder_model.dart';

class FoldersScreen extends ConsumerStatefulWidget {
  const FoldersScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<FoldersScreen> createState() => _FoldersScreenState();
}

class _FoldersScreenState extends ConsumerState<FoldersScreen> {
  FolderModel? selectedFolder;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(foldersProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(selectedFolder == null ? 'Folders' : selectedFolder!.name),
        leading: selectedFolder != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () {
                  setState(() {
                    selectedFolder = null;
                  });
                  ref.read(foldersProvider.notifier).fetchAll();
                },
              )
            : null,
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.errorMessage != null
              ? Center(child: Text(state.errorMessage!, style: const TextStyle(color: Colors.red)))
              : selectedFolder == null
                  ? _buildFoldersList(state.folders)
                  : _buildFilesList(state.files),
      floatingActionButton: selectedFolder != null
          ? FloatingActionButton(
              onPressed: () {
                // TODO: Show dialog to create a new file
              },
              child: const Icon(Icons.add),
            )
          : null,
    );
  }

  Widget _buildFoldersList(List<FolderModel> folders) {
    if (folders.isEmpty) {
      return const Center(child: Text('No folders found.'));
    }
    return ListView.builder(
      itemCount: folders.length,
      itemBuilder: (context, index) {
        final folder = folders[index];
        return ListTile(
          leading: const Icon(Icons.folder, color: Colors.blue),
          title: Text(folder.name),
          onTap: () {
            setState(() {
              selectedFolder = folder;
            });
            ref.read(foldersProvider.notifier).fetchFolderFiles(folder.slug);
          },
        );
      },
    );
  }

  Widget _buildFilesList(List<FolderFileModel> files) {
    if (files.isEmpty) {
      return const Center(child: Text('No documents in this folder.'));
    }
    return ListView.builder(
      itemCount: files.length,
      itemBuilder: (context, index) {
        final file = files[index];
        IconData iconData = Icons.insert_drive_file;
        if (file.type.contains('image')) iconData = Icons.image;
        if (file.type.contains('pdf')) iconData = Icons.picture_as_pdf;
        if (file.type.contains('word')) iconData = Icons.description;
        if (file.type.contains('excel') || file.type.contains('spreadsheet')) iconData = Icons.table_chart;

        return ListTile(
          leading: Icon(iconData, color: Colors.blueGrey),
          title: Text(file.name),
          subtitle: Text('${file.size} • ${file.updatedAt.toString().split('.')[0]}'),
          onTap: () {
            // TODO: Navigate to Document Viewer/Editor
          },
        );
      },
    );
  }
}
