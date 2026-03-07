import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllAuthLogs, getAuthStats } from '@/lib/auth-logger';

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

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || undefined;
    const status = searchParams.get('status') || undefined;
    const email = searchParams.get('email') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '100');
    
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    const filters = {
      action: action as any,
      status: status as any,
      email,
      startDate,
      endDate
    };

    const { logs, total } = await getAllAuthLogs(filters, page, pageSize);
    const stats = await getAuthStats(startDate, endDate);

    return NextResponse.json({
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      stats
    });
  } catch (error: any) {
    console.error('[AUTH_LOGS_API] Error:', error);
    return NextResponse.json(
      { error: 'Internal Error', message: error.message },
      { status: 500 }
    );
  }
}

