import nodemailer from 'nodemailer'

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}

// Create transporter
const createTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ Email configuration missing. Emails will not be sent.')
    return null
  }

  return nodemailer.createTransporter(emailConfig)
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, resetLink: string) {
  const transporter = createTransporter()
  
  if (!transporter) {
    console.log(`📧 [EMAIL] Password reset link for ${email}: ${resetLink}`)
    return { success: false, message: 'Email not configured' }
  }

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Reset Your Password - LMS Math',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
              <p>LMS Math Platform</p>
            </div>
            <div class="content">
              <h2>Hello!</h2>
              <p>We received a request to reset your password for your LMS Math account.</p>
              
              <p>Click the button below to reset your password:</p>
              <a href="${resetLink}" class="button">Reset Password</a>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this, please ignore this email</li>
                  <li>Never share this link with anyone</li>
                </ul>
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">${resetLink}</p>
              
              <p>Best regards,<br>The LMS Math Team</p>
            </div>
            <div class="footer">
              <p>© 2025 LMS Math. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request - LMS Math
        
        Hello!
        
        We received a request to reset your password for your LMS Math account.
        
        Click this link to reset your password: ${resetLink}
        
        This link will expire in 1 hour.
        
        If you didn't request this, please ignore this email.
        
        Best regards,
        The LMS Math Team
        
        © 2025 LMS Math. All rights reserved.
      `
    }

    const result = await transporter.sendMail(mailOptions)
    console.log(`✅ [EMAIL] Password reset email sent to ${email}`)
    return { success: true, messageId: result.messageId }
    
  } catch (error) {
    console.error('❌ [EMAIL] Failed to send password reset email:', error)
    return { success: false, error: error.message }
  }
}

// Send welcome email
export async function sendWelcomeEmail(email: string, name: string) {
  const transporter = createTransporter()
  
  if (!transporter) {
    console.log(`📧 [EMAIL] Welcome email for ${email} (not sent - email not configured)`)
    return { success: false, message: 'Email not configured' }
  }

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Welcome to LMS Math! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to LMS Math</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .features { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to LMS Math!</h1>
              <p>Your Learning Journey Starts Here</p>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>Welcome to LMS Math! We're excited to have you join our learning community.</p>
              
              <div class="features">
                <h3>🚀 What you can do:</h3>
                <ul>
                  <li>📚 Access interactive lessons and courses</li>
                  <li>📝 Take quizzes and assessments</li>
                  <li>🎯 Track your learning progress</li>
                  <li>🏆 Earn achievements and badges</li>
                  <li>🤖 Use AI Content Generator (for teachers)</li>
                </ul>
              </div>
              
              <p>Ready to start learning?</p>
              <a href="${process.env.NEXTAUTH_URL}/dashboard" class="button">Go to Dashboard</a>
              
              <p>If you have any questions, feel free to contact our support team.</p>
              
              <p>Happy learning!<br>The LMS Math Team</p>
            </div>
            <div class="footer">
              <p>© 2025 LMS Math. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    const result = await transporter.sendMail(mailOptions)
    console.log(`✅ [EMAIL] Welcome email sent to ${email}`)
    return { success: true, messageId: result.messageId }
    
  } catch (error) {
    console.error('❌ [EMAIL] Failed to send welcome email:', error)
    return { success: false, error: error.message }
  }
}

// Test email configuration
export async function testEmailConfiguration() {
  const transporter = createTransporter()
  
  if (!transporter) {
    return { success: false, message: 'Email not configured' }
  }

  try {
    await transporter.verify()
    console.log('✅ [EMAIL] Email configuration is valid')
    return { success: true, message: 'Email configuration is valid' }
  } catch (error) {
    console.error('❌ [EMAIL] Email configuration error:', error)
    return { success: false, error: error.message }
  }
}
