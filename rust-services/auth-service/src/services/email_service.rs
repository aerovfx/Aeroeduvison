use lettre::{
    message::header::ContentType,
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};
use crate::error::{AuthError, Result};

#[derive(Clone)]
pub struct EmailService {
    smtp_host: String,
    smtp_port: u16,
    smtp_user: String,
    smtp_password: String,
    smtp_from: String,
    enabled: bool,
}

impl EmailService {
    pub fn new() -> Self {
        let smtp_host = std::env::var("SMTP_HOST").unwrap_or_else(|_| "smtp.gmail.com".to_string());
        let smtp_port = std::env::var("SMTP_PORT")
            .unwrap_or_else(|_| "587".to_string())
            .parse()
            .unwrap_or(587);
        let smtp_user = std::env::var("SMTP_USER").unwrap_or_default();
        let smtp_password = std::env::var("SMTP_PASSWORD").unwrap_or_default();
        let smtp_from = std::env::var("SMTP_FROM").unwrap_or_else(|_| "noreply@aeroeduvison.com".to_string());

        let enabled = !smtp_user.is_empty() && !smtp_password.is_empty();

        if !enabled {
            tracing::warn!("Email service not configured - emails will be logged instead of sent");
        }

        Self {
            smtp_host,
            smtp_port,
            smtp_user,
            smtp_password,
            smtp_from,
            enabled,
        }
    }

    /// Send verification email
    pub async fn send_verification_email(&self, to: &str, name: &str, token: &str, app_url: &str) -> Result<()> {
        let verification_url = format!("{}/api/auth/verify?token={}", app_url, token);
        let subject = "Verify your Aeroeduvison account";
        let body = format!(
            r#"
            <h1>Welcome to Aeroeduvison, {}!</h1>
            <p>Please click the link below to verify your email address:</p>
            <a href="{}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
            <p>Or copy and paste this link into your browser:</p>
            <p>{}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
            "#,
            name, verification_url, verification_url
        );

        self.send_email(to, subject, &body).await
    }

    /// Send password reset email
    pub async fn send_password_reset_email(&self, to: &str, name: &str, token: &str, app_url: &str) -> Result<()> {
        let reset_url = format!("{}/api/auth/reset-password?token={}", app_url, token);
        let subject = "Reset your Aeroeduvison password";
        let body = format!(
            r#"
            <h1>Password Reset Request</h1>
            <p>Hello {},</p>
            <p>Click the link below to reset your password:</p>
            <a href="{}" style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p>{}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, please ignore this email.</p>
            "#,
            name, reset_url, reset_url
        );

        self.send_email(to, subject, &body).await
    }

    async fn send_email(&self, to: &str, subject: &str, html_body: &str) -> Result<()> {
        if !self.enabled {
            tracing::info!(
                to = %to,
                subject = %subject,
                "[EMAIL] Would send (service not configured): {}",
                html_body
            );
            return Ok(());
        }

        let email = Message::builder()
            .from(self.smtp_from.parse().map_err(|e| AuthError::Email(format!("Invalid from address: {}", e)))?)
            .to(to.parse().map_err(|e| AuthError::Email(format!("Invalid to address: {}", e)))?)
            .subject(subject)
            .header(ContentType::TEXT_HTML)
            .body(html_body.to_string())
            .map_err(|e| AuthError::Email(format!("Failed to build email: {}", e)))?;

        let creds = Credentials::new(self.smtp_user.clone(), self.smtp_password.clone());

        let mailer = AsyncSmtpTransport::<Tokio1Executor>::relay(&self.smtp_host)
            .map_err(|e| AuthError::Email(format!("Failed to create SMTP relay: {}", e)))?
            .port(self.smtp_port)
            .credentials(creds)
            .build();

        mailer
            .send(email)
            .await
            .map_err(|e| AuthError::Email(format!("Failed to send email: {}", e)))?;

        tracing::info!(to = %to, subject = %subject, "Email sent successfully");
        Ok(())
    }
}

impl Default for EmailService {
    fn default() -> Self {
        Self::new()
    }
}
