import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verify2FASetup, verify2FAToken } from '@/lib/two-factor';
import { getClientIp } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { token, isSetup } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
        { status: 400 }
      );
    }

    const ipAddress = getClientIp(req as any);

    let isValid = false;
    if (isSetup) {
      // Verifying setup
      isValid = await verify2FASetup(session.user.id, token, ipAddress);
    } else {
      // Verifying login
      isValid = await verify2FAToken(session.user.id, token, ipAddress);
    }

    if (isValid) {
      return NextResponse.json({
        success: true,
        message: '2FA verified successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid 2FA code' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[2FA_VERIFY] Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA', message: error.message },
      { status: 500 }
    );
  }
}

