import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enable2FA } from '@/lib/two-factor';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { secret, qrCodeUrl, backupCodes } = await enable2FA(session.user.id);

    return NextResponse.json({
      success: true,
      secret,
      qrCodeUrl,
      backupCodes
    });
  } catch (error: any) {
    console.error('[2FA_SETUP] Error:', error);
    return NextResponse.json(
      { error: 'Failed to setup 2FA', message: error.message },
      { status: 500 }
    );
  }
}

