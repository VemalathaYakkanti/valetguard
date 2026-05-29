// Base32 decoding helper
function base32ToBytes(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  const length = clean.length;
  const bytes = new Uint8Array(Math.floor((length * 5) / 8));
  let val = 0;
  let count = 0;
  let index = 0;

  for (let i = 0; i < length; i++) {
    const char = clean[i];
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue; // Skip invalid chars

    val = (val << 5) | idx;
    count += 5;

    if (count >= 8) {
      bytes[index++] = (val >>> (count - 8)) & 0xff;
      count -= 8;
    }
  }
  return bytes;
}

// Generate TOTP
export async function generateTOTP(secret, timeStep = 30) {
  try {
    if (!secret) return '';
    const keyBytes = base32ToBytes(secret);
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / timeStep);

    // Counter as 8-byte array buffer (big endian)
    const counterBuffer = new ArrayBuffer(8);
    const view = new DataView(counterBuffer);
    view.setUint32(0, 0); // High 32 bits
    view.setUint32(4, counter); // Low 32 bits

    // Import HMAC key using Web Crypto API
    const key = await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    // Compute HMAC signature
    const signature = await window.crypto.subtle.sign('HMAC', key, counterBuffer);
    const hmacBytes = new Uint8Array(signature);

    // Dynamic truncation
    const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
    const binary =
      ((hmacBytes[offset] & 0x7f) << 24) |
      ((hmacBytes[offset + 1] & 0xff) << 16) |
      ((hmacBytes[offset + 2] & 0xff) << 8) |
      (hmacBytes[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  } catch (error) {
    console.error('TOTP generation failed:', error);
    return 'INVALID';
  }
}
