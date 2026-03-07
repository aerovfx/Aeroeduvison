import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(request: NextRequest) {
  try {
    // Test cookie parsing
    const cookies = request.cookies;
    const cookieInfo = {
      sessionToken: cookies.get('__Secure-next-auth.session-token')?.value ? 'Present' : 'Missing',
      csrfToken: cookies.get('__Host-next-auth.csrf-token')?.value ? 'Present' : 'Missing',
      callbackUrl: cookies.get('__Secure-next-auth.callback-url')?.value ? 'Present' : 'Missing',
      state: cookies.get('__Secure-next-auth.state')?.value ? 'Present' : 'Missing',
    };

    // Test JWT token parsing
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cookies: cookieInfo,
      token: token ? {
        hasToken: true,
        email: token.email,
        role: token.role,
        exp: token.exp ? new Date(token.exp * 1000).toISOString() : null
      } : {
        hasToken: false
      },
      headers: {
        userAgent: request.headers.get('user-agent'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
        host: request.headers.get('host')
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

