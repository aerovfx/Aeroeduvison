import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// API route to serve labs index.json
// This avoids issues with Next.js 15 static file serving
export async function GET() {
  try {
    // Read the JSON file from public directory
    const filePath = join(process.cwd(), 'public', 'labs', 'index.json');
    const fileContents = readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContents);
    
    // Return JSON response with proper headers
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error loading labs index:', error);
    return NextResponse.json(
      { error: 'Failed to load labs index', simulations: [], total: 0 },
      { status: 500 }
    );
  }
}

