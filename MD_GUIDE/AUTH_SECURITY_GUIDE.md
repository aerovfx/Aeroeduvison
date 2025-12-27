# 🔒 Authentication Security Features Guide

## Overview

This document describes the comprehensive security features implemented for the authentication system, including rate limiting, password validation, account lockout, two-factor authentication (2FA), and audit logging.

## 🆕 New Security Features

### 1. Rate Limiting

Prevents brute force attacks by limiting the number of requests from a single IP address.

**Configuration:**
- **Login:** 5 attempts per 15 minutes, 30 minutes lockout
- **Registration:** 3 attempts per hour, 1 hour lockout
- **API:** 100 requests per minute, 5 minutes lockout

**Files:**
- `lib/rate-limit.ts` - Core rate limiting logic

**Usage:**
```typescript
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

// In API route
const rateLimiter = createRateLimiter('login');
const result = rateLimiter(request);

if (result) {
  return result; // Rate limit exceeded
}
```

---

### 2. Password Validation

Enforces strong password requirements to protect user accounts.

**Requirements:**
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*...)
- Not a commonly used password

**Password Strength Levels:**
- **Weak** (0-29): Does not meet requirements
- **Fair** (30-49): Meets minimum requirements
- **Good** (50-69): Good password
- **Strong** (70-89): Strong password
- **Very Strong** (90-100): Excellent password

**Files:**
- `lib/password-validation.ts` - Password validation logic

**Usage:**
```typescript
import { validatePassword } from '@/lib/password-validation';

const result = validatePassword(password);

if (!result.isValid) {
  console.error('Password errors:', result.errors);
  console.log('Strength:', result.strength);
  console.log('Score:', result.score);
}
```

---

### 3. Account Lockout

Automatically locks accounts after multiple failed login attempts.

**Configuration:**
- **Max Failed Attempts:** 5
- **Lockout Duration:** 30 minutes
- **Reset After:** 15 minutes of inactivity

**Features:**
- Automatic lockout after 5 failed attempts
- Countdown timer for locked accounts
- Admin can manually unlock accounts
- Failed attempts reset after successful login

**Files:**
- `lib/account-lockout.ts` - Account lockout logic
- `app/api/admin/unlock-account/route.ts` - Admin unlock endpoint

**Database Fields (User model):**
```typescript
failedLoginAttempts: Int
lockedUntil: DateTime?
lastLoginAt: DateTime?
lastLoginIp: String?
```

**Admin API:**
```bash
# Get locked accounts
GET /api/admin/unlock-account

# Unlock an account
POST /api/admin/unlock-account
{
  "email": "user@example.com"
}
```

---

### 4. Two-Factor Authentication (2FA)

Adds an extra layer of security using Time-based One-Time Passwords (TOTP).

**Features:**
- TOTP-based authentication (compatible with Google Authenticator, Authy, etc.)
- 8 backup codes for emergency access
- QR code for easy setup
- Backup code regeneration
- Supports admin-required 2FA

**Files:**
- `lib/two-factor.ts` - 2FA logic
- `app/api/auth/2fa/setup/route.ts` - Setup endpoint
- `app/api/auth/2fa/verify/route.ts` - Verification endpoint
- `app/api/auth/2fa/disable/route.ts` - Disable endpoint

**Database Fields (User model):**
```typescript
twoFactorEnabled: Boolean
twoFactorSecret: String?
twoFactorBackupCodes: String[]
```

**User Flow:**

1. **Setup 2FA:**
```typescript
POST /api/auth/2fa/setup
Response: {
  secret: "BASE32_SECRET",
  qrCodeUrl: "otpauth://totp/...",
  backupCodes: ["XXXX-XXXX", ...]
}
```

2. **Verify Setup:**
```typescript
POST /api/auth/2fa/verify
{
  "token": "123456",
  "isSetup": true
}
```

3. **Login with 2FA:**
```typescript
POST /api/auth/callback/credentials
{
  "email": "user@example.com",
  "password": "password",
  "twoFactorCode": "123456"
}
```

4. **Disable 2FA:**
```typescript
POST /api/auth/2fa/disable
```

---

### 5. Audit Logging

Comprehensive logging of all authentication events for security monitoring and compliance.

**Logged Events:**
- `login` - Successful login
- `logout` - User logout
- `register` - New user registration
- `password_reset` - Password reset
- `password_change` - Password changed
- `failed_login` - Failed login attempt
- `account_locked` - Account locked
- `account_unlocked` - Account unlocked
- `2fa_enabled` - 2FA enabled
- `2fa_disabled` - 2FA disabled
- `2fa_verified` - 2FA code verified
- `2fa_failed` - 2FA verification failed
- `email_verified` - Email verified
- `session_expired` - Session expired

**Files:**
- `lib/auth-logger.ts` - Audit logging logic
- `app/api/admin/auth-logs/route.ts` - Admin logs endpoint

**Database Model:**
```typescript
model AuthLog {
  id: String
  userId: String?
  email: String
  action: String
  status: String // 'success', 'failed', 'blocked', 'pending'
  ipAddress: String?
  userAgent: String?
  metadata: Json?
  createdAt: DateTime
}
```

**Admin API:**
```bash
# Get auth logs with filters
GET /api/admin/auth-logs?action=login&status=success&page=1&pageSize=100

# Get auth statistics
GET /api/admin/auth-logs
Response: {
  logs: [...],
  stats: {
    totalLogins: 1234,
    totalFailedLogins: 56,
    totalRegistrations: 789,
    totalAccountLockouts: 12,
    total2FAEnabled: 45,
    uniqueUsers: 567
  }
}
```

---

## 📊 Database Changes

### New User Fields

```prisma
model User {
  // ... existing fields ...
  
  // Account Security
  failedLoginAttempts   Int       @default(0)
  lockedUntil           DateTime?
  lastLoginAt           DateTime?
  lastLoginIp           String?
  
  // Two-Factor Authentication
  twoFactorEnabled      Boolean   @default(false)
  twoFactorSecret       String?
  twoFactorBackupCodes  String[]  @default([])
  
  // Relations
  AuthLog               AuthLog[]
}
```

### New AuthLog Model

```prisma
model AuthLog {
  id          String   @id
  userId      String?
  email       String
  action      String
  status      String
  ipAddress   String?
  userAgent   String?
  metadata    Json?
  createdAt   DateTime @default(now())
  User        User?    @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([email])
  @@index([action])
  @@index([createdAt])
}
```

---

## 🚀 Setup Instructions

### 1. Update Database

Run the migration to add new security fields:

```bash
# Push schema changes
npx prisma db push

# Or create a migration
npx prisma migrate dev --name add_auth_security_features

# Generate Prisma client
npx prisma generate
```

### 2. Environment Variables

No additional environment variables required. All features work out of the box.

Optional: Configure production settings in `lib/rate-limit.ts`, `lib/account-lockout.ts`, etc.

### 3. Test Security Features

```bash
# Run comprehensive security tests
npm run test:auth:security

# Run all auth tests
npm run test:auth:full
```

---

## 🔧 Configuration

### Rate Limiting

Edit `lib/rate-limit.ts`:

```typescript
export const RATE_LIMIT_CONFIG = {
  login: {
    maxAttempts: 5,           // Max attempts per window
    windowMs: 15 * 60 * 1000, // 15 minutes
    lockoutMs: 30 * 60 * 1000 // 30 minutes lockout
  },
  // ... other configs
};
```

### Account Lockout

Edit `lib/account-lockout.ts`:

```typescript
export const LOCKOUT_CONFIG = {
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 30,
  resetAfterMinutes: 15,
  permanentLockoutAttempts: 10
};
```

### Password Requirements

Edit `lib/password-validation.ts`:

```typescript
export const DEFAULT_PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  disallowCommonPasswords: true
};
```

---

## 📱 Frontend Integration Examples

### Password Strength Indicator

```typescript
import { validatePassword, getPasswordStrengthColor } from '@/lib/password-validation';

function PasswordInput() {
  const [password, setPassword] = useState('');
  const validation = validatePassword(password);
  
  return (
    <div>
      <input 
        type="password" 
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className={getPasswordStrengthColor(validation.strength)}>
        Strength: {validation.strength} ({validation.score}/100)
      </div>
      {validation.errors.map(error => (
        <div key={error} className="text-red-500">{error}</div>
      ))}
    </div>
  );
}
```

### 2FA Setup Component

```typescript
function Enable2FA() {
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  
  const setup2FA = async () => {
    const response = await fetch('/api/auth/2fa/setup', {
      method: 'POST'
    });
    const data = await response.json();
    setQrCode(data.qrCodeUrl);
    setBackupCodes(data.backupCodes);
  };
  
  const verify2FA = async (token: string) => {
    const response = await fetch('/api/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, isSetup: true })
    });
    return response.ok;
  };
  
  return (
    <div>
      <button onClick={setup2FA}>Enable 2FA</button>
      {qrCode && (
        <div>
          <img src={qrCode} alt="QR Code" />
          <div>Backup Codes: {backupCodes.join(', ')}</div>
        </div>
      )}
    </div>
  );
}
```

---

## 🛡️ Security Best Practices

1. **Always use HTTPS in production**
   - Set `useSecureCookies: true` in auth config

2. **Rotate secrets regularly**
   - Change `NEXTAUTH_SECRET` every 90 days

3. **Monitor failed login attempts**
   - Set up alerts for unusual patterns
   - Review auth logs regularly

4. **Enforce 2FA for admin accounts**
   - Make it mandatory in production

5. **Implement session timeout**
   - Already configured (30 days max)

6. **Use strong password policies**
   - Current requirements are good
   - Consider adding password history

7. **Rate limit API endpoints**
   - Already implemented for auth routes
   - Consider adding to other sensitive endpoints

8. **Log review and retention**
   - Review logs weekly
   - Retain logs for 90 days minimum
   - Use `cleanupOldAuthLogs()` for automatic cleanup

9. **Account recovery**
   - Implement secure password reset
   - Use backup codes for 2FA

10. **Regular security audits**
    - Test security features monthly
    - Update dependencies regularly

---

## 📈 Monitoring & Analytics

### Admin Dashboard Features

View in `/api/admin/auth-logs`:

- Total login attempts (success/failed)
- Account lockout statistics
- 2FA adoption rate
- Security event timeline
- IP address analysis
- User activity patterns

### Alerts to Implement

1. Multiple failed logins from same IP
2. Account lockouts spike
3. Unusual login times/locations
4. 2FA failures
5. Admin account access

---

## 🧪 Testing

### Manual Testing

```bash
# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/callback/credentials \
    -d "email=test@example.com&password=wrong"
done

# Test password validation
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"weak"}'

# Test account lockout
# (Multiple failed logins as shown above)

# Test 2FA setup (requires authentication)
curl -X POST http://localhost:3000/api/auth/2fa/setup \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

### Automated Testing

```bash
# Run security test suite
npm run test:auth:security

# Run all auth tests
npm run test:auth:full
```

---

## 📝 Migration Checklist

- [x] Update Prisma schema
- [x] Create migration SQL
- [x] Implement rate limiting
- [x] Implement password validation
- [x] Implement account lockout
- [x] Implement 2FA system
- [x] Implement audit logging
- [x] Update auth routes
- [x] Create admin endpoints
- [x] Write tests
- [ ] Run database migration
- [ ] Test in development
- [ ] Update frontend UI
- [ ] Deploy to production
- [ ] Monitor for issues

---

## 🆘 Troubleshooting

### Issue: Rate limiting not working

**Solution:** Make sure you're using the same IP address. In development, all requests may appear to come from localhost.

### Issue: Account locked indefinitely

**Solution:** Admin can unlock via `/api/admin/unlock-account` or manually update database:
```sql
UPDATE "User" 
SET "lockedUntil" = NULL, "failedLoginAttempts" = 0 
WHERE email = 'user@example.com';
```

### Issue: 2FA codes not working

**Solution:** Ensure server time is synchronized (NTP). TOTP relies on accurate time.

### Issue: Audit logs not appearing

**Solution:** Check database connection and ensure AuthLog model is in schema.

---

## 📚 Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [TOTP RFC 6238](https://tools.ietf.org/html/rfc6238)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

---

## 🤝 Support

For issues or questions:
1. Check this guide
2. Review test files in `scripts/`
3. Check console logs
4. Contact development team

---

**Last Updated:** 2025-10-21
**Version:** 1.0.0

