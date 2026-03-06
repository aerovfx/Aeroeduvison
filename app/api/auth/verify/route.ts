import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        new URL('/auth/login?error=InvalidToken', req.url)
      );
    }

    console.log('[VERIFY] Verifying token:', token.substring(0, 10) + '...');

    // Find verification token
    const verificationToken = await db.verificationToken.findUnique({
      where: { token }
    });

    if (!verificationToken) {
      console.log('[VERIFY] Token not found');
      return NextResponse.redirect(
        new URL('/auth/login?error=InvalidToken', req.url)
      );
    }

    // Check if token is expired
    if (verificationToken.expires < new Date()) {
      console.log('[VERIFY] Token expired');
      
      // Delete expired token
      await db.verificationToken.delete({
        where: { token }
      });

      return NextResponse.redirect(
        new URL('/auth/login?error=TokenExpired', req.url)
      );
    }

    console.log('[VERIFY] Token valid, activating user:', verificationToken.identifier);

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: verificationToken.identifier }
    });

    if (!user) {
      console.log('[VERIFY] User not found');
      return NextResponse.redirect(
        new URL('/auth/login?error=UserNotFound', req.url)
      );
    }

    // Update user - mark as verified
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('[VERIFY] User verified successfully:', user.email);

    // Delete used token
    await db.verificationToken.delete({
      where: { token }
    });

    console.log('[VERIFY] Token deleted');

    // Redirect to login with success message
    return NextResponse.redirect(
      new URL('/auth/login?verified=true', req.url)
    );

  } catch (error: any) {
    console.error('[VERIFY] Error:', error);
    return NextResponse.redirect(
      new URL('/auth/login?error=VerificationFailed', req.url)
    );
  }
}

