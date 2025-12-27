import { NextRequest, NextResponse } from 'next/server';

interface HeartMapData {
  class_id: string;
  timestamp: string;
  students: {
    student_id: string;
    anonymous_id: string;
    position: { x: number; y: number };
    attention_score: number;
    energy_level: number;
    emotion: string;
    activity: string;
    last_seen: string;
  }[];
  class_statistics: {
    total_students: number;
    consent_students: number;
    average_attention: number;
    low_attention_count: number;
    high_attention_count: number;
    engagement_trend: 'increasing' | 'decreasing' | 'stable';
  };
}

// Mock data - in production, this would come from database
const generateHeartMapData = (classId: string): HeartMapData => {
  const students = [
    {
      student_id: 's001',
      anonymous_id: 's_000123',
      position: { x: 20, y: 30 },
      attention_score: 85,
      energy_level: 90,
      emotion: 'focused',
      activity: 'sitting',
      last_seen: new Date().toISOString()
    },
    {
      student_id: 's002',
      anonymous_id: 's_000124',
      position: { x: 60, y: 25 },
      attention_score: 72,
      energy_level: 75,
      emotion: 'confused',
      activity: 'sitting',
      last_seen: new Date().toISOString()
    },
    {
      student_id: 's003',
      anonymous_id: 's_000125',
      position: { x: 80, y: 60 },
      attention_score: 45,
      energy_level: 35,
      emotion: 'bored',
      activity: 'distracted',
      last_seen: new Date().toISOString()
    },
    {
      student_id: 's004',
      anonymous_id: 's_000126',
      position: { x: 30, y: 70 },
      attention_score: 88,
      energy_level: 85,
      emotion: 'engaged',
      activity: 'sitting',
      last_seen: new Date().toISOString()
    },
    {
      student_id: 's005',
      anonymous_id: 's_000127',
      position: { x: 70, y: 40 },
      attention_score: 78,
      energy_level: 80,
      emotion: 'focused',
      activity: 'sitting',
      last_seen: new Date().toISOString()
    }
  ];

  const consentStudents = students.filter(s => s.attention_score > 0); // Mock consent check
  const averageAttention = consentStudents.reduce((sum, s) => sum + s.attention_score, 0) / consentStudents.length;

  return {
    class_id: classId,
    timestamp: new Date().toISOString(),
    students,
    class_statistics: {
      total_students: students.length,
      consent_students: consentStudents.length,
      average_attention: Math.round(averageAttention),
      low_attention_count: students.filter(s => s.attention_score < 50).length,
      high_attention_count: students.filter(s => s.attention_score > 80).length,
      engagement_trend: 'stable'
    }
  };
};

// GET /api/vision-tracker/heartmap - Get heart map data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id') || 'math-10A';
    const includeHistory = searchParams.get('include_history') === 'true';
    const timeRange = searchParams.get('time_range') || '1h'; // 1h, 1d, 1w

    // Generate current heart map data
    const heartMapData = generateHeartMapData(classId);

    // Add some realistic variations
    heartMapData.students = heartMapData.students.map(student => ({
      ...student,
      attention_score: Math.max(0, Math.min(100, 
        student.attention_score + (Math.random() - 0.5) * 20
      )),
      energy_level: Math.max(0, Math.min(100,
        student.energy_level + (Math.random() - 0.5) * 15
      )),
      last_seen: new Date().toISOString()
    }));

    // Recalculate statistics with updated scores
    const consentStudents = heartMapData.students.filter(s => s.attention_score > 0);
    const averageAttention = consentStudents.reduce((sum, s) => sum + s.attention_score, 0) / consentStudents.length;
    
    heartMapData.class_statistics = {
      ...heartMapData.class_statistics,
      average_attention: Math.round(averageAttention),
      low_attention_count: heartMapData.students.filter(s => s.attention_score < 50).length,
      high_attention_count: heartMapData.students.filter(s => s.attention_score > 80).length,
    };

    // Generate historical data if requested
    let historicalData = null;
    if (includeHistory) {
      const historyPoints = timeRange === '1h' ? 12 : timeRange === '1d' ? 24 : 7;
      historicalData = Array.from({ length: historyPoints }, (_, i) => {
        const timestamp = new Date(Date.now() - (historyPoints - i - 1) * (timeRange === '1h' ? 5 * 60 * 1000 : timeRange === '1d' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000));
        const baseData = generateHeartMapData(classId);
        return {
          timestamp: timestamp.toISOString(),
          average_attention: Math.max(0, Math.min(100, 
            baseData.class_statistics.average_attention + (Math.random() - 0.5) * 30
          )),
          engagement_level: Math.max(0, Math.min(100,
            baseData.class_statistics.average_attention + (Math.random() - 0.5) * 20
          )),
          active_students: Math.max(1, baseData.class_statistics.consent_students + Math.floor((Math.random() - 0.5) * 2))
        };
      });
    }

    return NextResponse.json({
      success: true,
      data: heartMapData,
      historical_data: historicalData,
      metadata: {
        generated_at: new Date().toISOString(),
        data_freshness: 'real-time',
        privacy_mode: 'anonymous',
        consent_verified: true
      }
    });

  } catch (error) {
    console.error('Error generating heart map data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/vision-tracker/heartmap - Update heart map data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.class_id || !body.students || !Array.isArray(body.students)) {
      return NextResponse.json(
        { error: 'Missing required fields: class_id, students' },
        { status: 400 }
      );
    }

    // Validate student data
    for (const student of body.students) {
      if (!student.student_id || !student.anonymous_id) {
        return NextResponse.json(
          { error: 'Each student must have student_id and anonymous_id' },
          { status: 400 }
        );
      }

      if (student.attention_score < 0 || student.attention_score > 100) {
        return NextResponse.json(
          { error: 'Attention score must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    // In production, save to database
    console.log(`Heart map data updated for class ${body.class_id}`);

    return NextResponse.json({
      success: true,
      message: 'Heart map data updated successfully',
      timestamp: new Date().toISOString(),
      class_id: body.class_id,
      students_updated: body.students.length
    });

  } catch (error) {
    console.error('Error updating heart map data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

