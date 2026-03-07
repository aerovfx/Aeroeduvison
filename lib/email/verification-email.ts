/**
 * Email Verification Service
 * Sends verification emails to new users
 */

interface SendVerificationEmailParams {
  email: string;
  name: string;
  verificationToken: string;
}

export async function sendVerificationEmail({
  email,
  name,
  verificationToken
}: SendVerificationEmailParams) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify?token=${verificationToken}`;

  // In production, use a real email service (SendGrid, Resend, etc.)
  // For now, we'll log to console
  
  const emailContent = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 EMAIL VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To: ${email}
Subject: Verify Your Email - AI-Driven Education

Hello ${name},

Welcome to AI-Driven Education! 🎓

Please verify your email address by clicking the link below:

🔗 ${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, please ignore this email.

Best regards,
AI-Driven Education Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;

  console.log(emailContent);

  // TODO: In production, replace with actual email service
  // Example with Resend:
  // await resend.emails.send({
  //   from: 'noreply@yourapp.com',
  //   to: email,
  //   subject: 'Verify Your Email - AI-Driven Education',
  //   html: generateHTMLEmail(name, verificationUrl)
  // });

  return {
    success: true,
    message: 'Verification email sent (check console in dev mode)'
  };
}

function generateHTMLEmail(name: string, verificationUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px;
      margin: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 10px;
    }
    .title {
      font-size: 24px;
      color: #1f2937;
      margin-bottom: 10px;
    }
    .content {
      color: #4b5563;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: bold;
      text-align: center;
      margin: 20px 0;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🚀 AI-Driven Education</div>
      <h1 class="title">Verify Your Email</h1>
    </div>
    
    <div class="content">
      <p>Hello <strong>${name}</strong>,</p>
      
      <p>Welcome to AI-Driven Education! We're excited to have you on board. 🎉</p>
      
      <p>To get started, please verify your email address by clicking the button below:</p>
      
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">
          ✅ Verify My Email
        </a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="background: #f3f4f6; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 12px;">
        ${verificationUrl}
      </p>
      
      <p style="color: #ef4444; font-size: 14px;">
        ⚠️ This link will expire in 24 hours.
      </p>
      
      <p>If you didn't create an account, please ignore this email.</p>
    </div>
    
    <div class="footer">
      <p>© 2025 AI-Driven Education. All rights reserved.</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

