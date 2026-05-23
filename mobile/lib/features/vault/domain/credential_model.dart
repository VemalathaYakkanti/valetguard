class CredentialModel {
  final int id;
  final String title;
  final String? url;
  final String? username;
  final String encryptedPassword;
  final String iv;
  final String salt;
  final String? encryptedNotes;
  final String? encryptedTotpSecret;
  final String? totpIv;
  final String? totpSalt;
  final bool isFavorite;
  final List<String> tags;

  CredentialModel({
    required this.id,
    required this.title,
    this.url,
    this.username,
    required this.encryptedPassword,
    required this.iv,
    required this.salt,
    this.encryptedNotes,
    this.encryptedTotpSecret,
    this.totpIv,
    this.totpSalt,
    this.isFavorite = false,
    this.tags = const [],
  });

  factory CredentialModel.fromJson(Map<String, dynamic> json) {
    return CredentialModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      title: json['title'] as String,
      url: json['url'] as String?,
      username: json['username'] as String?,
      encryptedPassword: json['encrypted_password'] as String,
      iv: json['iv'] as String,
      salt: json['salt'] as String,
      encryptedNotes: json['encrypted_notes'] as String?,
      encryptedTotpSecret: json['encrypted_totp_secret'] as String?,
      totpIv: json['totp_iv'] as String?,
      totpSalt: json['totp_salt'] as String?,
      isFavorite: json['is_favorite'] == true || json['is_favorite'] == 1,
      tags: json['tags'] is List
          ? List<String>.from(json['tags'] as List)
          : json['tags'] is String
              ? List<String>.from(json['tags'].split(','))
              : const [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'url': url,
      'username': username,
      'encrypted_password': encryptedPassword,
      'iv': iv,
      'salt': salt,
      'encrypted_notes': encryptedNotes,
      'encrypted_totp_secret': encryptedTotpSecret,
      'totp_iv': totpIv,
      'totp_salt': totpSalt,
      'is_favorite': isFavorite ? 1 : 0,
      'tags': tags,
    };
  }

  CredentialModel copyWith({
    int? id,
    String? title,
    String? url,
    String? username,
    String? encryptedPassword,
    String? iv,
    String? salt,
    String? encryptedNotes,
    String? encryptedTotpSecret,
    String? totpIv,
    String? totpSalt,
    bool? isFavorite,
    List<String>? tags,
  }) {
    return CredentialModel(
      id: id ?? this.id,
      title: title ?? this.title,
      url: url ?? this.url,
      username: username ?? this.username,
      encryptedPassword: encryptedPassword ?? this.encryptedPassword,
      iv: iv ?? this.iv,
      salt: salt ?? this.salt,
      encryptedNotes: encryptedNotes ?? this.encryptedNotes,
      encryptedTotpSecret: encryptedTotpSecret ?? this.encryptedTotpSecret,
      totpIv: totpIv ?? this.totpIv,
      totpSalt: totpSalt ?? this.totpSalt,
      isFavorite: isFavorite ?? this.isFavorite,
      tags: tags ?? this.tags,
    );
  }
}
