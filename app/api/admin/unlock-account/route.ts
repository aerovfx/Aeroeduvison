import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { unlockAccount, getLockedAccounts } from '@/lib/account-lockout';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email required' },
        { status: 400 }
      );
    }

    const success = await unlockAccount(email, session.user.email!);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Account unlocked successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to unlock account - user not found' },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error('[UNLOCK_ACCOUNT_API] Error:', error);
    return NextResponse.json(
      { error: 'Internal Error', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized - Admin access required' },
        { status: 403 }
      );
    }

    const lockedAccounts = await getLockedAccounts();

    return NextResponse.json({
      lockedAccounts,
      count: lockedAccounts.length
    });
  } catch (error: any) {
    console.error('[LOCKED_ACCOUNTS_API] Error:', error);
    return NextResponse.json(
      { error: 'Internal Error', message: error.message },
      { status: 500 }
    );
  }
}

