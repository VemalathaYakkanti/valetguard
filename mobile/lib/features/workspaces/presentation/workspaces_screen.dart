import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'workspaces_provider.dart';

class WorkspacesScreen extends ConsumerWidget {
  const WorkspacesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(workspacesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Workspaces'),
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.errorMessage != null
              ? Center(child: Text(state.errorMessage!, style: const TextStyle(color: Colors.red)))
              : state.spreadsheets.isEmpty
                  ? const Center(child: Text('No workspaces found.'))
                  : ListView.builder(
                      itemCount: state.spreadsheets.length,
                      itemBuilder: (context, index) {
                        final sheet = state.spreadsheets[index];
                        return ListTile(
                          leading: const Icon(Icons.table_chart, color: Colors.green),
                          title: Text(sheet.name),
                          subtitle: Text('ID: ${sheet.id}'),
                          onTap: () {
                            // TODO: Navigate to Spreadsheet Data View
                          },
                        );
                      },
                    ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // TODO: Create new spreadsheet
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
