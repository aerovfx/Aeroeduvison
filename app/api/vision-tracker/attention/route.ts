import { NextRequest, NextResponse } from 'next/server';

interface AttentionEvent {
  class_id: string;
  student_anonymous_id: string;
  timestamp: string;
  attention_score: number;
  gaze_on_screen_prob: number;
  head_pose: {
    yaw: number;
    pitch: number;
    roll: number;
  };
  activity: string;
  emotion: string;
  frame_snapshot_id?: string;
}

interface StudentConsent {
  student_id: string;
  anonymous_id: string;
  consent_given: boolean;
  consent_date: string;
  parent_consent: boolean;
  data_retention_days: number;
}

// Mock database - in production, use proper database
const attentionEvents: AttentionEvent[] = [];
const studentConsents: StudentConsent[] = [
  {
    student_id: 's001',
    anonymous_id: 's_000123',
    consent_given: true,
    consent_date: '2024-01-15T00:00:00Z',
    parent_consent: true,
    data_retention_days: 30
  },
  {
    student_id: 's002',
    anonymous_id: 's_000124',
    consent_given: true,
    consent_date: '2024-01-15T00:00:00Z',
    parent_consent: true,
    data_retention_days: 30
  },
  {
    student_id: 's003',
    anonymous_id: 's_000125',
    consent_given: false,
    consent_date: '2024-01-15T00:00:00Z',
    parent_consent: false,
    data_retention_days: 0
  }
];

// POST /api/vision-tracker/attention - Record attention event
export async function POST(request: NextRequest) {
  try {
    const body: AttentionEvent = await request.json();
    
    // Validate required fields
    if (!body.class_id || !body.student_anonymous_id || !body.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: class_id, student_anonymous_id, timestamp' },
        { status: 400 }
      );
    }

    // Check consent
    const consent = studentConsents.find(
      c => c.anonymous_id === body.student_anonymous_id
    );
    
    if (!consent || !consent.consent_given) {
      return NextResponse.json(
        { error: 'No consent found for student' },
        { status: 403 }
      );
    }

    // Validate attention score
    if (body.attention_score < 0 || body.attention_score > 100) {
      return NextResponse.json(
        { error: 'Attention score must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Add timestamp if not provided
    if (!body.timestamp) {
      body.timestamp = new Date().toISOString();
    }

    // Store event
    attentionEvents.push(body);

    // Clean up old events (keep last 1000)
    if (attentionEvents.length > 1000) {
      attentionEvents.splice(0, attentionEvents.length - 1000);
    }

    // Log for audit (in production, use proper logging)
    console.log(`Attention event recorded for ${body.student_anonymous_id}: ${body.attention_score}%`);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Attention event recorded',
        event_id: `evt_${Date.now()}`,
        timestamp: body.timestamp
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error recording attention event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/vision-tracker/attention - Get attention data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');
    const studentId = searchParams.get('student_id');
    const startTime = searchParams.get('start_time');
    const endTime = searchParams.get('end_time');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Filter events
    let filteredEvents = attentionEvents;

    if (classId) {
      filteredEvents = filteredEvents.filter(e => e.class_id === classId);
    }

    if (studentId) {
      filteredEvents = filteredEvents.filter(e => e.student_anonymous_id === studentId);
    }

    if (startTime) {
      const start = new Date(startTime);
      filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) >= start);
    }

    if (endTime) {
      const end = new Date(endTime);
      filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) <= end);
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit results
    const limitedEvents = filteredEvents.slice(0, limit);

    // Calculate statistics
    const stats = {
      total_events: limitedEvents.length,
      average_attention: limitedEvents.length > 0 
        ? limitedEvents.reduce((sum, e) => sum + e.attention_score, 0) / limitedEvents.length 
        : 0,
      low_attention_count: limitedEvents.filter(e => e.attention_score < 30).length,
      high_attention_count: limitedEvents.filter(e => e.attention_score > 80).length,
      unique_students: new Set(limitedEvents.map(e => e.student_anonymous_id)).size
    };

    return NextResponse.json({
      success: true,
      data: limitedEvents,
      statistics: stats,
      pagination: {
        limit,
        total: filteredEvents.length,
        has_more: filteredEvents.length > limit
      }
    });

  } catch (error) {
    console.error('Error fetching attention data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

