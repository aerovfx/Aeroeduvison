import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { disable2FA } from '@/lib/two-factor';
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

    const ipAddress = getClientIp(req as any);
    const success = await disable2FA(session.user.id, ipAddress);

    if (success) {
      return NextResponse.json({
        success: true,
        message: '2FA disabled successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to disable 2FA' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[2FA_DISABLE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to disable 2FA', message: error.message },
      { status: 500 }
    );
  }
}

