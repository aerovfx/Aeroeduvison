# Quick Start: Rust Auth Service

**Port**: 8092 (updated to avoid conflict with vector-sim-service on 8091)

---

## 🚀 Chạy Auth Service

### 1. Setup Database URL

```bash
# Tạo .env trong rust-services/auth-service/
cat > rust-services/auth-service/.env << EOF
AUTH_SERVICE_ADDR=127.0.0.1:8092
DATABASE_URL=postgresql://user:password@localhost:5432/aeroeduvison
JWT_SECRET=dev-secret-key-min-32-chars-for-local-testing!!
JWT_EXPIRY_HOURS=24
APP_URL=http://localhost:3000
EOF
```

### 2. Chạy service

```bash
cd /Users/pixibox/Aeroeduvison/rust-services/auth-service
cargo run --release
```

**Expected output**:
```
🔐 Auth service starting on 127.0.0.1:8092
```

### 3. Health check

```bash
curl http://127.0.0.1:8092/health
```

**Expected response**:
```json
{
  "status": "healthy",
  "service": "auth-service",
  "version": "0.1.0",
  "database_connected": true
}
```

---

## 🧪 Test API Endpoints

### Test Login

```bash
curl -X POST http://127.0.0.1:8092/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

### Test Register

```bash
curl -X POST http://127.0.0.1:8092/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "StrongPass123!",
    "name": "New User"
  }'
```

### Test Forgot Password

```bash
curl -X POST http://127.0.0.1:8092/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

---

## 🔧 Run with Next.js (Canary Mode)

### Option 1: 10% traffic to Rust

```bash
cd /Users/pixibox/Aeroeduvison

# Terminal 1: Run auth service
cd rust-services/auth-service && cargo run --release &

# Terminal 2: Run Next.js with canary
bun run dev:rust-auth
```

### Option 2: 100% traffic to Rust

```bash
cd /Users/pixibox/Aeroeduvison

# Terminal 1: Run auth service
cd rust-services/auth-service && cargo run --release &

# Terminal 2: Run Next.js with direct proxy
bun run dev:rust-auth-direct
```

### Option 3: Run all Rust services

```bash
cd /Users/pixibox/Aeroeduvison
bun run rust:all
```

---

## 📊 Port Summary

| Service | Port | Purpose |
|---------|------|---------|
| `vector-sim-service` | 8091 | Vector similarity |
| `aero-backend` | 8090 | OCR, LLM grading |
| `auth-service` | 8092 | Authentication |
| Next.js | 3000/3100 | Frontend |

---

## 🔍 Debug

### Enable debug logging

```bash
cd rust-services/auth-service
RUST_LOG=debug cargo run
```

### Check logs

```bash
# See all logs
tail -f rust-services/auth-service/logs/*.log

# Or with journalctl (systemd)
journalctl -u auth-service -f
```

### Test with override header

```bash
# Force use Rust backend
curl -H "x-strangler-target: rust" http://localhost:3000/api/auth/login

# Force use Node.js backend  
curl -H "x-strangler-target: node" http://localhost:3000/api/auth/login
```

---

## ⚠️ Troubleshooting

### Port already in use

```
Error: Address already in use (os error 48)
```

**Solution**: Kill existing process or change port:
```bash
# Kill process on port 8092
lsof -ti:8092 | xargs kill -9

# Or change port in .env
AUTH_SERVICE_ADDR=127.0.0.1:8093
```

### Database connection failed

```
Error: Failed to create database pool
```

**Solution**: 
1. Check DATABASE_URL in .env
2. Ensure PostgreSQL is running: `brew services list | grep postgres`
3. Test connection: `psql $DATABASE_URL -c "SELECT 1"`

### JWT secret too short

```
JWT secret is less than 32 characters
```

**Solution**: Use longer secret (min 32 chars):
```bash
JWT_SECRET=$(openssl rand -base64 32)
```

### Email not sending

```
Email service not configured - emails will be logged
```

**Solution**: Configure SMTP in .env or ignore for local testing (emails logged instead of sent)

---

## 📁 Files Created

```
rust-services/auth-service/
├── Cargo.toml
├── README.md
├── BATCH_5_COMPLETE.md
├── .env (create this)
├── src/
│   ├── main.rs
│   ├── error.rs
│   ├── models.rs
│   ├── db.rs
│   ├── handlers/
│   │   ├── auth.rs
│   │   ├── register.rs
│   │   ├── health.rs
│   │   ├── password_reset.rs
│   │   └── verification.rs
│   └── services/
│       ├── auth_service.rs
│       └── email_service.rs
├── migrations/
│   └── 001_failed_login_attempts.sql
└── tests/
    └── auth_test.rs
```

---

## ✅ Checklist

- [ ] Auth service builds successfully
- [ ] Health check returns 200
- [ ] Login endpoint works
- [ ] Register endpoint works
- [ ] Database connected
- [ ] Canary routing configured in middleware.ts
- [ ] Next.js can proxy to Rust service

---

**Created**: March 8, 2026
**Port**: 8092 (updated from 8091 to avoid conflict)
**Status**: ✅ Ready for testing
