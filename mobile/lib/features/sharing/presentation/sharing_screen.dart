import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'sharing_provider.dart';

class SharingScreen extends ConsumerWidget {
  const SharingScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(sharingProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Shared Access'),
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.errorMessage != null
              ? Center(child: Text(state.errorMessage!, style: const TextStyle(color: Colors.red)))
              : state.shares.isEmpty
                  ? const Center(child: Text('No active shares.'))
                  : ListView.builder(
                      itemCount: state.shares.length,
                      itemBuilder: (context, index) {
                        final share = state.shares[index];
                        final isExpired = share.expiresAt.isBefore(DateTime.now());

                        return ListTile(
                          leading: Icon(
                            share.isActivated ? Icons.lock_open : Icons.pending,
                            color: share.isActivated ? Colors.green : Colors.orange,
                          ),
                          title: Text(share.name),
                          subtitle: Text('${share.email}\nExpires: ${share.expiresAt.toString().split('.')[0]}'),
                          isThreeLine: true,
                          trailing: isExpired
                              ? const Text('Expired', style: TextStyle(color: Colors.red))
                              : IconButton(
                                  icon: const Icon(Icons.delete, color: Colors.red),
                                  onPressed: () {
                                    ref.read(sharingProvider.notifier).revokeShare(share.id);
                                  },
                                ),
                        );
                      },
                    ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // TODO: Show Create Share Dialog
        },
        child: const Icon(Icons.share),
      ),
    );
  }
}
