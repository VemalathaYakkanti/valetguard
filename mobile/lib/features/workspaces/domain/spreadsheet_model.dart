class SpreadsheetModel {
  final String id;
  final String name;
  final dynamic data; // Usually a JSON string or List

  SpreadsheetModel({
    required this.id,
    required this.name,
    required this.data,
  });

  factory SpreadsheetModel.fromJson(Map<String, dynamic> json) {
    return SpreadsheetModel(
      id: json['id'] as String,
      name: json['name'] as String,
      data: json['data'],
    );
  }
}
