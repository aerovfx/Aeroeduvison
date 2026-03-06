import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`http://localhost:8014/api/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('MotionSim API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Backend not available',
        message: 'MotionSim backend is not running on port 8014'
      },
      { status: 503 }
    );
  }
}

export async function GET() {
  try {
    const response = await fetch(`http://localhost:8014/api/health`);
    
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Backend not available',
        message: 'MotionSim backend is not running on port 8014'
      },
      { status: 503 }
    );
  }
}