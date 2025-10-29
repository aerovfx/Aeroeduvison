import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email/verification-email';
import { validatePassword } from '@/lib/password-validation';
import { logAuthEvent } from '@/lib/auth-logger';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, role } = body;

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { 
          error: 'Password does not meet requirements',
          errors: passwordValidation.errors
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    console.log('[REGISTER] Creating new user:', email);

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hours

    // Create user with pending status
    const userId = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    const user = await db.user.create({
      data: {
        id: userId,
        email,
        name,
        password: hashedPassword,
        role: role || 'STUDENT',
        emailVerified: null, // Not verified yet
        updatedAt: new Date()
      }
    });

    console.log('[REGISTER] User created:', user.email, '(ID:', user.id, ')');

    // Create verification token in database
    await db.verificationToken.create({
      data: {
        identifier: user.email,
        token: verificationToken,
        expires: tokenExpiry
      }
    });

    console.log('[REGISTER] Verification token created');

    // Send verification email
    await sendVerificationEmail({
      email: user.email,
      name: user.name || 'User',
      verificationToken
    });

    console.log('[REGISTER] Verification email sent');

    // Log registration event
    await logAuthEvent({
      userId: user.id,
      email: user.email,
      action: 'register',
      status: 'success',
      metadata: { role: user.role }
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('[REGISTER] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create account',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
