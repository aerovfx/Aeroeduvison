# Batch 5: Auth Service Migration - Implementation Guide

## ✅ Completed

### Rust Auth Service Created
- **Location**: `rust-services/auth-service/`
- **Port**: 8091
- **Status**: Ready for testing

### Features Implemented
1. ✅ Password hashing with Argon2
2. ✅ JWT token generation/validation
3. ✅ TOTP 2FA with totp-rs
4. ✅ Login endpoint with account lockout
5. ✅ Register endpoint with password validation
6. ✅ 2FA setup/verify/disable endpoints
7. ✅ Password reset flow
8. ✅ Email verification flow
9. ✅ Canary routing in middleware

### API Endpoints Migrated

| Endpoint | Method | Rust Handler | Status |
|----------|--------|--------------|--------|
| `/api/auth/login` | POST, GET | `handlers::login` | ✅ |
| `/api/auth/register` | POST | `handlers::register` | ✅ |
| `/api/auth/2fa/setup` | POST | `handlers::setup_2fa` | ✅ |
| `/api/auth/2fa/verify` | POST | `handlers::verify_2fa` | ✅ |
| `/api/auth/2fa/disable` | POST | `handlers::disable_2fa` | ✅ |
| `/api/auth/forgot-password` | POST | `handlers::forgot_password` | ✅ |
| `/api/auth/reset-password` | POST | `handlers::reset_password` | ✅ |
| `/api/auth/verify` | POST | `handlers::verify_email` | ✅ |
| `/api/auth/me` | GET | `handlers::get_current_user` | ✅ |
| `/api/auth/logout` | POST | `handlers::logout` | ✅ |

---

## 🚀 Quick Start

### 1. Setup Environment

Create `.env` for auth service:

```bash
# rust-services/auth-service/.env
AUTH_SERVICE_ADDR=127.0.0.1:8091
DATABASE_URL=postgresql://user:password@localhost:5432/aeroeduvison
JWT_SECRET=your-super-secret-key-min-32-chars-long!!
JWT_EXPIRY_HOURS=24

# Email (optional - for verification/password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@aeroeduvison.com

APP_URL=http://localhost:3000
```

### 2. Run Auth Service

```bash
cd /Users/pixibox/Aeroeduvison/rust-services/auth-service
cargo run
```

Expected output:
```
🔐 Auth service starting on 127.0.0.1:8091
```

### 3. Health Check

```bash
curl http://127.0.0.1:8091/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "auth-service",
  "version": "0.1.0",
  "database_connected": true
}
```

---

## 🧪 Testing

### Test Registration

```bash
curl -X POST http://127.0.0.1:8091/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "name": "Test User"
  }'
```

### Test Login

```bash
curl -X POST http://127.0.0.1:8091/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

### Run Unit Tests

```bash
cd /Users/pixibox/Aeroeduvison/rust-services/auth-service
cargo test
```

---

## 📊 Canary Rollout

### Enable Canary (10% traffic to Rust)

Add to root `.env.local`:

```bash
ENABLE_RUST_CANARY_PROXY=true
RUST_CANARY_PERCENT=10
RUST_CANARY_STEPS=10,25,50,100
RUST_CANARY_MIN_REQUESTS_PER_STEP=200
RUST_CANARY_MIN_STEP_MINUTES=10
```

### Enable Direct Proxy (100% to Rust)

```bash
DIRECT_RUST_AUTH_PROXY=true
```

### Test with Override Header

```bash
# Force Rust backend
curl -H "x-strangler-target: rust" http://localhost:3000/api/auth/login

# Force Node.js backend
curl -H "x-strangler-target: node" http://localhost:3000/api/auth/login
```

---

## 📁 File Structure

```
rust-services/auth-service/
├── Cargo.toml                  # Dependencies
├── README.md                   # Service documentation
├── src/
│   ├── main.rs                 # Entry point, router setup
│   ├── error.rs                # Error types
│   ├── models.rs               # Data models
│   ├── db.rs                   # Database utilities
│   ├── handlers/
│   │   ├── mod.rs
│   │   ├── auth.rs             # Login, logout, get_current_user
│   │   ├── register.rs         # Register
│   │   ├── 2fa.rs              # 2FA endpoints
│   │   ├── password_reset.rs   # Forgot/reset password
│   │   ├── verification.rs     # Email verification
│   │   └── health.rs           # Health check
│   └── services/
│       ├── mod.rs
│       ├── auth_service.rs     # Password hashing, JWT, TOTP
│       └── email_service.rs    # Email sending
├── migrations/
│   └── 001_failed_login_attempts.sql
└── tests/
    └── auth_test.rs            # Unit tests
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_SERVICE_ADDR` | `127.0.0.1:8091` | Service bind address |
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `JWT_SECRET` | (required) | Secret key for JWT (min 32 chars) |
| `JWT_EXPIRY_HOURS` | `24` | Token expiration time |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | - | SMTP username |
| `SMTP_PASSWORD` | - | SMTP password |
| `SMTP_FROM` | `noreply@aeroeduvison.com` | From email address |
| `APP_URL` | `http://localhost:3000` | Frontend URL |

---

## 🔐 Security Features

1. **Password Hashing**: Argon2id (OWASP recommended)
2. **Account Lockout**: 5 failed attempts → 30 min lock
3. **JWT Tokens**: Secure session management
4. **2FA TOTP**: RFC 6238 compliant
5. **Password Validation**: Minimum 8 chars, uppercase, lowercase, number, special char
6. **Email Enumeration Prevention**: Generic error messages
7. **Rate Limiting**: Via middleware (can be added)

---

## 📈 Next Steps

### Week 1-2 Tasks
- [ ] Test all endpoints with existing frontend
- [ ] Verify email sending works
- [ ] Test 2FA flow with authenticator app
- [ ] Run load tests
- [ ] Deploy to staging
- [ ] Canary rollout: 10% → 25% → 50% → 100%

### Week 3-4: Batch 6 (Courses)
- [ ] Create `course-service` scaffold
- [ ] Migrate course CRUD endpoints
- [ ] Migrate chapter management
- [ ] Migrate progress tracking

---

## 🐛 Troubleshooting

### Database Connection Error
```
Error: Failed to create database pool
```
**Solution**: Check `DATABASE_URL` in `.env`

### Email Not Sending
```
Email service not configured - emails will be logged
```
**Solution**: Set `SMTP_USER` and `SMTP_PASSWORD` in `.env`

### JWT Secret Too Short
```
JWT secret is less than 32 characters
```
**Solution**: Use a longer secret (min 32 chars)

### Port Already in Use
```
Address already in use
```
**Solution**: Change `AUTH_SERVICE_ADDR` to different port

---

## 📞 Support

For issues or questions:
- Check logs: `RUST_LOG=debug cargo run`
- Review error responses in `src/error.rs`
- See full documentation in `Migrate2Rust.md`

---

**Created**: March 8, 2026
**Status**: ✅ Implementation Complete
**Next**: Testing & Canary Rollout
