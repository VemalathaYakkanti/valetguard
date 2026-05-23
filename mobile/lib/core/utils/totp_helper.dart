import 'dart:typed_data';
import 'package:crypto/crypto.dart';

class TotpHelper {
  /// Generates a standard 6-digit TOTP code based on a Base32 secret.
  static String generateTOTP(String secret, {int interval = 30}) {
    try {
      final key = _base32Decode(secret.replaceAll(' ', '').toUpperCase());
      final time = DateTime.now().millisecondsSinceEpoch ~/ 1000;
      final counter = time ~/ interval;

      // Convert counter to 8-byte big-endian byte array
      final counterBytes = Uint8List(8);
      var temp = counter;
      for (var i = 7; i >= 0; i--) {
        counterBytes[i] = temp & 0xff;
        temp >>= 8;
      }

      final hmac = Hmac(sha1, key);
      final hash = hmac.convert(counterBytes).bytes;

      final offset = hash[hash.length - 1] & 0xf;
      final binary = ((hash[offset] & 0x7f) << 24) |
                     ((hash[offset + 1] & 0xff) << 16) |
                     ((hash[offset + 2] & 0xff) << 8) |
                     (hash[offset + 3] & 0xff);

      final otp = binary % 1000000;
      return otp.toString().padLeft(6, '0');
    } catch (e) {
      return '000000';
    }
  }

  /// Calculates the remaining seconds of the current 30s TOTP step.
  static int getSecondsLeft({int interval = 30}) {
    final time = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    return interval - (time % interval);
  }

  /// Decodes a Base32 string to bytes.
  static Uint8List _base32Decode(String base32) {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    final cleanBase32 = base32.replaceAll('=', '');
    final bytes = <int>[];
    var buffer = 0;
    var bitsLeft = 0;

    for (var i = 0; i < cleanBase32.length; i++) {
      final char = cleanBase32[i];
      final val = base32Chars.indexOf(char);
      if (val == -1) continue;

      buffer = (buffer << 5) | val;
      bitsLeft += 5;

      if (bitsLeft >= 8) {
        bytes.add((buffer >> (bitsLeft - 8)) & 0xff);
        bitsLeft -= 8;
      }
    }
    return Uint8List.fromList(bytes);
  }
}
