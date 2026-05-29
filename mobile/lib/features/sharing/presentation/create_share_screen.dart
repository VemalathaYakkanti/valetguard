import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'sharing_provider.dart';
import '../../vault/presentation/vault_provider.dart';
import '../../folders/presentation/folders_provider.dart';
import '../../../core/theme/color_schemes.dart';


class CreateShareScreen extends ConsumerStatefulWidget {
  const CreateShareScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<CreateShareScreen> createState() => _CreateShareScreenState();
}

class _CreateShareScreenState extends ConsumerState<CreateShareScreen> {
  int _currentStep = 0;
  
  // Step 1: Details
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _employerController = TextEditingController();
  final _daysController = TextEditingController(text: '7');

  // Step 2: Permissions
  bool _canViewPassword = true;
  bool _canCopyPassword = true;
  bool _canViewNotes = true;

  // Step 3: Items
  List<int> _selectedCredentialIds = [];
  List<String> _selectedFolderSlugs = [];
  List<int> _selectedFileIds = [];

  bool _isSubmitting = false;
  Map<String, dynamic>? _successData;

  @override
  Widget build(BuildContext context) {
    final sharingState = ref.watch(sharingProvider);

    return Scaffold(
      backgroundColor: ColorSchemes.darkBackground,
      appBar: AppBar(
        title: const Text('Create Share', style: TextStyle(color: Colors.white)),
        backgroundColor: ColorSchemes.darkBackground,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _isSubmitting 
        ? const Center(child: CircularProgressIndicator()) 
        : (_successData != null 
            ? _buildSuccessView()
            : Stepper(
            currentStep: _currentStep,
            onStepContinue: _onStepContinue,
            onStepCancel: _onStepCancel,
            onStepTapped: (step) => setState(() => _currentStep = step),
            controlsBuilder: (context, details) {
              return Padding(
                padding: const EdgeInsets.only(top: 24.0),
                child: Row(
                  children: [
                    ElevatedButton(
                      onPressed: details.onStepContinue,
                      style: ElevatedButton.styleFrom(backgroundColor: ColorSchemes.primaryBlue),
                      child: Text(_currentStep == 3 ? 'Send Invitation' : 'Next', style: const TextStyle(color: Colors.white)),
                    ),
                    const SizedBox(width: 12),
                    if (_currentStep > 0)
                      TextButton(
                        onPressed: details.onStepCancel,
                        child: const Text('Back', style: TextStyle(color: Colors.white70)),
                      ),
                  ],
                ),
              );
            },
            steps: [
              _buildDetailsStep(sharingState),
              _buildPermissionsStep(),
              _buildItemsStep(),
              _buildPreviewStep(),
            ],
          )),
    );
  }

  void _onStepContinue() async {
    if (_currentStep == 0) {
      if (!_formKey.currentState!.validate()) return;
    }

    if (_currentStep == 2) {
      if (_selectedCredentialIds.isEmpty && _selectedFolderSlugs.isEmpty && _selectedFileIds.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select at least one item to share.'), backgroundColor: Colors.red),
        );
        return;
      }
    }

    if (_currentStep < 3) {
      setState(() => _currentStep += 1);
    } else {
      await _submitShare();
    }
  }

  void _onStepCancel() {
    if (_currentStep > 0) {
      setState(() => _currentStep -= 1);
    }
  }

  Future<void> _submitShare() async {
    setState(() => _isSubmitting = true);
    
    final payload = {
      'recipientName': _nameController.text,
      'recipientEmail': _emailController.text,
      'employerName': _employerController.text,
      'expiresInDays': int.parse(_daysController.text),
      'permissions': {
        'canViewPassword': _canViewPassword,
        'canCopyPassword': _canCopyPassword,
        'canViewNotes': _canViewNotes,
      },
      'credentialIds': _selectedCredentialIds,
      'folderSlugs': _selectedFolderSlugs,
      'fileIds': _selectedFileIds,
    };

    final result = await ref.read(sharingProvider.notifier).createShare(payload);
    
    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (result != null && result['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invitation sent successfully!'), backgroundColor: Colors.green),
      );
      setState(() {
        _successData = result['data'];
      });
    } else {
      final errorMsg = result?['error'] ?? 'Unknown error';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to create share: $errorMsg'), backgroundColor: Colors.red, duration: const Duration(seconds: 5)),
      );
    }
  }

  Widget _buildSuccessView() {
    final loginUrl = _successData!['loginUrl'] ?? 'http://localhost:5173/guest-login';
    final tempPassword = _successData!['tempPassword'] ?? '';
    final otp = _successData!['otp'] ?? '';
    final email = _emailController.text;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 20),
          Center(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Color(0xFF10B981),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check, size: 48, color: Colors.white),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Share Created Successfully!',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Use the sharing options below to send the secure login credentials to the recipient.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: Colors.white70,
            ),
          ),

          const SizedBox(height: 32),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: ColorSchemes.darkSurface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'GUEST LOGIN DETAILS',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.white38,
                        letterSpacing: 1.2,
                      ),
                    ),
                    Row(
                      children: [
                        Text(
                          email,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: ColorSchemes.primaryBlue,
                          ),
                        ),
                        const SizedBox(width: 6),
                        IconButton(
                          constraints: const BoxConstraints(),
                          padding: EdgeInsets.zero,
                          icon: const Icon(Icons.copy, size: 14, color: ColorSchemes.primaryBlue),
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: email));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Email copied!')),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
                const Divider(height: 24, color: Colors.white10),
                
                const Text(
                  'Login Portal URL',
                  style: TextStyle(fontSize: 11, color: Colors.white60),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: ColorSchemes.darkBackground,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          loginUrl,
                          style: const TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 12,
                            color: Colors.white,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      IconButton(
                        constraints: const BoxConstraints(),
                        padding: EdgeInsets.zero,
                        icon: const Icon(Icons.copy, size: 16, color: Colors.white70),
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: loginUrl));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Login URL copied!')),
                          );
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Temporary Password',
                            style: TextStyle(fontSize: 11, color: Colors.white60),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: ColorSchemes.darkBackground,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    tempPassword,
                                    style: const TextStyle(
                                      fontFamily: 'monospace',
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                                IconButton(
                                  constraints: const BoxConstraints(),
                                  padding: EdgeInsets.zero,
                                  icon: const Icon(Icons.copy, size: 16, color: Colors.white70),
                                  onPressed: () {
                                    Clipboard.setData(ClipboardData(text: tempPassword));
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Temporary Password copied!')),
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'One-Time OTP',
                            style: TextStyle(fontSize: 11, color: Colors.white60),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: ColorSchemes.darkBackground,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    otp,
                                    style: const TextStyle(
                                      fontFamily: 'monospace',
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF60A5FA),
                                      letterSpacing: 1.0,
                                    ),
                                  ),
                                ),
                                IconButton(
                                  constraints: const BoxConstraints(),
                                  padding: EdgeInsets.zero,
                                  icon: const Icon(Icons.copy, size: 16, color: Colors.white70),
                                  onPressed: () {
                                    Clipboard.setData(ClipboardData(text: otp));
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('One-Time OTP copied!')),
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          ElevatedButton.icon(
            icon: const Icon(Icons.share, color: Colors.white),
            label: const Text('Share Natively (WhatsApp, SMS, etc.)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            onPressed: () {
              final credentialsText = 
                '🔒 *VaultGuard Shared Access Details*\n\n'
                'Hello ${_nameController.text},\n'
                'Access has been shared with you on VaultGuard. Use the details below to log in and view your shared vault:\n\n'
                '🌐 *Login Portal:* $loginUrl\n'
                '📧 *Authorized Email:* $email\n'
                '🔑 *Temporary Password:* $tempPassword\n'
                '⏱️ *One-Time OTP:* $otp\n\n'
                '⚠️ *Note:* The OTP is valid for exactly 24 hours. Once logged in, your shared vault remains zero-knowledge encrypted.';
              SharePlus.instance.share(ShareParams(text: credentialsText, subject: 'VaultGuard Shared Access Credentials'));

            },
            style: ElevatedButton.styleFrom(
              backgroundColor: ColorSchemes.primaryBlue,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            icon: const Icon(Icons.copy, color: Colors.white),
            label: const Text('Copy All Credentials', style: TextStyle(color: Colors.white)),
            onPressed: () {
              final credentialsText = 
                'VaultGuard Shared Access Details:\n'
                'Portal: $loginUrl\n'
                'Email: $email\n'
                'Password: $tempPassword\n'
                'OTP: $otp\n'
                'Note: OTP is valid for 24 hours.';
              Clipboard.setData(ClipboardData(text: credentialsText));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('All credentials copied to clipboard!')),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1E293B),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              side: const BorderSide(color: Colors.white10),
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF334155),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: const Text('Done', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),

        ],
      ),
    );
  }

  Step _buildDetailsStep(SharingState sharingState) {
    return Step(
      title: const Text('Guest Details', style: TextStyle(color: Colors.white)),
      isActive: _currentStep >= 0,
      content: Form(
        key: _formKey,
        child: Column(
          children: [
            if (sharingState.employees.isNotEmpty) ...[
              DropdownButtonFormField<EmployeeModel>(
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'Select Existing Employee (Optional)',
                  labelStyle: TextStyle(color: Colors.white70),
                ),
                dropdownColor: ColorSchemes.darkSurface,
                style: const TextStyle(color: Colors.white),
                items: sharingState.employees.map((emp) => DropdownMenuItem(
                  value: emp,
                  child: Text('${emp.name} (${emp.email})'),
                )).toList(),
                onChanged: (emp) {
                  if (emp != null) {
                    setState(() {
                      _nameController.text = emp.name;
                      _emailController.text = emp.email;
                      _employerController.text = emp.companyName ?? '';
                    });
                  }
                },
              ),
              const SizedBox(height: 12),
            ],
            TextFormField(
              controller: _nameController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(labelText: 'Recipient Name', labelStyle: TextStyle(color: Colors.white70)),
              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _emailController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(labelText: 'Recipient Email', labelStyle: TextStyle(color: Colors.white70)),
              validator: (v) => v == null || !v.contains('@') ? 'Invalid email' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _employerController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(labelText: 'Employer / Company (Optional)', labelStyle: TextStyle(color: Colors.white70)),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _daysController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(labelText: 'Expires in (Days)', labelStyle: TextStyle(color: Colors.white70)),
              keyboardType: TextInputType.number,
              validator: (v) => v == null || int.tryParse(v) == null ? 'Required' : null,
            ),
          ],
        ),
      ),
    );
  }

  Step _buildPermissionsStep() {
    return Step(
      title: const Text('Permissions', style: TextStyle(color: Colors.white)),
      isActive: _currentStep >= 1,
      content: Column(
        children: [
          CheckboxListTile(
            title: const Text('Can View Password', style: TextStyle(color: Colors.white)),
            value: _canViewPassword,
            onChanged: (v) => setState(() => _canViewPassword = v ?? false),
          ),
          CheckboxListTile(
            title: const Text('Can Copy Password', style: TextStyle(color: Colors.white)),
            value: _canCopyPassword,
            onChanged: (v) => setState(() => _canCopyPassword = v ?? false),
          ),
          CheckboxListTile(
            title: const Text('Can View Notes', style: TextStyle(color: Colors.white)),
            value: _canViewNotes,
            onChanged: (v) => setState(() => _canViewNotes = v ?? false),
          ),
        ],
      ),
    );
  }

  Step _buildItemsStep() {
    final credentials = ref.watch(vaultProvider).credentials;
    final folders = ref.watch(foldersProvider).folders;
    final files = ref.watch(foldersProvider).files;

    return Step(
      title: const Text('Select Items to Share', style: TextStyle(color: Colors.white)),
      isActive: _currentStep >= 2,
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (credentials.isNotEmpty) ...[
            const Text('Credentials', style: TextStyle(color: ColorSchemes.primaryBlue, fontWeight: FontWeight.bold)),
            ...credentials.map((cred) => CheckboxListTile(
              title: Text(cred.title, style: const TextStyle(color: Colors.white)),
              value: _selectedCredentialIds.contains(cred.id),
              onChanged: (v) {
                setState(() {
                  if (v == true) _selectedCredentialIds.add(cred.id);
                  else _selectedCredentialIds.remove(cred.id);
                });
              },
            )),
            const Divider(color: Colors.white24),
          ],
          if (folders.isNotEmpty) ...[
            const Text('Folders', style: TextStyle(color: ColorSchemes.primaryBlue, fontWeight: FontWeight.bold)),
            ...folders.map((folder) => CheckboxListTile(
              title: Text(folder.name, style: const TextStyle(color: Colors.white)),
              value: _selectedFolderSlugs.contains(folder.slug),
              onChanged: (v) {
                setState(() {
                  if (v == true) _selectedFolderSlugs.add(folder.slug);
                  else _selectedFolderSlugs.remove(folder.slug);
                });
              },
            )),
            const Divider(color: Colors.white24),
          ],
          if (files.isNotEmpty) ...[
            const Text('Loose Files', style: TextStyle(color: ColorSchemes.primaryBlue, fontWeight: FontWeight.bold)),
            ...files.map((file) => CheckboxListTile(
              title: Text(file.name, style: const TextStyle(color: Colors.white)),
              value: _selectedFileIds.contains(file.id),
              onChanged: (v) {
                setState(() {
                  if (v == true) _selectedFileIds.add(file.id);
                  else _selectedFileIds.remove(file.id);
                });
              },
            )),
          ],
          if (credentials.isEmpty && folders.isEmpty && files.isEmpty)
            const Text('No items available to share in your vault.', style: TextStyle(color: Colors.white70)),
        ],
      ),
    );
  }

  Step _buildPreviewStep() {
    return Step(
      title: const Text('Preview & Send', style: TextStyle(color: Colors.white)),
      isActive: _currentStep >= 3,
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _previewRow('Recipient', '${_nameController.text} (${_emailController.text})'),
          _previewRow('Expires in', '${_daysController.text} days'),
          _previewRow('Permissions', 'View Pwd: $_canViewPassword, Copy Pwd: $_canCopyPassword, View Notes: $_canViewNotes'),
          _previewRow('Items Shared', '${_selectedCredentialIds.length} Credentials, ${_selectedFolderSlugs.length} Folders, ${_selectedFileIds.length} Files'),
          const SizedBox(height: 16),
          const Text('You can share the secure vault credentials natively with the recipient using any messaging application.', style: TextStyle(color: Colors.white70)),
        ],
      ),
    );
  }

  Widget _previewRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: RichText(
        text: TextSpan(
          text: '$label: ',
          style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.bold),
          children: [
            TextSpan(text: value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.normal)),
          ],
        ),
      ),
    );
  }
}
