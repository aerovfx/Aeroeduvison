import { NextRequest, NextResponse } from 'next/server';
import { getBullMQManager } from '@/lib/queue/bullmq';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { queueName, jobName, data, options } = await req.json();

    if (!queueName || !jobName || !data) {
      return NextResponse.json(
        { error: 'queueName, jobName, and data are required' },
        { status: 400 }
      );
    }

    const bullMQ = getBullMQManager();
    const jobId = await bullMQ.addJob(queueName, jobName, data, options);

    return NextResponse.json({
      success: true,
      jobId,
    });
  } catch (error) {
    console.error('Queue API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const queueName = searchParams.get('queue');
    const jobId = searchParams.get('jobId');

    if (!queueName) {
      return NextResponse.json(
        { error: 'queue parameter is required' },
        { status: 400 }
      );
    }

    const bullMQ = getBullMQManager();

    if (jobId) {
      // Get specific job status
      const status = await bullMQ.getJobStatus(queueName, jobId);
      if (!status) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, job: status });
    } else {
      // Get queue statistics
      const stats = await bullMQ.getQueueStats(queueName);
      return NextResponse.json({ success: true, stats });
    }
  } catch (error) {
    console.error('Queue API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

