import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:open_file/open_file.dart';

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
                  final slug = selectedFolder!.slug;
                  if (slug.contains('---')) {
                    final parts = slug.split('---');
                    parts.removeLast();
                    final parentSlug = parts.join('---');
                    
                    String parentName = parts.last;
                    try {
                      final originalFolder = ref.read(foldersProvider).folders.firstWhere((f) => f.slug == parentSlug);
                      parentName = originalFolder.name;
                    } catch (_) {}
                    
                    setState(() {
                      selectedFolder = FolderModel(
                        id: 0,
                        name: parentName,
                        slug: parentSlug,
                        icon: 'folder',
                      );
                    });
                    ref.read(foldersProvider.notifier).fetchFolderFiles(parentSlug);
                  } else {
                    setState(() {
                      selectedFolder = null;
                    });
                    ref.read(foldersProvider.notifier).fetchAll();
                  }
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

    try {
      FilePickerResult? result = await FilePicker.pickFiles();
      if (result == null || result.files.single.path == null) return;

      if (!mounted) return;
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(ColorSchemes.primaryBlue),
          ),
        ),
      );

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

      final uploadContent = 'data:$type;base64,$base64String';

      final success = await ref.read(foldersProvider.notifier).createDocument(
        selectedFolder!.slug,
        result.files.single.name,
        type,
        sizeStr,
        uploadContent,
      );

      if (mounted) {
        Navigator.pop(context); // Close progress dialog
      }

      if (success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('"${result.files.single.name}" uploaded successfully!'),
              backgroundColor: const Color(0xFF10B981),
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to upload file to server.'),
              backgroundColor: Colors.redAccent,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        try { Navigator.pop(context); } catch (_) {}
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  Widget _buildFoldersList(List<FolderModel> folders) {
    final topLevelFolders = folders.where((f) => !f.slug.contains('---')).toList();

    if (topLevelFolders.isEmpty) {
      return const Center(child: Text('No folders found.', style: TextStyle(color: Colors.white)));
    }
    return ListView.builder(
      itemCount: topLevelFolders.length,
      itemBuilder: (context, index) {
        final folder = topLevelFolders[index];
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
    final subfolders = files.where((f) => f.type == 'folder').toList();
    final actualFiles = files.where((f) => f.type != 'folder').toList();

    if (subfolders.isEmpty && actualFiles.isEmpty) {
      return const Center(child: Text('This directory container is empty.', style: TextStyle(color: Colors.white)));
    }

    return ListView(
      padding: const EdgeInsets.symmetric(vertical: 8),
      children: [
        if (subfolders.isNotEmpty) ...[
          const Padding(
            padding: EdgeInsets.only(left: 20, top: 12, bottom: 6),
            child: Text(
              'SUBFOLDERS',
              style: TextStyle(
                color: ColorSchemes.textMuted,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2,
              ),
            ),
          ),
          ...subfolders.map((folderFile) {
            return Card(
              color: ColorSchemes.darkSurface,
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: ListTile(
                leading: const Icon(Icons.folder, color: Colors.amber),
                title: Text(folderFile.name, style: const TextStyle(color: Colors.white)),
                trailing: const Icon(Icons.chevron_right, color: Colors.white54),
                onTap: () {
                  final cleanSubName = folderFile.name.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '-');
                  final newSlug = '${selectedFolder!.slug}---$cleanSubName';
                  setState(() {
                    selectedFolder = FolderModel(
                      id: folderFile.id,
                      name: folderFile.name,
                      slug: newSlug,
                      icon: 'folder',
                    );
                  });
                  ref.read(foldersProvider.notifier).fetchFolderFiles(newSlug);
                },
              ),
            );
          }),
        ],
        if (actualFiles.isNotEmpty) ...[
          const Padding(
            padding: EdgeInsets.only(left: 20, top: 16, bottom: 6),
            child: Text(
              'FILES',
              style: TextStyle(
                color: ColorSchemes.textMuted,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2,
              ),
            ),
          ),
          ...actualFiles.map((file) {
            IconData iconData = Icons.insert_drive_file;
            if (file.type.contains('image')) iconData = Icons.image;
            if (file.type.contains('pdf')) iconData = Icons.picture_as_pdf;
            if (file.type.contains('word')) iconData = Icons.description;
            if (file.type.contains('excel') || file.type.contains('spreadsheet')) iconData = Icons.table_chart;

            return Card(
              color: ColorSchemes.darkSurface,
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: ListTile(
                leading: Icon(iconData, color: Colors.blueGrey),
                title: Text(file.name, style: const TextStyle(color: Colors.white)),
                subtitle: Text('${file.size} • ${file.updatedAt.toString().split('.')[0]}', style: const TextStyle(color: Colors.white70)),
                onTap: () async {
                  String content = file.content?.trim() ?? '';
                  String name = file.name.trim();

                  if (content.startsWith('{') && content.endsWith('}')) {
                    try {
                      final parsed = jsonDecode(content);
                      if (parsed is Map && parsed.containsKey('url')) {
                        content = parsed['url']?.toString().trim() ?? '';
                      }
                    } catch (_) {}
                  }

                  String urlToLaunch = '';
                  if (content.startsWith('http://') || content.startsWith('https://')) {
                    urlToLaunch = content;
                  } else if (name.startsWith('http://') || name.startsWith('https://')) {
                    urlToLaunch = name;
                  } else {
                    final domainRegex = RegExp(r'^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(/.*)?$');
                    if (domainRegex.hasMatch(content)) {
                      urlToLaunch = 'https://$content';
                    } else if (domainRegex.hasMatch(name)) {
                      urlToLaunch = 'https://$name';
                    }
                  }

                  if (urlToLaunch.isNotEmpty) {
                    final uri = Uri.tryParse(urlToLaunch);
                    if (uri != null) {
                      try {
                        await launchUrl(uri, mode: LaunchMode.externalApplication);
                        return;
                      } catch (_) {}
                    }
                  }

                  if (context.mounted) {
                    await _openFileWithExternalApp(context, file);
                  }
                },
              ),
            );
          }),
        ],
      ],
    );
  }

  Future<void> _openFileWithExternalApp(BuildContext context, FolderFileModel file) async {
    try {
      final tempDir = await getTemporaryDirectory();
      final tempPath = tempDir.path;
      final filePath = '$tempPath/${file.name}';
      
      final contentStr = file.content ?? '';
      Uint8List bytes;
      if (contentStr.startsWith('data:') && contentStr.contains('base64,')) {
        final base64Part = contentStr.split('base64,').last;
        bytes = base64Decode(base64Part);
      } else {
        try {
          bytes = base64Decode(contentStr);
        } catch (e) {
          bytes = utf8.encode(contentStr);
        }
      }
      
      final tempFile = File(filePath);
      await tempFile.writeAsBytes(bytes);
      
      final result = await OpenFile.open(filePath);
      if (result.type != ResultType.done) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No app found to open this file. Viewing as text instead.')),
          );
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => DocumentViewerScreen(file: file),
            ),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error opening file: $e')),
        );
      }
    }
  }
}

