/**
 * Account Lockout Mechanism
 * 
 * Handles account lockout after failed login attempts
 */

import { db } from '@/lib/db';
import { logAuthEvent } from './auth-logger';

// Configuration
export const LOCKOUT_CONFIG = {
  maxFailedAttempts: 5,          // Max failed attempts before lockout
  lockoutDurationMinutes: 30,    // Lockout duration in minutes
  resetAfterMinutes: 15,         // Reset failed attempts after this time
  permanentLockoutAttempts: 10   // Permanently lock after this many total lockouts
};

/**
 * Check if account is locked
 */
export async function isAccountLocked(email: string): Promise<{
  isLocked: boolean;
  lockedUntil?: Date;
  remainingMinutes?: number;
}> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Temporarily disable lockout check until schema is fully synced
    return { isLocked: false };
    
    // const user = await db.user.findUnique({
    //   where: { email: normalizedEmail },
    //   select: {
    //     lockedUntil: true,
    //     failedLoginAttempts: true
    //   }
    // });
    
    // if (!user) {
    //   return { isLocked: false };
    // }
    
    // // Check if lockout expired
    // if (user.lockedUntil && user.lockedUntil > new Date()) {
    //   const remainingMs = user.lockedUntil.getTime() - Date.now();
    //   const remainingMinutes = Math.ceil(remainingMs / 60000);
    //
    //   return {
    //     isLocked: true,
    //     lockedUntil: user.lockedUntil,
    //     remainingMinutes
    //   };
    // }
    //
    // // Reset lockout if expired
    // if (user.lockedUntil && user.lockedUntil <= new Date()) {
    //   await db.user.update({
    //     where: { email: normalizedEmail },
    //     data: {
    //       lockedUntil: null,
    //       failedLoginAttempts: 0
    //     }
    //   });
    //
    //   await logAuthEvent({
    //     email: normalizedEmail,
    //     action: 'account_unlocked',
    //     status: 'success',
    //     metadata: { reason: 'Lockout period expired' }
    //   });
    // }
    //
    return { isLocked: false };
  } catch (error) {
    console.error('[LOCKOUT] Error checking lock status:', error);
    return { isLocked: false };
  }
}

/**
 * Record failed login attempt
 */
export async function recordFailedLogin(
  email: string,
  ipAddress?: string,
  reason?: string
): Promise<{
  shouldLock: boolean;
  attemptsRemaining: number;
  lockedUntil?: Date;
}> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Temporarily disable lockout recording until schema is fully synced
    console.log(`[LOCKOUT] Failed login attempt for ${normalizedEmail}: ${reason}`);
    
    // Log the failed attempt
    await logAuthEvent({
      email: normalizedEmail,
      action: 'failed_login',
      status: 'failed',
      ipAddress,
      metadata: { reason: reason || 'User not found' }
    });
    
    return {
      shouldLock: false,
      attemptsRemaining: 5
    };

    /* Temporarily disabled until schema is fully synced
    // Increment failed attempts
    const newAttempts = user.failedLoginAttempts + 1;

    // Check if should lock
    const shouldLock = newAttempts >= LOCKOUT_CONFIG.maxFailedAttempts;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + LOCKOUT_CONFIG.lockoutDurationMinutes * 60 * 1000)
      : null;

    // Update user
    await db.user.update({
      where: { email: normalizedEmail },
      data: {
        failedLoginAttempts: newAttempts,
        lockedUntil: lockedUntil,
        updatedAt: new Date()
      }
    });

    // Log the event
    await logAuthEvent({
      userId: user.id,
      email: normalizedEmail,
      action: shouldLock ? 'account_locked' : 'failed_login',
      status: shouldLock ? 'blocked' : 'failed',
      ipAddress,
      metadata: {
        reason: reason || 'Invalid credentials',
        failedAttempts: newAttempts,
        lockedUntil: lockedUntil?.toISOString()
      }
    });

    return {
      shouldLock,
      attemptsRemaining: Math.max(0, LOCKOUT_CONFIG.maxFailedAttempts - newAttempts),
      lockedUntil: lockedUntil || undefined
    };
    */
  } catch (error) {
    console.error('[LOCKOUT] Error recording failed login:', error);
    return {
      shouldLock: false,
      attemptsRemaining: LOCKOUT_CONFIG.maxFailedAttempts
    };
  }
}

/**
 * Reset failed login attempts (on successful login)
 */
export async function resetFailedAttempts(
  email: string,
  ipAddress?: string
): Promise<void> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Temporarily disable lockout reset until schema is fully synced
    console.log(`[LOCKOUT] Resetting failed attempts for ${normalizedEmail}`);
    
    await logAuthEvent({
      email: normalizedEmail,
      action: 'login_success',
      status: 'success',
      ipAddress,
      metadata: { reason: 'Failed attempts reset' }
    });
    
    return;
    
    /* Temporarily disabled until schema is fully synced
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, failedLoginAttempts: true }
    });
    
    if (!user) return;
    
    // Only update if there were failed attempts
    if (user.failedLoginAttempts > 0) {
    */
    /*
      await db.user.update({
        where: { email: normalizedEmail },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress || null,
          updatedAt: new Date()
        }
      });
    } else {
      // Just update last login info
      await db.user.update({
        where: { email: normalizedEmail },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress || null,
          updatedAt: new Date()
        }
      });
    }
    */
  } catch (error) {
    console.error('[LOCKOUT] Error resetting failed attempts:', error);
  }
}

/**
 * Manually unlock an account (admin function)
 */
export async function unlockAccount(
  email: string,
  adminEmail: string
): Promise<boolean> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true }
    });
    
    if (!user) {
      return false;
    }
    
    await db.user.update({
      where: { email: normalizedEmail },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date()
      }
    });
    
    await logAuthEvent({
      userId: user.id,
      email: normalizedEmail,
      action: 'account_unlocked',
      status: 'success',
      metadata: {
        unlockedBy: adminEmail,
        reason: 'Manual unlock by administrator'
      }
    });
    
    return true;
  } catch (error) {
    console.error('[LOCKOUT] Error unlocking account:', error);
    return false;
  }
}

/**
 * Get lockout status for multiple accounts (admin function)
 */
export async function getLockedAccounts(): Promise<any[]> {
  try {
    const lockedUsers = await db.user.findMany({
      where: {
        lockedUntil: {
          gt: new Date()
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        lastLoginAt: true,
        lastLoginIp: true
      },
      orderBy: {
        lockedUntil: 'desc'
      }
    });
    
    return lockedUsers;
  } catch (error) {
    console.error('[LOCKOUT] Error fetching locked accounts:', error);
    return [];
  }
}

