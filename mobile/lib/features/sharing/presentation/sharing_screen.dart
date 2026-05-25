import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'sharing_provider.dart';
import 'create_share_screen.dart';
import '../../../core/theme/color_schemes.dart';

class SharingScreen extends ConsumerStatefulWidget {
  const SharingScreen({super.key});

  @override
  ConsumerState<SharingScreen> createState() => _SharingScreenState();
}

class _SharingScreenState extends ConsumerState<SharingScreen> {
  @override
  Widget build(BuildContext context) {
    final state = ref.watch(sharingProvider);

    return Scaffold(
      backgroundColor: ColorSchemes.darkBackground,
      appBar: AppBar(
        title: const Text('Shared Access', style: TextStyle(color: Colors.white)),
        backgroundColor: ColorSchemes.darkBackground,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.errorMessage != null
              ? Center(child: Text(state.errorMessage!, style: const TextStyle(color: Colors.red)))
              : state.shares.isEmpty
                  ? const Center(child: Text('No active shares.', style: TextStyle(color: Colors.white)))
                  : ListView.builder(
                      itemCount: state.shares.length,
                      itemBuilder: (context, index) {
                        final share = state.shares[index];
                        final isExpired = share.expiresAt.isBefore(DateTime.now());

                        return Card(
                          color: ColorSchemes.darkSurface,
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: ListTile(
                            leading: Icon(
                              share.isActivated ? Icons.lock_open : Icons.pending,
                              color: share.isActivated ? Colors.green : Colors.orange,
                            ),
                            title: Text(share.name, style: const TextStyle(color: Colors.white)),
                            subtitle: Text('${share.email}\nExpires: ${share.expiresAt.toString().split('.')[0]}', style: const TextStyle(color: Colors.white70)),
                            isThreeLine: true,
                            trailing: isExpired
                                ? const Text('Expired', style: TextStyle(color: Colors.red))
                                : IconButton(
                                    icon: const Icon(Icons.delete, color: Colors.redAccent),
                                    onPressed: () {
                                      ref.read(sharingProvider.notifier).revokeShare(share.id);
                                    },
                                  ),
                          ),
                        );
                      },
                    ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const CreateShareScreen()),
          );
        },
        backgroundColor: ColorSchemes.primaryBlue,
        icon: const Icon(Icons.share, color: Colors.white),
        label: const Text('Create Share', style: TextStyle(color: Colors.white)),
      ),
    );
  }
}
