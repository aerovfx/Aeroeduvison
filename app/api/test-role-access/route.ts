import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const testRoute = searchParams.get('route') || '';
    
    if (!session) {
      return NextResponse.json({ 
        message: "No active session",
        authenticated: false,
        accessGranted: false,
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    const userRole = session.user.role;
    const userId = session.user.id;
    const userEmail = session.user.email;

    // Define role-based access rules
    const accessRules = {
      '/admin': ['ADMIN'],
      '/admin/dashboard': ['ADMIN'],
      '/admin/users': ['ADMIN'],
      '/admin/settings': ['ADMIN'],
      '/teacher': ['TEACHER', 'ADMIN'],
      '/teacher/courses': ['TEACHER', 'ADMIN'],
      '/teacher/create': ['TEACHER', 'ADMIN'],
      '/dashboard': ['STUDENT', 'TEACHER', 'ADMIN'],
      '/dashboard/labtwin': ['STUDENT', 'TEACHER', 'ADMIN'],
      '/student-dashboard': ['STUDENT', 'TEACHER', 'ADMIN'],
      '/api/admin': ['ADMIN'],
      '/api/teacher': ['TEACHER', 'ADMIN'],
      '/api/student': ['STUDENT', 'TEACHER', 'ADMIN']
    };

    // Test specific route if provided
    let accessGranted = false;
    let allowedRoles: string[] = [];
    let testResult = null;

    if (testRoute) {
      // Find matching rule
      const matchingRule = Object.entries(accessRules).find(([route]) => 
        testRoute.startsWith(route)
      );

      if (matchingRule) {
        const [route, roles] = matchingRule;
        allowedRoles = roles;
        accessGranted = roles.includes(userRole);
        
        testResult = {
          route: testRoute,
          matchingRule: route,
          allowedRoles: roles,
          userRole,
          accessGranted,
          message: accessGranted 
            ? `Access granted to ${testRoute} for role ${userRole}`
            : `Access denied to ${testRoute} for role ${userRole}. Required roles: ${roles.join(', ')}`
        };
      } else {
        // No specific rule found, check if it's a public route
        const publicRoutes = ['/', '/sign-in', '/sign-up', '/api/auth'];
        const isPublicRoute = publicRoutes.some(route => testRoute.startsWith(route));
        
        accessGranted = isPublicRoute;
        testResult = {
          route: testRoute,
          matchingRule: null,
          allowedRoles: isPublicRoute ? ['PUBLIC'] : [],
          userRole,
          accessGranted,
          message: isPublicRoute 
            ? `Public route ${testRoute} - access granted`
            : `No access rule found for ${testRoute} - access denied by default`
        };
      }
    }

    // Validate user still exists in database
    const normalizedEmail = userEmail!.toLowerCase().trim();
    const dbUser = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { 
        id: true, 
        email: true, 
        role: true, 
        name: true,
        schoolId: true
      }
    });

    if (!dbUser) {
      return NextResponse.json({ 
        message: "User not found in database",
        authenticated: false,
        accessGranted: false,
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Check role consistency
    const roleConsistent = dbUser.role === userRole;

    return NextResponse.json({ 
      message: "Role-based access test complete",
      authenticated: true,
      accessGranted,
      user: {
        id: userId,
        email: userEmail,
        role: userRole,
        name: session.user.name
      },
      databaseUser: dbUser,
      roleConsistent,
      testResult,
      allAccessRules: accessRules,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({ 
      message: "Role-based access test failed",
      error: error instanceof Error ? error.message : "Unknown error",
      authenticated: false,
      accessGranted: false,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, testData } = await request.json();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        message: "No active session",
        success: false,
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    const userRole = session.user.role;
    const userId = session.user.id;

    if (action === "test_role_escalation") {
      // Test if user can access higher privilege routes
      const escalationTests = [
        { route: '/admin/dashboard', requiredRole: 'ADMIN', userRole },
        { route: '/teacher/courses', requiredRole: 'TEACHER', userRole },
        { route: '/dashboard', requiredRole: 'STUDENT', userRole }
      ];

      const results = escalationTests.map(test => {
        const roleHierarchy = { 'STUDENT': 1, 'TEACHER': 2, 'ADMIN': 3 };
        const userLevel = roleHierarchy[test.userRole as keyof typeof roleHierarchy] || 0;
        const requiredLevel = roleHierarchy[test.requiredRole as keyof typeof roleHierarchy] || 0;
        
        return {
          route: test.route,
          requiredRole: test.requiredRole,
          userRole: test.userRole,
          userLevel,
          requiredLevel,
          canAccess: userLevel >= requiredLevel,
          message: userLevel >= requiredLevel 
            ? `Access granted: ${test.userRole} can access ${test.route}`
            : `Access denied: ${test.userRole} cannot access ${test.route} (requires ${test.requiredRole})`
        };
      });

      return NextResponse.json({ 
        message: "Role escalation test complete",
        success: true,
        results,
        timestamp: new Date().toISOString()
      });
    }

    if (action === "test_middleware_protection") {
      // Simulate middleware protection tests
      const protectedRoutes = [
        '/admin/dashboard',
        '/teacher/courses', 
        '/dashboard/labtwin'
      ];

      const results = protectedRoutes.map(route => {
        let allowed = false;
        let reason = '';

        if (route.startsWith('/admin')) {
          allowed = userRole === 'ADMIN';
          reason = allowed ? 'Admin access granted' : 'Admin access required';
        } else if (route.startsWith('/teacher')) {
          allowed = ['TEACHER', 'ADMIN'].includes(userRole);
          reason = allowed ? 'Teacher access granted' : 'Teacher or Admin access required';
        } else if (route.startsWith('/dashboard')) {
          allowed = ['STUDENT', 'TEACHER', 'ADMIN'].includes(userRole);
          reason = allowed ? 'Dashboard access granted' : 'Student, Teacher, or Admin access required';
        }

        return {
          route,
          userRole,
          allowed,
          reason
        };
      });

      return NextResponse.json({ 
        message: "Middleware protection test complete",
        success: true,
        results,
        timestamp: new Date().toISOString()
      });
    }

    if (action === "test_api_access") {
      // Test API endpoint access
      const apiTests = [
        { endpoint: '/api/admin/users', requiredRole: 'ADMIN' },
        { endpoint: '/api/teacher/courses', requiredRole: 'TEACHER' },
        { endpoint: '/api/student/progress', requiredRole: 'STUDENT' }
      ];

      const results = apiTests.map(test => {
        const roleHierarchy = { 'STUDENT': 1, 'TEACHER': 2, 'ADMIN': 3 };
        const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
        const requiredLevel = roleHierarchy[test.requiredRole as keyof typeof roleHierarchy] || 0;
        
        return {
          endpoint: test.endpoint,
          requiredRole: test.requiredRole,
          userRole,
          canAccess: userLevel >= requiredLevel,
          message: userLevel >= requiredLevel 
            ? `API access granted: ${userRole} can access ${test.endpoint}`
            : `API access denied: ${userRole} cannot access ${test.endpoint} (requires ${test.requiredRole})`
        };
      });

      return NextResponse.json({ 
        message: "API access test complete",
        success: true,
        results,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ 
      message: "Invalid action",
      success: false,
      action,
      timestamp: new Date().toISOString()
    }, { status: 400 });
    
  } catch (error) {
    return NextResponse.json({ 
      message: "Role access test failed",
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
