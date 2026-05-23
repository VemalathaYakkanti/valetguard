import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../auth/presentation/auth_provider.dart';

class LockScreen extends ConsumerStatefulWidget {
  const LockScreen({super.key});

  @override
  ConsumerState<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends ConsumerState<LockScreen> {
  final TextEditingController _passcodeController = TextEditingController();
  bool _isPasscodeVisible = false;
  bool _isAuthenticating = false;

  @override
  void initState() {
    super.initState();
    // Auto-trigger biometric authentication on load if enabled
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _triggerBiometrics();
    });
  }

  Future<void> _triggerBiometrics() async {
    final authState = ref.read(authProvider);
    if (authState.biometricsEnabled) {
      setState(() => _isAuthenticating = true);
      final success = await ref.read(authProvider.notifier).unlockWithBiometrics();
      if (!mounted) return;
      setState(() => _isAuthenticating = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Access Granted via Biometrics'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      }
    }
  }

  Future<void> _unlockWithPasscode() async {
    final passcode = _passcodeController.text.trim();
    if (passcode.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter your App Passcode'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    setState(() => _isAuthenticating = true);
    final success = await ref.read(authProvider.notifier).unlockWithPasscode(passcode);
    if (!mounted) return;
    setState(() => _isAuthenticating = false);

    if (success) {
      _passcodeController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Access Granted'),
          backgroundColor: Color(0xFF10B981),
        ),
      );
    } else {
      final errorMsg = ref.read(authProvider).errorMessage ?? 'Invalid passcode. Try again.';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMsg),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  @override
  void dispose() {
    _passcodeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0F172A), // Dark slate
              Color(0xFF020617), // Rich dark
              Color(0xFF1E1E38), // Cyber purple undertone
            ],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Spacer(flex: 3),

                // Icon / Logo Section
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B).withOpacity(0.8),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF3B82F6).withOpacity(0.2),
                          blurRadius: 30,
                          spreadRadius: 5,
                        ),
                      ],
                    ),
                    child: const Icon(
                      LucideIcons.shieldCheck,
                      size: 64,
                      color: Color(0xFF3B82F6),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Header
                Text(
                  "Vault Locked",
                  textAlign: TextAlign.center,
                  style: GoogleFonts.outfit(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  "Enter your App Passcode to unlock your vault",
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: const Color(0xFF94A3B8),
                  ),
                ),
                
                const Spacer(flex: 2),

                // Passcode input or Biometrics prompt trigger
                if (_isAuthenticating)
                  const Center(
                    child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF3B82F6)),
                    ),
                  )
                else ...[
                  // App Passcode Input field
                  TextField(
                    controller: _passcodeController,
                    obscureText: !_isPasscodeVisible,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: "Enter App Passcode",
                      prefixIcon: const Icon(LucideIcons.lock, color: Color(0xFF94A3B8)),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _isPasscodeVisible ? LucideIcons.eye : LucideIcons.eyeOff,
                          color: const Color(0xFF94A3B8),
                        ),
                        onPressed: () {
                          setState(() {
                            _isPasscodeVisible = !_isPasscodeVisible;
                          });
                        },
                      ),
                    ),
                    onSubmitted: (_) => _unlockWithPasscode(),
                  ),
                  const SizedBox(height: 20),

                  // Actions
                  ElevatedButton(
                    onPressed: _unlockWithPasscode,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      backgroundColor: const Color(0xFF3B82F6),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      "Unlock Vault",
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  
                  if (authState.biometricsEnabled) ...[
                    const SizedBox(height: 16),
                    TextButton.icon(
                      onPressed: _triggerBiometrics,
                      icon: const Icon(LucideIcons.fingerprint, color: Color(0xFF10B981)),
                      label: Text(
                        "Use Biometric Unlock",
                        style: GoogleFonts.inter(
                          color: const Color(0xFF10B981),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ],

                const Spacer(flex: 3),

                // Secondary quick logout/reset option
                Center(
                  child: TextButton(
                    onPressed: () {
                      ref.read(authProvider.notifier).logout();
                    },
                    child: Text(
                      "Reset & Logout User",
                      style: GoogleFonts.inter(
                        color: Colors.redAccent.withOpacity(0.8),
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
