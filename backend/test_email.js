import { sendGuestInviteEmail } from './src/utils/email.js';

async function run() {
  console.log('Testing SMTP connection and sending a test invite...');
  const res = await sendGuestInviteEmail({
    recipientEmail: 'kagithapushkara@gmail.com',
    recipientName: 'Test Recipient',
    adminName: 'Admin',
    adminEmail: 'kagithapushkara@gmail.com',
    tempPassword: 'Vg-TestPassword1!',
    otp: '123456',
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
  });
  console.log('Test result:', res);
  process.exit(0);
}

run().catch(err => {
  console.error('Test caught error:', err);
  process.exit(1);
});
