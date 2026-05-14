import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create robust SMTP transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true, // true for port 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App Password or standard password
  },
  tls: {
    // Bypasses local antivirus/firewall proxy self-signed cert checks during development
    rejectUnauthorized: false,
  },
});

/**
 * Send guest invitation email with login credentials via SMTP protocol.
 * Formats sender name beautifully to show the admin's sharing email address.
 */
export const sendGuestInviteEmail = async ({ recipientEmail, recipientName, adminName, adminEmail, tempPassword, otp, expiresAt }) => {
  const loginUrl = `${process.env.APP_URL || 'http://localhost:5173'}/guest-login`;
  const expiryStr = new Date(expiresAt).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });

  const sharingAdminEmail = adminEmail || 'admin@vaultguard.local';

  // Log credentials to console for local monitoring / fallback assurance
  console.log('\n==================================================');
  console.log(`✉️  SMTP GUEST INVITATION PREPARING FOR: ${recipientEmail}`);
  console.log(`Shared By Admin Email: ${sharingAdminEmail}`);
  console.log('==================================================');
  console.log(`Login URL:          ${loginUrl}`);
  console.log(`Temporary Password: ${tempPassword}`);
  console.log(`One-Time OTP:       ${otp}`);
  console.log(`Expires At:         ${expiryStr}`);
  console.log('==================================================\n');

  // Gorgeous, premium responsive email layout
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>VaultGuard Shared Access</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f1f5f9;
          margin: 0;
          padding: 40px 20px;
          color: #0f172a;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 560px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 24px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.06);
        }
        .header {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          padding: 40px 40px;
          text-align: center;
        }
        .logo-wrapper {
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }
        .logo-icon {
          background-color: #2563eb;
          border-radius: 14px;
          padding: 12px;
          display: inline-flex;
          box-shadow: 0 8px 16px rgba(37, 99, 235, 0.2);
        }
        .app-title {
          color: #ffffff;
          font-size: 24px;
          font-weight: 900;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px;
        }
        .greeting {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 12px;
        }
        .intro-text {
          color: #475569;
          font-size: 15px;
          line-height: 1.6;
          margin: 0 0 32px;
        }
        .highlight-email {
          color: #2563eb;
          font-weight: 700;
          background-color: #eff6ff;
          padding: 2px 6px;
          border-radius: 6px;
        }
        .credentials-card {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 28px;
          margin-bottom: 32px;
        }
        .card-heading {
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: #94a3b8;
          margin: 0 0 20px;
        }
        .cred-item {
          margin-bottom: 16px;
        }
        .cred-item:last-child {
          margin-bottom: 0;
        }
        .cred-label {
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 4px;
          display: block;
        }
        .cred-value-box {
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 10px 16px;
          border-radius: 12px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          word-break: break-all;
        }
        .otp-highlight {
          color: #2563eb;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 0.25em;
          text-align: center;
          padding: 14px;
          background-color: #eff6ff;
          border-color: #bfdbfe;
        }
        .btn-wrapper {
          text-align: center;
          margin: 36px 0;
        }
        .primary-btn {
          display: inline-block;
          background-color: #2563eb;
          color: #ffffff;
          text-decoration: none;
          padding: 16px 36px;
          border-radius: 16px;
          font-weight: 800;
          font-size: 16px;
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
        }
        .security-notice {
          background-color: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 16px;
          padding: 16px 20px;
          font-size: 13.5px;
          color: #92400e;
          line-height: 1.5;
          margin-top: 20px;
        }
        .security-notice strong {
          color: #b45309;
        }
        .footer {
          background-color: #f8fafc;
          border-top: 1px solid #f1f5f9;
          padding: 24px 40px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-wrapper">
            <div class="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <p class="app-title">VaultGuard</p>
          </div>
        </div>
        
        <div class="content">
          <p class="greeting">Hello, ${recipientName} 👋</p>
          <p class="intro-text">
            Access has been shared with you by <span class="highlight-email">${sharingAdminEmail}</span> using VaultGuard's secure portal. 
            Use the single-use temporary credentials provided below to decrypt and access the shared vault space. 
            <br><br>
            ⏳ Access automatically expires on <strong>${expiryStr}</strong>.
          </p>

          <div class="credentials-card">
            <p class="card-heading">Secure Guest Credentials</p>
            
            <div class="cred-item">
              <span class="cred-label">Login Portal URL</span>
              <div class="cred-value-box" style="font-size: 13px; color: #475569;">
                ${loginUrl}
              </div>
            </div>

            <div class="cred-item">
              <span class="cred-label">Authorized Email</span>
              <div class="cred-value-box">
                ${recipientEmail}
              </div>
            </div>

            <div class="cred-item">
              <span class="cred-label">Temporary Password</span>
              <div class="cred-value-box">
                ${tempPassword}
              </div>
            </div>

            <div class="cred-item">
              <span class="cred-label">One-Time Verification OTP</span>
              <div class="cred-value-box otp-highlight">
                ${otp}
              </div>
            </div>
          </div>

          <div class="btn-wrapper">
            <a href="${loginUrl}" class="primary-btn">Open Shared Vault →</a>
          </div>

          <div class="security-notice">
            🔒 <strong>Security Restriction:</strong> The One-Time OTP displayed above is valid for exactly <strong>24 hours</strong>. Please log in before it expires. Vault data remains zero-knowledge encrypted.
          </div>
        </div>

        <div class="footer">
          Shared securely via SMTP protocol by <strong>${sharingAdminEmail}</strong>.<br>
          VaultGuard Enterprise · Automated Security Notification
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    if (!process.env.EMAIL_USER) {
      console.log('⚠️ EMAIL_USER not defined in .env. Please configure SMTP credentials to enable automatic emailing.');
      return { success: false, reason: 'EMAIL_USER unconfigured' };
    }

    // Send mail specifying the sender string beautifully to include the admin's email address sharing the access
    const info = await transporter.sendMail({
      from: `"${sharingAdminEmail} via VaultGuard" <${process.env.EMAIL_USER}>`,
      replyTo: sharingAdminEmail,
      to: recipientEmail,
      subject: `[VaultGuard Secure Share] Access granted by ${sharingAdminEmail}`,
      html,
    });

    console.log(`✅ SMTP email successfully delivered to ${recipientEmail} [Message ID: ${info.messageId}]`);
    return { success: true };
  } catch (err) {
    console.error('❌ SMTP Mailing Service Error:', err.message);
    return { success: false, reason: err.message };
  }
};
