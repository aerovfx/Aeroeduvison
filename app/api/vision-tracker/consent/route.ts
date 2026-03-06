import { NextRequest, NextResponse } from 'next/server';

interface ConsentRequest {
  student_id: string;
  anonymous_id: string;
  consent_given: boolean;
  parent_consent: boolean;
  data_retention_days: number;
  consent_type: 'camera' | 'processing' | 'storage';
}

interface StudentConsent {
  student_id: string;
  anonymous_id: string;
  consent_given: boolean;
  consent_date: string;
  parent_consent: boolean;
  data_retention_days: number;
  consent_type: string;
  ip_address?: string;
  user_agent?: string;
}

// Mock database - in production, use proper database with encryption
const consentDatabase: StudentConsent[] = [];

// POST /api/vision-tracker/consent - Record consent
export async function POST(request: NextRequest) {
  try {
    const body: ConsentRequest = await request.json();
    
    // Validate required fields
    if (!body.student_id || !body.anonymous_id || typeof body.consent_given !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: student_id, anonymous_id, consent_given' },
        { status: 400 }
      );
    }

    // Get client info for audit
    const ip_address = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const user_agent = request.headers.get('user-agent') || 'unknown';

    // Create consent record
    const consentRecord: StudentConsent = {
      student_id: body.student_id,
      anonymous_id: body.anonymous_id,
      consent_given: body.consent_given,
      consent_date: new Date().toISOString(),
      parent_consent: body.parent_consent || false,
      data_retention_days: body.data_retention_days || 30,
      consent_type: body.consent_type || 'camera',
      ip_address,
      user_agent
    };

    // Check if consent already exists
    const existingIndex = consentDatabase.findIndex(
      c => c.student_id === body.student_id && c.consent_type === body.consent_type
    );

    if (existingIndex >= 0) {
      // Update existing consent
      consentDatabase[existingIndex] = consentRecord;
    } else {
      // Add new consent
      consentDatabase.push(consentRecord);
    }

    // Log for audit (in production, use proper audit logging)
    console.log(`Consent ${body.consent_given ? 'granted' : 'revoked'} for student ${body.student_id}`);

    return NextResponse.json({
      success: true,
      message: `Consent ${body.consent_given ? 'granted' : 'revoked'} successfully`,
      consent_id: `consent_${Date.now()}`,
      timestamp: consentRecord.consent_date
    });

  } catch (error) {
    console.error('Error recording consent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/vision-tracker/consent - Get consent status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const anonymousId = searchParams.get('anonymous_id');
    const consentType = searchParams.get('consent_type');

    // Filter consents
    let filteredConsents = consentDatabase;

    if (studentId) {
      filteredConsents = filteredConsents.filter(c => c.student_id === studentId);
    }

    if (anonymousId) {
      filteredConsents = filteredConsents.filter(c => c.anonymous_id === anonymousId);
    }

    if (consentType) {
      filteredConsents = filteredConsents.filter(c => c.consent_type === consentType);
    }

    // Remove sensitive information for response
    const safeConsents = filteredConsents.map(consent => ({
      student_id: consent.student_id,
      anonymous_id: consent.anonymous_id,
      consent_given: consent.consent_given,
      consent_date: consent.consent_date,
      parent_consent: consent.parent_consent,
      data_retention_days: consent.data_retention_days,
      consent_type: consent.consent_type
    }));

    return NextResponse.json({
      success: true,
      data: safeConsents,
      total: safeConsents.length
    });

  } catch (error) {
    console.error('Error fetching consent data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/vision-tracker/consent - Revoke consent
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const consentType = searchParams.get('consent_type');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Missing required parameter: student_id' },
        { status: 400 }
      );
    }

    // Find and update consent
    const consentIndex = consentDatabase.findIndex(
      c => c.student_id === studentId && 
           (consentType ? c.consent_type === consentType : true)
    );

    if (consentIndex === -1) {
      return NextResponse.json(
        { error: 'Consent not found' },
        { status: 404 }
      );
    }

    // Revoke consent
    consentDatabase[consentIndex].consent_given = false;
    consentDatabase[consentIndex].consent_date = new Date().toISOString();

    // Log for audit
    console.log(`Consent revoked for student ${studentId}`);

    return NextResponse.json({
      success: true,
      message: 'Consent revoked successfully',
      timestamp: consentDatabase[consentIndex].consent_date
    });

  } catch (error) {
    console.error('Error revoking consent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

