import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'activity_provider.dart';

class ActivityScreen extends ConsumerWidget {
  const ActivityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(activityProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Activity Logs'),
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.errorMessage != null
              ? Center(child: Text(state.errorMessage!, style: const TextStyle(color: Colors.red)))
              : state.activities.isEmpty
                  ? const Center(child: Text('No activity found.'))
                  : ListView.builder(
                      itemCount: state.activities.length,
                      itemBuilder: (context, index) {
                        final log = state.activities[index];
                        return ListTile(
                          leading: const Icon(Icons.history, color: Colors.blueGrey),
                          title: Text(log.action),
                          subtitle: Text('${log.details}\n${log.createdAt.toString().split('.')[0]} - IP: ${log.ipAddress}'),
                          isThreeLine: true,
                        );
                      },
                    ),
    );
  }
}
