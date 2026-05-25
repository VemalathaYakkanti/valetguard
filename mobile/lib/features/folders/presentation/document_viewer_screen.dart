import 'dart:convert';
import 'package:flutter/material.dart';
import '../domain/folder_model.dart';
import '../../../core/theme/color_schemes.dart';

class DocumentViewerScreen extends StatelessWidget {
  final FolderFileModel file;

  const DocumentViewerScreen({super.key, required this.file});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorSchemes.darkBackground,
      appBar: AppBar(
        title: Text(file.name, style: const TextStyle(color: Colors.white, fontSize: 18)),
        backgroundColor: ColorSchemes.darkBackground,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: _buildContent(),
        ),
      ),
    );
  }

  Widget _buildContent() {
    if (file.content == null || file.content!.isEmpty) {
      return const Center(
        child: Text("No content available for this file.", style: TextStyle(color: Colors.white70)),
      );
    }

    // Handle images
    if (file.type.startsWith('image/')) {
      try {
        final contentStr = file.content!;
        // Extract base64 part if it has data URL prefix like "data:image/png;base64,..."
        final base64String = contentStr.contains(',') 
            ? contentStr.split(',').last 
            : contentStr;
        
        final bytes = base64Decode(base64String);
        return Center(
          child: InteractiveViewer(
            child: Image.memory(bytes),
          ),
        );
      } catch (e) {
        return _buildError("Failed to load image: $e");
      }
    }

    // Default to text view (for text/plain, text/csv, etc. or fallback)
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: ColorSchemes.darkSurface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: SingleChildScrollView(
        child: SelectableText(
          file.content!,
          style: const TextStyle(color: Colors.white, fontSize: 14, fontFamily: 'monospace'),
        ),
      ),
    );
  }

  Widget _buildError(String message) {
    return Center(
      child: Text(
        message,
        style: const TextStyle(color: Colors.redAccent),
        textAlign: TextAlign.center,
      ),
    );
  }
}
