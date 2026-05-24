class FolderModel {
  final int id;
  final String name;
  final String slug;
  final String icon;

  FolderModel({
    required this.id,
    required this.name,
    required this.slug,
    required this.icon,
  });

  factory FolderModel.fromJson(Map<String, dynamic> json) {
    return FolderModel(
      id: json['id'] as int,
      name: json['name'] as String,
      slug: json['slug'] as String,
      icon: json['icon'] as String? ?? 'folder',
    );
  }
}

class FolderFileModel {
  final int id;
  final String folderSlug;
  final String name;
  final String type;
  final String size;
  final String? content;
  final DateTime updatedAt;

  FolderFileModel({
    required this.id,
    required this.folderSlug,
    required this.name,
    required this.type,
    required this.size,
    this.content,
    required this.updatedAt,
  });

  factory FolderFileModel.fromJson(Map<String, dynamic> json) {
    return FolderFileModel(
      id: json['id'] as int,
      folderSlug: json['folder_slug'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      size: json['size'] as String,
      content: json['content'] as String?,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : DateTime.now(),
    );
  }
}
