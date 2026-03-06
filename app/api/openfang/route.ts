// d:\openfang\Aeroeduvison-main\app\api\openfang\route.ts

import { NextRequest, NextResponse } from 'next/server';

const OPENFANG_URL = process.env.OPENFANG_API_URL || 'http://localhost:8080';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Proxy everything to /v1/chat/completions or specialized endpoints
    const endpoint = `${OPENFANG_URL}/v1/chat/completions`;
    
    // Prepare OpenAI compatible body
    const oaiBody = {
      model: body.agent || body.model || 'tutor',
      messages: body.messages || [{ role: 'user', content: body.message }],
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 2048,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.OPENFANG_API_KEY ? { 'Authorization': `Bearer ${process.env.OPENFANG_API_KEY}` } : {}),
      },
      body: JSON.stringify(oaiBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('OpenFang Proxy POST error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    if (action === 'list_agents') {
      const response = await fetch(`${OPENFANG_URL}/api/agents`);
      const data = await response.json();
      return NextResponse.json(data);
    }

    // Default: Health check proxy
    const response = await fetch(`${OPENFANG_URL}/api/health`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: String(error) },
      { status: 503 }
    );
  }
}
