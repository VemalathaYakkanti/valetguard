class UserModel {
  final int id;
  final String email;
  final bool twoFactorEnabled;

  UserModel({
    required this.id,
    required this.email,
    required this.twoFactorEnabled,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      email: json['email'] as String,
      twoFactorEnabled: json['two_factor_enabled'] == true || json['two_factor_enabled'] == 1,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'two_factor_enabled': twoFactorEnabled,
    };
  }
}
