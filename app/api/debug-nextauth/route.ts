import { NextResponse } from 'next/server';

export async function GET() {
  const debug = {
    // Environment variables
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '***SET***' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    K_SERVICE: process.env.K_SERVICE,
    VERCEL_URL: process.env.VERCEL_URL,
    
    // Runtime detection
    isCloudRun: !!process.env.K_SERVICE,
    isProduction: process.env.NODE_ENV === 'production',
    
    // What getBaseUrl would return
    detectedBaseUrl: getDetectedBaseUrl(),
    
    // All env vars starting with NEXT
    nextEnvVars: Object.keys(process.env)
      .filter(key => key.startsWith('NEXT'))
      .reduce((obj: any, key) => {
        obj[key] = process.env[key];
        return obj;
      }, {}),
  };

  return NextResponse.json(debug, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

function getDetectedBaseUrl() {
  if (process.env.NEXTAUTH_URL) {
    return `Using NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `Using VERCEL_URL: https://${process.env.VERCEL_URL}`;
  }
  if (process.env.K_SERVICE) {
    return 'Using Cloud Run detection: https://inphysic.com';
  }
  if (process.env.NODE_ENV === 'production') {
    return 'Using production fallback: https://inphysic.com';
  }
  return 'Using development fallback: http://localhost:3000';
}

