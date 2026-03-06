import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getRedirectUrl, hasRoutePermission } from '@/lib/auth-redirect';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({
        success: false,
        message: 'Not authenticated',
        redirect: '/auth/login'
      });
    }

    // Test utility functions
    const dashboardUrl = getRedirectUrl(session.user.role as any);
    const hasPermission = hasRoutePermission(session.user.role as any, '/admin/dashboard');
    
    return NextResponse.json({
      success: true,
      session: {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role
        }
      },
      redirects: {
        dashboardUrl,
        hasAdminPermission: hasPermission
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({
        success: false,
        message: 'Not authenticated'
      }, { status: 401 });
    }

    const body = await request.json();
    const { testType } = body;

    switch (testType) {
      case 'role-check':
        const role = session.user.role;
        const permissions = {
          canAccessAdmin: hasRoutePermission(role as any, '/admin/dashboard'),
          canAccessTeacher: hasRoutePermission(role as any, '/teacher/dashboard'),
          canAccessStudent: hasRoutePermission(role as any, '/dashboard')
        };
        
        return NextResponse.json({
          success: true,
          role,
          permissions,
          recommendedRedirect: getRedirectUrl(role as any)
        });

      case 'redirect-test':
        const { targetPath } = body;
        const hasPermission = hasRoutePermission(session.user.role as any, targetPath);
        
        return NextResponse.json({
          success: true,
          targetPath,
          hasPermission,
          fallbackUrl: getRedirectUrl(session.user.role as any)
        });

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid test type'
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
