import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/color_schemes.dart';
import '../../../core/utils/encryption_helper.dart';
import '../../../core/utils/totp_helper.dart';
import '../../auth/presentation/auth_provider.dart';
import '../domain/credential_model.dart';
import 'vault_provider.dart';
import '../../folders/presentation/folders_screen.dart';
import '../../workspaces/presentation/workspaces_screen.dart';
import '../../sharing/presentation/sharing_screen.dart';
import '../../activity/presentation/activity_screen.dart';

class VaultScreen extends ConsumerStatefulWidget {
  const VaultScreen({super.key});

  @override
  ConsumerState<VaultScreen> createState() => _VaultScreenState();
}

class _VaultScreenState extends ConsumerState<VaultScreen> {
  int _currentTab = 0;
  bool _isGridView = false;
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> tabs = [
      _buildVaultTab(),
      const FoldersScreen(),
      const WorkspacesScreen(),
      _buildGeneratorTab(),
      _buildSettingsTab(),
    ];

    return Scaffold(
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentTab,
        onTap: (index) {
          setState(() {
            _currentTab = index;
          });
        },
        backgroundColor: ColorSchemes.darkSurface,
        selectedItemColor: ColorSchemes.primaryBlue,
        unselectedItemColor: ColorSchemes.textMuted,
        showSelectedLabels: true,
        showUnselectedLabels: true,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(LucideIcons.shield),
            label: 'Vault',
          ),
          BottomNavigationBarItem(
            icon: Icon(LucideIcons.folder),
            label: 'Folders',
          ),
          BottomNavigationBarItem(
            icon: Icon(LucideIcons.table),
            label: 'Workspaces',
          ),
          BottomNavigationBarItem(
            icon: Icon(LucideIcons.key),
            label: 'Generator',
          ),
          BottomNavigationBarItem(
            icon: Icon(LucideIcons.settings),
            label: 'Settings',
          ),
        ],
      ),
      body: tabs[_currentTab],
    );
  }

  // ==========================================
  // VAULT TAB
  // ==========================================
  Widget _buildVaultTab() {
    final vaultState = ref.watch(vaultProvider);
    final filteredItems = ref.watch(filteredCredentialsProvider);

    return Scaffold(
      backgroundColor: ColorSchemes.darkBackground,
      appBar: AppBar(
        backgroundColor: ColorSchemes.darkBackground,
        scrolledUnderElevation: 0,
        title: Text(
          'My Vault',
          style: GoogleFonts.outfit(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            color: Colors.white,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(
              _isGridView ? LucideIcons.list : LucideIcons.grid,
              color: Colors.white,
            ),
            onPressed: () {
              setState(() {
                _isGridView = !_isGridView;
              });
            },
          ),
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, color: Colors.white, size: 20),
            onPressed: () {
              ref.read(vaultProvider.notifier).fetchCredentials();
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddEditSheet(context),
        child: const Icon(LucideIcons.plus, size: 24),
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: TextField(
              controller: _searchController,
              onChanged: (val) {
                ref.read(vaultProvider.notifier).setSearchQuery(val);
              },
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: "Search credentials...",
                prefixIcon: const Icon(LucideIcons.search, size: 18),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(LucideIcons.x, size: 16),
                        onPressed: () {
                          _searchController.clear();
                          ref.read(vaultProvider.notifier).setSearchQuery('');
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),

          // Vault State List / Grid
          Expanded(
            child: vaultState.isLoading && filteredItems.isEmpty
                ? const Center(
                    child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(ColorSchemes.primaryBlue),
                    ),
                  )
                : filteredItems.isEmpty
                    ? _buildEmptyVault()
                    : _isGridView
                        ? _buildGridView(filteredItems)
                        : _buildListView(filteredItems),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyVault() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                color: ColorSchemes.darkSurface,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                LucideIcons.key,
                size: 48,
                color: ColorSchemes.textMuted,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              "Your vault is empty",
              style: GoogleFonts.outfit(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              "Start adding logins, websites, and accounts to keep them securely encrypted.",
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                color: ColorSchemes.textSecondary,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _showAddEditSheet(context),
              icon: const Icon(LucideIcons.plus, size: 18),
              label: const Text("Add First Password"),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildListView(List<CredentialModel> items) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            leading: const CircleAvatar(
              backgroundColor: ColorSchemes.darkBackground,
              child: Icon(LucideIcons.globe, color: ColorSchemes.primaryBlue, size: 20),
            ),
            title: Text(
              item.title,
              style: GoogleFonts.inter(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
            subtitle: Text(
              item.username ?? 'No Username',
              style: GoogleFonts.inter(
                color: ColorSchemes.textSecondary,
              ),
            ),
            trailing: const Icon(LucideIcons.chevronRight, color: ColorSchemes.textMuted),
            onTap: () => _showDetailsSheet(context, item),
          ),
        );
      },
    );
  }

  Widget _buildGridView(List<CredentialModel> items) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.1,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return Card(
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () => _showDetailsSheet(context, item),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const CircleAvatar(
                        backgroundColor: ColorSchemes.darkBackground,
                        radius: 18,
                        child: Icon(LucideIcons.globe, color: ColorSchemes.primaryBlue, size: 16),
                      ),
                      if (item.encryptedTotpSecret != null)
                        const Icon(LucideIcons.clock, color: ColorSchemes.accentPurple, size: 16),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.username ?? 'No Username',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            color: ColorSchemes.textSecondary,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ==========================================
  // DETAILS BOTTOM SHEET
  // ==========================================
  void _showDetailsSheet(BuildContext context, CredentialModel item) {
    final authState = ref.read(authProvider);
    final masterPassword = authState.masterPassword ?? '';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: ColorSchemes.darkSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.65,
          maxChildSize: 0.9,
          minChildSize: 0.4,
          expand: false,
          builder: (context, scrollController) {
            return SingleChildScrollView(
              controller: scrollController,
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 48,
                      height: 5,
                      decoration: BoxDecoration(
                        color: ColorSchemes.textMuted,
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Header details
                  Row(
                    children: [
                      const CircleAvatar(
                        radius: 28,
                        backgroundColor: ColorSchemes.darkBackground,
                        child: Icon(LucideIcons.globe, color: ColorSchemes.primaryBlue, size: 28),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.title,
                              style: GoogleFonts.outfit(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            if (item.url != null && item.url!.isNotEmpty)
                              InkWell(
                                onTap: () async {
                                  final uri = Uri.parse(item.url!.startsWith('http') ? item.url! : 'https://${item.url}');
                                  if (await canLaunchUrl(uri)) {
                                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                                  }
                                },
                                child: Text(
                                  item.url!,
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    color: ColorSchemes.primaryBlue,
                                    decoration: TextDecoration.underline,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const Divider(color: Color(0xFF1E293B), height: 32),

                  // Username field Card
                  _buildDetailCard(
                    label: "Username / Email",
                    value: item.username ?? 'No Username',
                    onCopy: () => _copyToClipboard(item.username ?? '', 'Username'),
                  ),
                  const SizedBox(height: 16),

                  // Password field Card with Decrypt on demand
                  _buildDecryptableCard(
                    label: "Password",
                    ciphertext: item.encryptedPassword,
                    iv: item.iv,
                    salt: item.salt,
                    password: masterPassword,
                  ),
                  const SizedBox(height: 16),

                  // TOTP display if setup
                  if (item.encryptedTotpSecret != null) ...[
                    _buildTotpCard(
                      ciphertext: item.encryptedTotpSecret!,
                      iv: item.totpIv!,
                      salt: item.totpSalt!,
                      password: masterPassword,
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Notes section
                  if (item.encryptedNotes != null) ...[
                    _buildNotesCard(
                      ciphertextJson: item.encryptedNotes!,
                      password: masterPassword,
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Navigator.pop(context);
                            _showAddEditSheet(context, item);
                          },
                          icon: const Icon(LucideIcons.edit2, size: 16),
                          label: const Text("Edit"),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            side: const BorderSide(color: ColorSchemes.primaryBlue),
                            foregroundColor: ColorSchemes.primaryBlue,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _confirmDelete(context, item),
                          icon: const Icon(LucideIcons.trash2, size: 16, color: Colors.white),
                          label: const Text("Delete"),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            backgroundColor: Colors.redAccent,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildDetailCard({required String label, required String value, VoidCallback? onCopy}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: ColorSchemes.darkBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              color: ColorSchemes.textMuted,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: Text(
                  value,
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              if (onCopy != null)
                IconButton(
                  icon: const Icon(LucideIcons.copy, size: 18, color: ColorSchemes.textSecondary),
                  onPressed: onCopy,
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDecryptableCard({
    required String label,
    required String ciphertext,
    required String iv,
    required String salt,
    required String password,
  }) {
    return StatefulBuilder(
      builder: (context, setState) {
        final decryptedText = EncryptionHelper.decryptData(
          ciphertextBase64: ciphertext,
          ivBase64: iv,
          saltBase64: salt,
          password: password,
        );

        return _buildDetailCard(
          label: label,
          value: decryptedText,
          onCopy: () => _copyToClipboard(decryptedText, label),
        );
      },
    );
  }

  Widget _buildTotpCard({
    required String ciphertext,
    required String iv,
    required String salt,
    required String password,
  }) {
    try {
      final decryptedSecret = EncryptionHelper.decryptData(
        ciphertextBase64: ciphertext,
        ivBase64: iv,
        saltBase64: salt,
        password: password,
      );
      return TotpViewer(secret: decryptedSecret);
    } catch (e) {
      return const SizedBox();
    }
  }

  Widget _buildNotesCard({
    required String ciphertextJson,
    required String password,
  }) {
    try {
      final notesMap = json.decode(ciphertextJson);
      final decryptedNotes = EncryptionHelper.decryptData(
        ciphertextBase64: notesMap['ciphertext'] as String,
        ivBase64: notesMap['iv'] as String,
        saltBase64: notesMap['salt'] as String,
        password: password,
      );

      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: ColorSchemes.darkBackground,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF1E293B)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "NOTES",
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w900,
                color: ColorSchemes.textMuted,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              decryptedNotes,
              style: GoogleFonts.inter(
                fontSize: 14,
                color: Colors.white,
                height: 1.4,
              ),
            ),
          ],
        ),
      );
    } catch (e) {
      return const SizedBox();
    }
  }

  void _confirmDelete(BuildContext context, CredentialModel item) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: ColorSchemes.darkSurface,
          title: Text("Delete Credential", style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
          content: Text("Are you sure you want to permanently delete this credential?", style: GoogleFonts.inter(color: ColorSchemes.textSecondary)),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text("Cancel", style: GoogleFonts.inter(color: ColorSchemes.textSecondary)),
            ),
            TextButton(
              onPressed: () async {
                Navigator.pop(context); // close dialog
                Navigator.pop(context); // close bottom sheet
                final success = await ref.read(vaultProvider.notifier).deleteCredential(item.id);
                if (!context.mounted) return;
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Credential deleted'), backgroundColor: Colors.redAccent),
                  );
                }
              },
              child: Text("Delete", style: GoogleFonts.inter(color: Colors.redAccent, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  // ==========================================
  // ADD / EDIT BOTTOM SHEET
  // ==========================================
  void _showAddEditSheet(BuildContext context, [CredentialModel? editItem]) {
    final titleController = TextEditingController(text: editItem?.title ?? '');
    final usernameController = TextEditingController(text: editItem?.username ?? '');
    final urlController = TextEditingController(text: editItem?.url ?? '');
    final notesController = TextEditingController();
    final totpController = TextEditingController();
    final passwordController = TextEditingController();

    final authState = ref.read(authProvider);
    final masterPassword = authState.masterPassword ?? '';

    // If editing, decrypt current password/notes/totp for initial edit fields
    if (editItem != null) {
      try {
        passwordController.text = EncryptionHelper.decryptData(
          ciphertextBase64: editItem.encryptedPassword,
          ivBase64: editItem.iv,
          saltBase64: editItem.salt,
          password: masterPassword,
        );

        if (editItem.encryptedNotes != null) {
          final notesMap = json.decode(editItem.encryptedNotes!);
          notesController.text = EncryptionHelper.decryptData(
            ciphertextBase64: notesMap['ciphertext'] as String,
            ivBase64: notesMap['iv'] as String,
            saltBase64: notesMap['salt'] as String,
            password: masterPassword,
          );
        }

        if (editItem.encryptedTotpSecret != null) {
          totpController.text = EncryptionHelper.decryptData(
            ciphertextBase64: editItem.encryptedTotpSecret!,
            ivBase64: editItem.totpIv!,
            saltBase64: editItem.totpSalt!,
            password: masterPassword,
          );
        }
      } catch (e) {
        // fail silently or show error
      }
    }

    final formKey = GlobalKey<FormState>();
    bool obscurePassword = true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: ColorSchemes.darkSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
              ),
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24.0),
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Center(
                        child: Container(
                          width: 48,
                          height: 5,
                          decoration: BoxDecoration(
                            color: ColorSchemes.textMuted,
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        editItem == null ? "Add New Password" : "Edit Password",
                        style: GoogleFonts.outfit(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Item Title
                      TextFormField(
                        controller: titleController,
                        style: const TextStyle(color: Colors.white),
                        decoration: const InputDecoration(
                          hintText: "Item Title (e.g. Google)",
                          labelText: "Item Name",
                        ),
                        validator: (value) => value == null || value.trim().isEmpty ? 'Please enter a name' : null,
                      ),
                      const SizedBox(height: 16),

                      // Username
                      TextFormField(
                        controller: usernameController,
                        style: const TextStyle(color: Colors.white),
                        decoration: const InputDecoration(
                          hintText: "Username / Email",
                          labelText: "Username",
                        ),
                        validator: (value) => value == null || value.trim().isEmpty ? 'Please enter a username' : null,
                      ),
                      const SizedBox(height: 16),

                      // Password Field
                      TextFormField(
                        controller: passwordController,
                        obscureText: obscurePassword,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          hintText: "Password",
                          labelText: "Password",
                          suffixIcon: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: Icon(obscurePassword ? LucideIcons.eye : LucideIcons.eyeOff),
                                onPressed: () {
                                  setSheetState(() {
                                    obscurePassword = !obscurePassword;
                                  });
                                },
                              ),
                              IconButton(
                                icon: const Icon(LucideIcons.key),
                                onPressed: () {
                                  final newPass = _generateRawPassword(16);
                                  passwordController.text = newPass;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Strong password generated!')),
                                  );
                                },
                              ),
                            ],
                          ),
                        ),
                        validator: (value) => value == null || value.isEmpty ? 'Please enter a password' : null,
                      ),
                      const SizedBox(height: 16),

                      // URL
                      TextFormField(
                        controller: urlController,
                        style: const TextStyle(color: Colors.white),
                        decoration: const InputDecoration(
                          hintText: "https://example.com",
                          labelText: "Website URL",
                        ),
                      ),
                      const SizedBox(height: 16),

                      // TOTP Secret
                      TextFormField(
                        controller: totpController,
                        style: const TextStyle(color: Colors.white),
                        decoration: const InputDecoration(
                          hintText: "JBSWY3DPEHPK3PXP",
                          labelText: "TOTP Secret / Key (Optional)",
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Notes Description
                      TextFormField(
                        controller: notesController,
                        maxLines: 3,
                        style: const TextStyle(color: Colors.white),
                        decoration: const InputDecoration(
                          hintText: "Add descriptions or notes here...",
                          labelText: "Notes",
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Action Button
                      ElevatedButton(
                        onPressed: () async {
                          if (!formKey.currentState!.validate()) return;

                          final title = titleController.text.trim();
                          final username = usernameController.text.trim();
                          final password = passwordController.text;
                          final url = urlController.text.trim();
                          final notes = notesController.text.trim();
                          final totp = totpController.text.trim();

                          bool success;
                          if (editItem == null) {
                            success = await ref.read(vaultProvider.notifier).addCredential(
                                  title: title,
                                  username: username,
                                  password: password,
                                  url: url,
                                  notes: notes,
                                  totpSecret: totp,
                                );
                          } else {
                            success = await ref.read(vaultProvider.notifier).editCredential(
                                  id: editItem.id,
                                  title: title,
                                  username: username,
                                  password: password,
                                  url: url,
                                  notes: notes,
                                  totpSecret: totp,
                                );
                          }

                          if (success) {
                            if (!context.mounted) return;
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(editItem == null ? 'Credential saved' : 'Credential updated'),
                                backgroundColor: const Color(0xFF10B981),
                              ),
                            );
                          } else {
                            if (!context.mounted) return;
                            final err = ref.read(vaultProvider).errorMessage ?? 'Operation failed';
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(err), backgroundColor: Colors.redAccent),
                            );
                          }
                        },
                        child: Text(editItem == null ? "Save to Vault" : "Update Credential"),
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  // ==========================================
  // PASSWORD GENERATOR TAB
  // ==========================================
  double _genLength = 16;
  bool _useUppercase = true;
  bool _useLowercase = true;
  bool _useNumbers = true;
  bool _useSymbols = true;
  String _generatedResult = '';

  Widget _buildGeneratorTab() {
    if (_generatedResult.isEmpty) {
      _generatedResult = _generateRawPassword(_genLength.toInt());
    }

    return Scaffold(
      backgroundColor: ColorSchemes.darkBackground,
      appBar: AppBar(
        backgroundColor: ColorSchemes.darkBackground,
        scrolledUnderElevation: 0,
        title: Text(
          'Password Generator',
          style: GoogleFonts.outfit(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            color: Colors.white,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Generated Password Box
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: ColorSchemes.darkSurface,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              child: Column(
                children: [
                  Text(
                    _generatedResult,
                    textAlign: TextAlign.center,
                    style: GoogleFonts.firaCode(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: ColorSchemes.accentGreen,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton.filledTonal(
                        icon: const Icon(LucideIcons.refreshCw, size: 20),
                        onPressed: () {
                          setState(() {
                            _generatedResult = _generateRawPassword(_genLength.toInt());
                          });
                        },
                      ),
                      const SizedBox(width: 16),
                      IconButton.filledTonal(
                        icon: const Icon(LucideIcons.copy, size: 20),
                        onPressed: () => _copyToClipboard(_generatedResult, 'Generated Password'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Controls
            Text(
              "Length: ${_genLength.toInt()} characters",
              style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold),
            ),
            Slider(
              value: _genLength,
              min: 8,
              max: 64,
              divisions: 56,
              activeColor: ColorSchemes.primaryBlue,
              inactiveColor: ColorSchemes.darkSurface,
              onChanged: (val) {
                setState(() {
                  _genLength = val;
                  _generatedResult = _generateRawPassword(_genLength.toInt());
                });
              },
            ),
            const SizedBox(height: 16),

            _buildToggleOption("Uppercase (A-Z)", _useUppercase, (v) {
              setState(() {
                _useUppercase = v;
                _generatedResult = _generateRawPassword(_genLength.toInt());
              });
            }),
            _buildToggleOption("Lowercase (a-z)", _useLowercase, (v) {
              setState(() {
                _useLowercase = v;
                _generatedResult = _generateRawPassword(_genLength.toInt());
              });
            }),
            _buildToggleOption("Numbers (0-9)", _useNumbers, (v) {
              setState(() {
                _useNumbers = v;
                _generatedResult = _generateRawPassword(_genLength.toInt());
              });
            }),
            _buildToggleOption("Symbols (!@#\$%)", _useSymbols, (v) {
              setState(() {
                _useSymbols = v;
                _generatedResult = _generateRawPassword(_genLength.toInt());
              });
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildToggleOption(String label, bool value, ValueChanged<bool> onChanged) {
    return SwitchListTile(
      title: Text(label, style: GoogleFonts.inter(color: Colors.white)),
      value: value,
      onChanged: onChanged,
      activeThumbColor: ColorSchemes.primaryBlue,
      contentPadding: EdgeInsets.zero,
    );
  }

  String _generateRawPassword(int length) {
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const symbolChars = '!@#\$%^&*()_-+={[}]|:;"\'<,>.?/';

    String allowedChars = '';
    if (_useUppercase) allowedChars += uppercaseChars;
    if (_useLowercase) allowedChars += lowercaseChars;
    if (_useNumbers) allowedChars += numberChars;
    if (_useSymbols) allowedChars += symbolChars;

    if (allowedChars.isEmpty) return 'Select at least one option';

    final random = Random.secure();
    return List.generate(length, (_) {
      final index = random.nextInt(allowedChars.length);
      return allowedChars[index];
    }).join('');
  }

  // ==========================================
  // SETTINGS TAB
  // ==========================================
  Widget _buildSettingsTab() {
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: ColorSchemes.darkBackground,
      appBar: AppBar(
        backgroundColor: ColorSchemes.darkBackground,
        scrolledUnderElevation: 0,
        title: Text(
          'Settings',
          style: GoogleFonts.outfit(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            color: Colors.white,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          // Profile box
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: ColorSchemes.darkSurface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: ColorSchemes.primaryBlue.withOpacity(0.2),
                  child: const Icon(LucideIcons.user, color: ColorSchemes.primaryBlue),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Signed In As",
                        style: GoogleFonts.inter(color: ColorSchemes.textMuted, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        authState.user?.email ?? 'Unknown User',
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          Text(
            "Security Settings",
            style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          Card(
            child: Column(
              children: [
                SwitchListTile(
                  title: Text("Enable Biometrics", style: GoogleFonts.inter(color: Colors.white)),
                  subtitle: Text("Unlock your vault using Fingerprint/Face ID", style: GoogleFonts.inter(color: ColorSchemes.textSecondary, fontSize: 12)),
                  value: authState.biometricsEnabled,
                  onChanged: (val) {
                    ref.read(authProvider.notifier).setBiometricsEnabled(val);
                  },
                  activeThumbColor: ColorSchemes.accentGreen,
                ),
                const Divider(color: Color(0xFF1E293B), height: 1),
                ListTile(
                  leading: const Icon(LucideIcons.lock, color: Colors.white),
                  title: Text("Change App Passcode", style: GoogleFonts.inter(color: Colors.white)),
                  trailing: const Icon(LucideIcons.chevronRight, color: ColorSchemes.textMuted),
                  onTap: () => _showChangePasscodeDialog(context),
                ),
                const Divider(color: Color(0xFF1E293B), height: 1),
                ListTile(
                  leading: const Icon(LucideIcons.users, color: Colors.white),
                  title: Text("Shared Access", style: GoogleFonts.inter(color: Colors.white)),
                  trailing: const Icon(LucideIcons.chevronRight, color: ColorSchemes.textMuted),
                  onTap: () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const SharingScreen()));
                  },
                ),
                const Divider(color: Color(0xFF1E293B), height: 1),
                ListTile(
                  leading: const Icon(LucideIcons.activity, color: Colors.white),
                  title: Text("Activity Logs", style: GoogleFonts.inter(color: Colors.white)),
                  trailing: const Icon(LucideIcons.chevronRight, color: ColorSchemes.textMuted),
                  onTap: () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const ActivityScreen()));
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Logout button
          ElevatedButton.icon(
            onPressed: () {
              ref.read(authProvider.notifier).logout();
            },
            icon: const Icon(LucideIcons.logOut, color: Colors.white),
            label: const Text("Log Out / Reset App"),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              padding: const EdgeInsets.symmetric(vertical: 18),
            ),
          ),
        ],
      ),
    );
  }

  void _showChangePasscodeDialog(BuildContext context) {
    final oldController = TextEditingController();
    final newController = TextEditingController();
    final confirmController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: ColorSchemes.darkSurface,
          title: Text("Change Passcode", style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: oldController,
                  obscureText: true,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(labelText: "Current Passcode"),
                  validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: newController,
                  obscureText: true,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(labelText: "New Passcode"),
                  validator: (v) => v == null || v.length < 4 ? 'Must be at least 4 chars' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: confirmController,
                  obscureText: true,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(labelText: "Confirm New Passcode"),
                  validator: (v) => v != newController.text ? 'Passcodes do not match' : null,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text("Cancel", style: GoogleFonts.inter(color: ColorSchemes.textSecondary)),
            ),
            TextButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                
                const storage = FlutterSecureStorage();
                final currentSaved = await storage.read(key: 'app_passcode');
                
                if (currentSaved != oldController.text) {
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Current passcode is incorrect'), backgroundColor: Colors.redAccent),
                  );
                  return;
                }

                await ref.read(authProvider.notifier).setAppPasscode(newController.text);
                
                if (!context.mounted) return;
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('App Passcode updated successfully!'), backgroundColor: ColorSchemes.accentGreen),
                );
              },
              child: Text("Save", style: GoogleFonts.inter(color: ColorSchemes.primaryBlue, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  // ==========================================
  // UTILS
  // ==========================================
  void _copyToClipboard(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$label copied to clipboard'),
        backgroundColor: const Color(0xFF10B981),
        duration: const Duration(seconds: 2),
      ),
    );
  }
}

// ==========================================
// TOTP LIVE VIEWER COMPONENT
// ==========================================
class TotpViewer extends StatefulWidget {
  final String secret;
  const TotpViewer({super.key, required this.secret});

  @override
  State<TotpViewer> createState() => _TotpViewerState();
}

class _TotpViewerState extends State<TotpViewer> {
  late Timer _timer;
  String _code = '';
  int _secondsLeft = 30;

  @override
  void initState() {
    super.initState();
    _updateTotp();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _updateTotp();
    });
  }

  void _updateTotp() {
    if (!mounted) return;
    setState(() {
      _code = TotpHelper.generateTOTP(widget.secret);
      _secondsLeft = TotpHelper.getSecondsLeft();
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final displayCode = _code.length == 6
        ? '${_code.substring(0, 3)} ${_code.substring(3)}'
        : _code;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1D3557).withOpacity(0.2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF457B9D).withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(LucideIcons.clock, size: 12, color: ColorSchemes.primaryBlue),
              const SizedBox(width: 6),
              Text(
                "AUTHENTICATOR CODE",
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  color: ColorSchemes.primaryBlue,
                  letterSpacing: 1.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Text(
                  displayCode,
                  style: GoogleFonts.inter(
                    fontSize: 22,
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2,
                  ),
                ),
              ),
              // Circular countdown timer
              SizedBox(
                width: 24,
                height: 24,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    CircularProgressIndicator(
                      value: _secondsLeft / 30,
                      strokeWidth: 3,
                      backgroundColor: Colors.white24,
                      valueColor: const AlwaysStoppedAnimation<Color>(ColorSchemes.primaryBlue),
                    ),
                    Text(
                      '$_secondsLeft',
                      style: const TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(LucideIcons.copy, size: 18, color: ColorSchemes.primaryBlue),
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: _code));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('OTP code copied to clipboard'),
                      backgroundColor: Color(0xFF10B981),
                    ),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}
