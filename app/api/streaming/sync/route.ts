import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiLogger } from '@/lib/logging-simple';
import { sleep, encodeStreamData } from '@/lib/utils';

/**
 * API Streaming: /api/streaming/sync
 * 
 * Client nhận dữ liệu từng phần (chunks)
 * - Import/Export dữ liệu LMS
 * - Trả từng chunk để tránh timeout
 * - Real-time progress updates
 * 
 * Use cases:
 * - Bulk data import/export
 * - Large dataset processing
 * - Real-time progress tracking
 * - AI recommendations streaming
 */

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return new Response('Unauthorized', { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, schoolId: true }
    });

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const operation = searchParams.get('operation') || 'export';
    const moduleNameName = searchParams.get('moduleName') || 'all';

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial metadata
          const initialData = {
            type: 'metadata',
            operation,
            moduleName,
            timestamp: new Date().toISOString(),
            userId: user.id
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));
          await sleep(100); // Small delay for better UX

          if (operation === 'export') {
            await streamExport(controller, encoder, user, moduleName);
          } else if (operation === 'import') {
            await streamImport(controller, encoder, user, moduleName);
          } else if (operation === 'sync') {
            await streamSync(controller, encoder, user, moduleName);
          }

          // Send completion signal
          const completionData = {
            type: 'complete',
            message: 'Operation completed successfully',
            timestamp: new Date().toISOString()
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionData)}\n\n`));
          controller.close();

        } catch (error) {
          const errorData = {
            type: 'error',
            message: (error as Error).message,
            timestamp: new Date().toISOString()
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    apiLogger.error('Streaming API: Error in sync operation', {
      metadata: { errorMessage: (error as Error).message }
    }, error as Error);
    
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return new Response('Unauthorized', { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, schoolId: true }
    });

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    const body = await req.json();
    const { operation, data, moduleName } = body;

    // Create streaming response for POST operations
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial metadata
          const initialData = {
            type: 'metadata',
            operation,
            moduleName,
            timestamp: new Date().toISOString(),
            userId: user.id
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));
          await sleep(100);

          if (operation === 'bulk_import') {
            await streamBulkImport(controller, encoder, user, data);
          } else if (operation === 'bulk_update') {
            await streamBulkUpdate(controller, encoder, user, data);
          }

          // Send completion signal
          const completionData = {
            type: 'complete',
            message: 'Bulk operation completed successfully',
            timestamp: new Date().toISOString()
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionData)}\n\n`));
          controller.close();

        } catch (error) {
          const errorData = {
            type: 'error',
            message: (error as Error).message,
            timestamp: new Date().toISOString()
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    apiLogger.error('Streaming API: Error in POST operation', {
      metadata: { errorMessage: (error as Error).message }
    }, error as Error);
    
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Helper functions for streaming operations

async function streamExport(controller: ReadableStreamDefaultController, encoder: TextEncoder, user: any, moduleName: string) {
  const moduleNames = moduleName === 'all' ? ['courses', 'users', 'assignments', 'quizzes'] : [moduleName];
  
  for (const mod of moduleNames) {
    // Send progress update
    const progressData = {
      type: 'progress',
      moduleName: mod,
      message: `Exporting ${mod}...`,
      progress: 0
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`));
    
    let data: any[] = [];
    
    switch (mod) {
      case 'courses':
        data = await db.course.findMany({
          where: { schoolId: user.schoolId },
          include: { teacher: true, _count: { select: { students: true } } }
        });
        break;
      case 'users':
        data = await db.user.findMany({
          where: { schoolId: user.schoolId },
          select: { id: true, name: true, email: true, role: true, createdAt: true }
        });
        break;
      case 'assignments':
        data = await db.assignment.findMany({
          where: { course: { schoolId: user.schoolId } },
          include: { course: true, _count: { select: { submissions: true } } }
        });
        break;
      case 'quizzes':
        data = await db.quiz.findMany({
          where: { course: { schoolId: user.schoolId } },
          include: { course: true, _count: { select: { attempts: true } } }
        });
        break;
    }
    
    // Send data in chunks
    const chunkSize = 10;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const chunkData = {
        type: 'data',
        moduleName: mod,
        chunk: chunk,
        progress: Math.round(((i + chunkSize) / data.length) * 100)
      };
      
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunkData)}\n\n`));
      await sleep(50); // Small delay between chunks
    }
    
    // Send completion for this moduleName
    const moduleNameCompleteData = {
      type: 'moduleName_complete',
      moduleName: mod,
      count: data.length,
      message: `Exported ${data.length} ${mod}`
    };
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(moduleNameCompleteData)}\n\n`));
  }
}

async function streamImport(controller: ReadableStreamDefaultController, encoder: TextEncoder, user: any, moduleName: string) {
  // Simulate import process with progress updates
  const steps = ['validating', 'processing', 'importing', 'finalizing'];
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const progressData = {
      type: 'progress',
      step,
      message: `Importing ${moduleName}: ${step}...`,
      progress: Math.round(((i + 1) / steps.length) * 100)
    };
    
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`));
    await sleep(500); // Simulate processing time
  }
}

async function streamSync(controller: ReadableStreamDefaultController, encoder: TextEncoder, user: any, moduleName: string) {
  // Simulate sync process
  const syncSteps = [
    { step: 'fetching', message: 'Fetching data from external sources...' },
    { step: 'comparing', message: 'Comparing with local data...' },
    { step: 'updating', message: 'Updating local database...' },
    { step: 'validating', message: 'Validating changes...' }
  ];
  
  for (let i = 0; i < syncSteps.length; i++) {
    const { step, message } = syncSteps[i];
    const progressData = {
      type: 'progress',
      step,
      message,
      progress: Math.round(((i + 1) / syncSteps.length) * 100)
    };
    
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`));
    await sleep(300);
  }
}

async function streamBulkImport(controller: ReadableStreamDefaultController, encoder: TextEncoder, user: any, data: any[]) {
  const batchSize = 5;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    // Process batch
    const batchData = {
      type: 'batch_progress',
      batch: i / batchSize + 1,
      totalBatches: Math.ceil(data.length / batchSize),
      processed: i + batch.length,
      total: data.length,
      progress: Math.round(((i + batch.length) / data.length) * 100)
    };
    
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(batchData)}\n\n`));
    await sleep(200); // Simulate processing time
  }
}

async function streamBulkUpdate(controller: ReadableStreamDefaultController, encoder: TextEncoder, user: any, data: any[]) {
  // Similar to bulk import but for updates
  const batchSize = 5;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const batchData = {
      type: 'batch_progress',
      batch: i / batchSize + 1,
      totalBatches: Math.ceil(data.length / batchSize),
      processed: i + batch.length,
      total: data.length,
      progress: Math.round(((i + batch.length) / data.length) * 100)
    };
    
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(batchData)}\n\n`));
    await sleep(200);
  }
}
