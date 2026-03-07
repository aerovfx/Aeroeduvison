import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiLogger } from '@/lib/logging-simple';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update user's last activity timestamp
    const updatedUser = await db.user.update({
      where: { email: session.user.email },
      data: { updatedAt: new Date() },
      select: {
        id: true,
        name: true,
        email: true,
        updatedAt: true
      }
    });

    apiLogger.info('User activity updated', {
      metadata: {
        userId: updatedUser.id,
        userEmail: updatedUser.email,
        lastActivity: updatedUser.updatedAt
      }
    });

    return NextResponse.json({ 
      success: true, 
      lastActivity: updatedUser.updatedAt 
    });

  } catch (error) {
    apiLogger.error('Error updating user activity', {
      metadata: { errorMessage: (error as Error).message }
    }, error as Error);
    return NextResponse.json(
      { error: 'Failed to update user activity' },
      { status: 500 }
    );
  }
}
