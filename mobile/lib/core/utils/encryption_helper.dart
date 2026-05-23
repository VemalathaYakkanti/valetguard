import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:pointycastle/export.dart';
import 'package:encrypt/encrypt.dart' as enc;

class EncryptionHelper {
  static const int iterations = 100000;
  static const int keyLength = 32; // 256 bits

  /// Derives a key using PBKDF2 with HMAC-SHA256
  static Uint8List deriveKey(String password, Uint8List salt) {
    final pkcs = PBKDF2KeyDerivator(HMac(SHA256Digest(), 64));
    pkcs.init(Pbkdf2Parameters(salt, iterations, keyLength));
    return pkcs.process(Uint8List.fromList(utf8.encode(password)));
  }

  /// Encrypts a plaintext string using AES-GCM with a master password.
  /// Returns a Map containing: ciphertext, iv, salt as base64-encoded strings.
  static Map<String, String> encryptData(String data, String password) {
    // Generate 16 bytes salt
    final random = Random.secure();
    final salt = Uint8List.fromList(List.generate(16, (_) => random.nextInt(256)));
    
    // Generate 12 bytes IV (standard for AES-GCM)
    final ivBytes = Uint8List.fromList(List.generate(12, (_) => random.nextInt(256)));

    // Derive key
    final derivedKeyBytes = deriveKey(password, salt);

    // Setup AES GCM encryption using PointyCastle
    final keyParameter = KeyParameter(derivedKeyBytes);
    final params = AEADParameters(keyParameter, 128, ivBytes, Uint8List(0));
    
    final gcm = GCMBlockCipher(AESEngine());
    gcm.init(true, params); // true = encrypt

    final plaintextBytes = Uint8List.fromList(utf8.encode(data));
    final ciphertextBytes = gcm.process(plaintextBytes);

    return {
      'ciphertext': base64.encode(ciphertextBytes),
      'iv': base64.encode(ivBytes),
      'salt': base64.encode(salt),
    };
  }

  /// Decrypts a base64 ciphertext using the master password and stored metadata.
  static String decryptData({
    required String ciphertextBase64,
    required String ivBase64,
    required String saltBase64,
    required String password,
  }) {
    final ciphertext = base64.decode(ciphertextBase64);
    final ivBytes = base64.decode(ivBase64);
    final salt = base64.decode(saltBase64);

    // Derive key
    final derivedKeyBytes = deriveKey(password, salt);

    // Setup AES GCM decryption using PointyCastle
    final keyParameter = KeyParameter(derivedKeyBytes);
    final params = AEADParameters(keyParameter, 128, ivBytes, Uint8List(0));

    final gcm = GCMBlockCipher(AESEngine());
    gcm.init(false, params); // false = decrypt

    final decryptedBytes = gcm.process(ciphertext);
    return utf8.decode(decryptedBytes);
  }
}
