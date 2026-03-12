# Aeroeduvison Auth Service

Rust authentication service handling:
- User login/register
- JWT token management
- 2FA TOTP
- Password reset
- Email verification

## Quick Start

```bash
cd /Users/pixibox/Aeroeduvison/rust-services/auth-service
cargo run
```

Default: `http://127.0.0.1:8092`

## Environment Variables

```bash
# Server
AUTH_SERVICE_ADDR=127.0.0.1:8092

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aeroeduvison
# If you see "TLS upgrade required but SQLx was built without TLS": either use a URL with
# sslmode=disable for local Postgres, or set AUTH_DATABASE_INSECURE_LOCAL=1 to force disable (local only).
# For cloud Postgres (Neon, Supabase, etc.) the crate is built with runtime-tokio-rustls.

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRY_HOURS=24

# Email (for verification/password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@aeroeduvison.com
SMTP_PASSWORD=app-password
SMTP_FROM=noreply@aeroeduvison.com

# App URL (for email links)
APP_URL=http://localhost:3000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/logout` - Logout (invalidate token)
- `GET /api/auth/me` - Get current user

### 2FA
- `POST /api/auth/2fa/setup` - Enable 2FA
- `POST /api/auth/2fa/verify` - Verify 2FA code
- `POST /api/auth/2fa/disable` - Disable 2FA

### Password Reset
- `POST /api/auth/forgot-password` - Request reset email
- `POST /api/auth/reset-password` - Reset with token

### Email Verification
- `POST /api/auth/verify` - Verify email with token
- `POST /api/auth/resend-verification` - Resend email

## Health Check

```bash
curl http://127.0.0.1:8092/health
```

## Troubleshooting

**"Failed to create database pool: TLS upgrade required by connect options but SQLx was built without TLS support"**

- **Option A (local Postgres):** Use a connection string without TLS, e.g. `postgresql://user:pass@127.0.0.1:5432/db` with no `?sslmode=require`. Or set `AUTH_DATABASE_INSECURE_LOCAL=1` so the service rewrites `sslmode=require` → `sslmode=disable` (local only).
- **Option B (cloud Postgres):** The crate enables `runtime-tokio-rustls` in Cargo.toml. Run `cargo build` again so sqlx is built with TLS; then `DATABASE_URL` with `sslmode=require` will work.

## Testing

```bash
cargo test
```

## Benchmark

```bash
cargo bench
```
