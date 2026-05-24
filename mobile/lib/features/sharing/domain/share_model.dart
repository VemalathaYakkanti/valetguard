class ShareModel {
  final int id;
  final String name;
  final String email;
  final String? employer;
  final DateTime expiresAt;
  final bool isActivated;
  final int credentialCount;
  final int folderCount;
  final int fileCount;

  ShareModel({
    required this.id,
    required this.name,
    required this.email,
    this.employer,
    required this.expiresAt,
    required this.isActivated,
    this.credentialCount = 0,
    this.folderCount = 0,
    this.fileCount = 0,
  });

  factory ShareModel.fromJson(Map<String, dynamic> json) {
    return ShareModel(
      id: json['id'] as int,
      name: json['name'] as String,
      email: json['email'] as String,
      employer: json['employer'] as String?,
      expiresAt: DateTime.parse(json['expires_at'] as String),
      isActivated: json['is_activated'] == 1 || json['is_activated'] == true,
      credentialCount: json['credential_count'] ?? 0,
      folderCount: json['folder_count'] ?? 0,
      fileCount: json['file_count'] ?? 0,
    );
  }
}
