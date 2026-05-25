class ActivityModel {
  final int id;
  final int userId;
  final String action;
  final String? details;
  final String? ipAddress;
  final DateTime createdAt;

  ActivityModel({
    required this.id,
    required this.userId,
    required this.action,
    this.details,
    this.ipAddress,
    required this.createdAt,
  });

  factory ActivityModel.fromJson(Map<String, dynamic> json) {
    return ActivityModel(
      id: json['id'] as int,
      userId: json['user_id'] as int,
      action: json['action'] as String,
      details: json['details'] as String?,
      ipAddress: json['ip_address'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
