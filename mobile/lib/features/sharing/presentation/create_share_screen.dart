import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
          ),
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
      Navigator.pop(context);
    } else {
      final errorMsg = result?['error'] ?? 'Unknown error';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to create share: $errorMsg'), backgroundColor: Colors.red, duration: const Duration(seconds: 5)),
      );
    }
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
          const Text('An email will be sent to the recipient with a secure link to access these items.', style: TextStyle(color: Colors.white70)),
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
