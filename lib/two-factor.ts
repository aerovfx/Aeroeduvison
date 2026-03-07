/**
 * Two-Factor Authentication (2FA) System
 * 
 * Implements TOTP-based 2FA using authenticator apps
 */

import crypto from 'crypto';
import { db } from '@/lib/db';
import { logAuthEvent } from './auth-logger';

/**
 * Simple TOTP implementation (Time-based One-Time Password)
 * Based on RFC 6238
 */

const TOTP_WINDOW = 30; // 30 seconds
const TOTP_DIGITS = 6;  // 6-digit codes

/**
 * Generate base32 secret for TOTP
 */
function generateBase32Secret(): string {
  const buffer = crypto.randomBytes(20);
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  
  for (let i = 0; i < buffer.length; i++) {
    secret += base32Chars[buffer[i] % 32];
  }
  
  return secret;
}

/**
 * Decode base32 to buffer
 */
function base32ToBuffer(base32: string): Buffer {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of base32.toUpperCase()) {
    const index = base32Chars.indexOf(char);
    if (index === -1) continue;
    
    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate TOTP code
 */
function generateTOTP(secret: string, timeStep: number = Math.floor(Date.now() / 1000 / TOTP_WINDOW)): string {
  const key = base32ToBuffer(secret);
  const time = Buffer.alloc(8);
  time.writeBigInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(time);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0xf;
  const binary = ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Verify TOTP code
 */
function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  const timeStep = Math.floor(Date.now() / 1000 / TOTP_WINDOW);

  for (let i = -window; i <= window; i++) {
    const expected = generateTOTP(secret, timeStep + i);
    if (expected === token) {
      return true;
    }
  }

  return false;
}

/**
 * Generate backup codes
 */
function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
    codes.push(formatted);
  }
  
  return codes;
}

/**
 * Hash backup code for storage
 */
function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Enable 2FA for a user
 */
export async function enable2FA(userId: string): Promise<{
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate secret and backup codes
    const secret = generateBase32Secret();
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(hashBackupCode);

    // Generate QR code URL (for authenticator apps)
    const appName = 'LMS Math';
    const qrCodeUrl = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(appName)}`;

    // Save to database (not yet enabled until verified)
    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
        twoFactorBackupCodes: hashedBackupCodes,
        twoFactorEnabled: false, // Will be enabled after verification
        updatedAt: new Date()
      }
    });

    return {
      secret,
      qrCodeUrl,
      backupCodes
    };
  } catch (error) {
    console.error('[2FA] Error enabling 2FA:', error);
    throw error;
  }
}

/**
 * Verify and activate 2FA
 */
export async function verify2FASetup(
  userId: string,
  token: string,
  ipAddress?: string
): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        twoFactorSecret: true,
        twoFactorEnabled: true
      }
    });

    if (!user || !user.twoFactorSecret) {
      return false;
    }

    // Verify the token
    const isValid = verifyTOTP(user.twoFactorSecret, token);

    if (isValid) {
      // Enable 2FA
      await db.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          updatedAt: new Date()
        }
      });

      // Log the event
      await logAuthEvent({
        userId: user.id,
        email: user.email,
        action: '2fa_enabled',
        status: 'success',
        ipAddress,
        metadata: { method: 'TOTP' }
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error('[2FA] Error verifying 2FA setup:', error);
    return false;
  }
}

/**
 * Verify 2FA token during login
 */
export async function verify2FAToken(
  userId: string,
  token: string,
  ipAddress?: string
): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
        twoFactorBackupCodes: true
      }
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    // Try TOTP verification first
    const isTOTPValid = verifyTOTP(user.twoFactorSecret, token);

    if (isTOTPValid) {
      await logAuthEvent({
        userId: user.id,
        email: user.email,
        action: '2fa_verified',
        status: 'success',
        ipAddress,
        metadata: { method: 'TOTP' }
      });
      return true;
    }

    // Try backup codes
    const hashedToken = hashBackupCode(token);
    const backupCodeIndex = user.twoFactorBackupCodes.indexOf(hashedToken);

    if (backupCodeIndex !== -1) {
      // Remove used backup code
      const updatedBackupCodes = [...user.twoFactorBackupCodes];
      updatedBackupCodes.splice(backupCodeIndex, 1);

      await db.user.update({
        where: { id: userId },
        data: {
          twoFactorBackupCodes: updatedBackupCodes,
          updatedAt: new Date()
        }
      });

      await logAuthEvent({
        userId: user.id,
        email: user.email,
        action: '2fa_verified',
        status: 'success',
        ipAddress,
        metadata: { 
          method: 'backup_code',
          remainingBackupCodes: updatedBackupCodes.length
        }
      });

      return true;
    }

    // Log failed verification
    await logAuthEvent({
      userId: user.id,
      email: user.email,
      action: '2fa_failed',
      status: 'failed',
      ipAddress,
      metadata: { reason: 'Invalid token' }
    });

    return false;
  } catch (error) {
    console.error('[2FA] Error verifying 2FA token:', error);
    return false;
  }
}

/**
 * Disable 2FA for a user
 */
export async function disable2FA(
  userId: string,
  ipAddress?: string
): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    });

    if (!user) {
      return false;
    }

    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
        updatedAt: new Date()
      }
    });

    await logAuthEvent({
      userId: user.id,
      email: user.email,
      action: '2fa_disabled',
      status: 'success',
      ipAddress,
      metadata: { reason: 'User requested' }
    });

    return true;
  } catch (error) {
    console.error('[2FA] Error disabling 2FA:', error);
    return false;
  }
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  try {
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(hashBackupCode);

    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodes: hashedBackupCodes,
        updatedAt: new Date()
      }
    });

    return backupCodes;
  } catch (error) {
    console.error('[2FA] Error regenerating backup codes:', error);
    throw error;
  }
}

/**
 * Check if user has 2FA enabled
 */
export async function is2FAEnabled(userId: string): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true }
    });

    return user?.twoFactorEnabled || false;
  } catch (error) {
    console.error('[2FA] Error checking 2FA status:', error);
    return false;
  }
}

