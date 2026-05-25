import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:file_picker/file_picker.dart';
import 'folders_provider.dart';
import '../domain/folder_model.dart';
import 'document_viewer_screen.dart';
import '../../../core/theme/color_schemes.dart';

class FoldersScreen extends ConsumerStatefulWidget {
  const FoldersScreen({super.key});

  @override
  ConsumerState<FoldersScreen> createState() => _FoldersScreenState();
}

class _FoldersScreenState extends ConsumerState<FoldersScreen> {
  FolderModel? selectedFolder;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(foldersProvider);

    return Scaffold(
      backgroundColor: ColorSchemes.darkBackground,
      appBar: AppBar(
        title: Text(selectedFolder == null ? 'Folders' : selectedFolder!.name, style: const TextStyle(color: Colors.white)),
        backgroundColor: ColorSchemes.darkBackground,
        iconTheme: const IconThemeData(color: Colors.white),
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
              backgroundColor: ColorSchemes.primaryBlue,
              onPressed: _pickAndUploadFile,
              child: const Icon(Icons.upload_file, color: Colors.white),
            )
          : null,
    );
  }

  Future<void> _pickAndUploadFile() async {
    if (selectedFolder == null) return;

    FilePickerResult? result = await FilePicker.pickFiles();

    if (result != null && result.files.single.path != null) {
      final file = File(result.files.single.path!);
      final bytes = await file.readAsBytes();
      final base64String = base64Encode(bytes);
      
      final sizeMb = (bytes.length / (1024 * 1024)).toStringAsFixed(2);
      final sizeStr = bytes.length > 1024 * 1024 ? '$sizeMb MB' : '${(bytes.length / 1024).toStringAsFixed(1)} KB';
      
      // Determine type based on extension
      String type = 'application/octet-stream';
      final ext = result.files.single.extension?.toLowerCase();
      if (['png', 'jpg', 'jpeg', 'gif'].contains(ext)) type = 'image/$ext';
      else if (ext == 'pdf') type = 'application/pdf';
      else if (ext == 'txt') type = 'text/plain';

      ref.read(foldersProvider.notifier).createDocument(
        selectedFolder!.slug,
        result.files.single.name,
        type,
        sizeStr,
        base64String, // Note: the backend handles text/plain directly or base64. Since we just send content, backend takes it as is.
      );
    }
  }

  Widget _buildFoldersList(List<FolderModel> folders) {
    if (folders.isEmpty) {
      return const Center(child: Text('No folders found.', style: TextStyle(color: Colors.white)));
    }
    return ListView.builder(
      itemCount: folders.length,
      itemBuilder: (context, index) {
        final folder = folders[index];
        return Card(
          color: ColorSchemes.darkSurface,
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: ListTile(
            leading: const Icon(Icons.folder, color: ColorSchemes.primaryBlue),
            title: Text(folder.name, style: const TextStyle(color: Colors.white)),
            onTap: () {
              setState(() {
                selectedFolder = folder;
              });
              ref.read(foldersProvider.notifier).fetchFolderFiles(folder.slug);
            },
          ),
        );
      },
    );
  }

  Widget _buildFilesList(List<FolderFileModel> files) {
    if (files.isEmpty) {
      return const Center(child: Text('No documents in this folder.', style: TextStyle(color: Colors.white)));
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

        return Card(
          color: ColorSchemes.darkSurface,
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: ListTile(
            leading: Icon(iconData, color: Colors.blueGrey),
            title: Text(file.name, style: const TextStyle(color: Colors.white)),
            subtitle: Text('${file.size} • ${file.updatedAt.toString().split('.')[0]}', style: const TextStyle(color: Colors.white70)),
            onTap: () async {
              // Check if the file content is a valid URL
              final content = file.content?.trim();
              if (content != null && (content.startsWith('http://') || content.startsWith('https://'))) {
                final uri = Uri.tryParse(content);
                if (uri != null && await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                  return;
                }
              }

              // Otherwise open the DocumentViewerScreen
              if (context.mounted) {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => DocumentViewerScreen(file: file),
                  ),
                );
              }
            },
          ),
        );
      },
    );
  }
}
