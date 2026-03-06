// d:\openfang\Aeroeduvison-main\app\api\openfang\route.ts

import { NextRequest, NextResponse } from 'next/server';
import { OpenFangClient, OpenFangError } from '@/lib/openfang';

const client = new OpenFangClient({
  baseUrl: process.env.OPENFANG_API_URL || 'http://localhost:8080',
  apiKey: process.env.OPENFANG_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.message && !body.messages) {
      return NextResponse.json(
        { error: 'Missing message or messages field' },
        { status: 400 }
      );
    }

    let result;

    if (body.messages) {
      result = await client.chatWithHistory(body.messages, {
        agent: body.agent,
        temperature: body.temperature,
        maxTokens: body.max_tokens,
      });
    } else {
      result = await client.chat(body.message, {
        agent: body.agent,
        temperature: body.temperature,
        maxTokens: body.max_tokens,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('OpenFang API error:', error);

    if (error instanceof OpenFangError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to communicate with OpenFang', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Health check proxy
    const response = await fetch(`${process.env.OPENFANG_API_URL || 'http://localhost:8080'}/api/health`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: String(error) },
      { status: 503 }
    );
  }
}
