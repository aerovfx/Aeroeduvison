import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { db } from '@/lib/db';
import { 
  isAccountLocked, 
  recordFailedLogin, 
  resetFailedAttempts 
} from '@/lib/account-lockout';
import { logAuthEvent } from '@/lib/auth-logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 * Returns user data and session token via NextAuth
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, callbackUrl } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log('[LOGIN] Login attempt:', email);

    // Normalize email to lowercase for case-insensitive comparison
    const normalizedEmail = email.toLowerCase().trim();

    // Check if account is locked
    const lockStatus = await isAccountLocked(normalizedEmail);
    if (lockStatus.isLocked) {
      console.log('[LOGIN] Account locked:', normalizedEmail);
      
      await logAuthEvent({
        email: normalizedEmail,
        action: 'failed_login',
        status: 'blocked',
        metadata: { 
          reason: 'Account locked',
          lockedUntil: lockStatus.lockedUntil?.toISOString(),
          remainingMinutes: lockStatus.remainingMinutes
        }
      });

      return NextResponse.json(
        { 
          error: 'Account is temporarily locked due to too many failed login attempts',
          lockedUntil: lockStatus.lockedUntil?.toISOString(),
          remainingMinutes: lockStatus.remainingMinutes
        },
        { status: 423 } // 423 Locked
      );
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        password: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        emailVerified: true,
        isActive: true,
      }
    });

    if (!user) {
      console.log('[LOGIN] User not found:', normalizedEmail);
      
      await recordFailedLogin(normalizedEmail, undefined, 'User not found');
      await logAuthEvent({
        email: normalizedEmail,
        action: 'failed_login',
        status: 'failed',
        metadata: { reason: 'User not found' }
      });

      // Don't reveal if user exists or not (security best practice)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user has password (OAuth-only accounts)
    if (!user.password) {
      console.log('[LOGIN] User has no password (OAuth account):', normalizedEmail);
      
      await recordFailedLogin(normalizedEmail, user.id, 'No password set (OAuth account)');
      await logAuthEvent({
        userId: user.id,
        email: normalizedEmail,
        action: 'failed_login',
        status: 'failed',
        metadata: { reason: 'No password set (OAuth account)' }
      });

      return NextResponse.json(
        { error: 'Please sign in with your social account (Google)' },
        { status: 401 }
      );
    }

    // Check if account is active
    if (user.isActive === false) {
      console.log('[LOGIN] Account deactivated:', normalizedEmail);
      
      await logAuthEvent({
        userId: user.id,
        email: normalizedEmail,
        action: 'failed_login',
        status: 'blocked',
        metadata: { reason: 'Account deactivated' }
      });

      return NextResponse.json(
        { error: 'Account is deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('[LOGIN] Invalid password:', normalizedEmail);
      
      await recordFailedLogin(normalizedEmail, user.id, 'Invalid password');
      await logAuthEvent({
        userId: user.id,
        email: normalizedEmail,
        action: 'failed_login',
        status: 'failed',
        metadata: { reason: 'Invalid password' }
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      // 2FA is enabled - return success with 2FA required flag
      console.log('[LOGIN] 2FA required for:', normalizedEmail);
      
      return NextResponse.json({
        success: true,
        requires2FA: true,
        userId: user.id,
        message: 'Two-factor authentication required'
      }, { status: 200 });
    }

    // Success - reset failed attempts
    await resetFailedAttempts(normalizedEmail);
    
    // Log successful login
    await logAuthEvent({
      userId: user.id,
      email: normalizedEmail,
      action: 'login',
      status: 'success',
      metadata: { 
        method: 'credentials',
        role: user.role
      }
    });

    console.log('[LOGIN] Login successful:', normalizedEmail);

    // Return user data (client will need to create session via NextAuth)
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      // Include callbackUrl if provided
      ...(callbackUrl && { callbackUrl }),
      // Note: Client should call NextAuth signIn() after this to create session
      nextStep: 'Call NextAuth signIn("credentials") to create session'
    }, { status: 200 });

  } catch (error: any) {
    console.error('[LOGIN] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process login request',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/login
 * Check login status - returns current session if logged in
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { 
          loggedIn: false,
          message: 'Not authenticated' 
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      loggedIn: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        role: session.user.role,
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[LOGIN] GET Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check login status',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

