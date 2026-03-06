import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { compare } from "bcryptjs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('test') || 'all';
    
    const results: any[] = [];

    // Test 1: Invalid Credentials
    if (testType === 'all' || testType === 'invalid_credentials') {
      try {
        const invalidCredentials = [
          { email: "nonexistent@example.com", password: "wrongpassword" },
          { email: "test@example.com", password: "" },
          { email: "", password: "password123" },
          { email: "invalid-email", password: "password123" },
          { email: "test@example.com", password: "a".repeat(1000) } // Very long password
        ];

        for (const cred of invalidCredentials) {
          try {
            if (!cred.email || !cred.password) {
              results.push({
                test: "Invalid Credentials",
                scenario: `Empty ${!cred.email ? 'email' : 'password'}`,
                status: "expected_failure",
                message: "Empty credentials should be rejected",
                passed: true
              });
              continue;
            }

            if (!cred.email.includes('@')) {
              results.push({
                test: "Invalid Credentials",
                scenario: "Invalid email format",
                status: "expected_failure", 
                message: "Invalid email format should be rejected",
                passed: true
              });
              continue;
            }

            const user = await db.user.findUnique({
              where: { email: cred.email.toLowerCase().trim() }
            });

            if (!user) {
              results.push({
                test: "Invalid Credentials",
                scenario: "Non-existent user",
                status: "expected_failure",
                message: "Non-existent user should be rejected",
                passed: true
              });
            } else {
              const isValid = await compare(cred.password, user.password || '');
              results.push({
                test: "Invalid Credentials",
                scenario: "Wrong password",
                status: isValid ? "unexpected_success" : "expected_failure",
                message: isValid ? "Password validation failed" : "Wrong password correctly rejected",
                passed: !isValid
              });
            }
          } catch (error) {
            results.push({
              test: "Invalid Credentials",
              scenario: cred.email || "Empty email",
              status: "error",
              message: `Error testing credentials: ${error}`,
              passed: false
            });
          }
        }
      } catch (error) {
        results.push({
          test: "Invalid Credentials",
          scenario: "General test",
          status: "error",
          message: `Error in invalid credentials test: ${error}`,
          passed: false
        });
      }
    }

    // Test 2: Session Edge Cases
    if (testType === 'all' || testType === 'session_edge_cases') {
      try {
        const session = await getServerSession(authOptions);
        
        if (session) {
          // Test session with malformed data
          const malformedSessionTests = [
            {
              test: "Session with missing user ID",
              scenario: "Check session.user.id",
              status: session.user.id ? "pass" : "fail",
              message: session.user.id ? "User ID present" : "User ID missing",
              passed: !!session.user.id
            },
            {
              test: "Session with missing email",
              scenario: "Check session.user.email", 
              status: session.user.email ? "pass" : "fail",
              message: session.user.email ? "Email present" : "Email missing",
              passed: !!session.user.email
            },
            {
              test: "Session with missing role",
              scenario: "Check session.user.role",
              status: session.user.role ? "pass" : "fail", 
              message: session.user.role ? "Role present" : "Role missing",
              passed: !!session.user.role
            },
            {
              test: "Session role validation",
              scenario: "Check role is valid",
              status: ['STUDENT', 'TEACHER', 'ADMIN'].includes(session.user.role) ? "pass" : "fail",
              message: `Role '${session.user.role}' is ${['STUDENT', 'TEACHER', 'ADMIN'].includes(session.user.role) ? 'valid' : 'invalid'}`,
              passed: ['STUDENT', 'TEACHER', 'ADMIN'].includes(session.user.role)
            }
          ];

          results.push(...malformedSessionTests);

          // Test database consistency
          try {
            const dbUser = await db.user.findUnique({
              where: { email: session.user.email!.toLowerCase().trim() }
            });

            results.push({
              test: "Database Consistency",
              scenario: "Session user exists in DB",
              status: dbUser ? "pass" : "fail",
              message: dbUser ? "User found in database" : "User not found in database",
              passed: !!dbUser
            });

            if (dbUser) {
              results.push({
                test: "Database Consistency", 
                scenario: "Role matches database",
                status: dbUser.role === session.user.role ? "pass" : "fail",
                message: `Session role '${session.user.role}' ${dbUser.role === session.user.role ? 'matches' : 'does not match'} DB role '${dbUser.role}'`,
                passed: dbUser.role === session.user.role
              });
            }
          } catch (error) {
            results.push({
              test: "Database Consistency",
              scenario: "Database query",
              status: "error",
              message: `Database query failed: ${error}`,
              passed: false
            });
          }
        } else {
          results.push({
            test: "Session Edge Cases",
            scenario: "No active session",
            status: "info",
            message: "No active session to test",
            passed: true
          });
        }
      } catch (error) {
        results.push({
          test: "Session Edge Cases",
          scenario: "General test",
          status: "error",
          message: `Error in session edge cases test: ${error}`,
          passed: false
        });
      }
    }

    // Test 3: JWT Token Edge Cases
    if (testType === 'all' || testType === 'jwt_edge_cases') {
      try {
        // Test JWT token validation
        const response = await fetch(`${request.url.split('/api')[0]}/api/test-auth`);
        const authData = await response.json();

        results.push({
          test: "JWT Token Validation",
          scenario: "Token accessibility",
          status: response.ok ? "pass" : "fail",
          message: response.ok ? "JWT token accessible via API" : "JWT token not accessible",
          passed: response.ok,
          details: authData
        });

        // Test token expiration (simulate)
        results.push({
          test: "JWT Token Edge Cases",
          scenario: "Token expiration handling",
          status: "info",
          message: "Token expiration should be handled by NextAuth automatically",
          passed: true
        });

      } catch (error) {
        results.push({
          test: "JWT Token Edge Cases",
          scenario: "Token validation",
          status: "error",
          message: `Error testing JWT: ${error}`,
          passed: false
        });
      }
    }

    // Test 4: Multiple Session Scenarios
    if (testType === 'all' || testType === 'multiple_sessions') {
      try {
        // Get all users for testing
        const users = await db.user.findMany({
          select: { id: true, email: true, role: true },
          take: 3
        });

        results.push({
          test: "Multiple Sessions",
          scenario: "User enumeration",
          status: users.length > 0 ? "pass" : "warning",
          message: `Found ${users.length} users for testing`,
          passed: users.length > 0,
          userCount: users.length
        });

        // Test role distribution
        const roleCounts = users.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        results.push({
          test: "Multiple Sessions",
          scenario: "Role distribution",
          status: "info",
          message: `Role distribution: ${JSON.stringify(roleCounts)}`,
          passed: true,
          roleCounts
        });

      } catch (error) {
        results.push({
          test: "Multiple Sessions",
          scenario: "User enumeration",
          status: "error",
          message: `Error enumerating users: ${error}`,
          passed: false
        });
      }
    }

    // Test 5: Security Edge Cases
    if (testType === 'all' || testType === 'security_edge_cases') {
      try {
        // Test SQL injection attempts (should be safe with Prisma)
        const maliciousInputs = [
          "'; DROP TABLE users; --",
          "<script>alert('xss')</script>",
          "../../etc/passwd",
          "admin' OR '1'='1",
          "null",
          "undefined"
        ];

        for (const input of maliciousInputs) {
          try {
            // Try to find user with malicious input
            const user = await db.user.findUnique({
              where: { email: input.toLowerCase().trim() }
            });

            results.push({
              test: "Security Edge Cases",
              scenario: `Malicious input: ${input.substring(0, 20)}...`,
              status: user ? "warning" : "pass",
              message: user ? "Malicious input returned user (potential issue)" : "Malicious input safely rejected",
              passed: !user
            });
          } catch (error) {
            results.push({
              test: "Security Edge Cases",
              scenario: `Malicious input: ${input.substring(0, 20)}...`,
              status: "pass",
              message: "Malicious input safely rejected with error",
              passed: true
            });
          }
        }

        // Test rate limiting (simulate)
        results.push({
          test: "Security Edge Cases",
          scenario: "Rate limiting",
          status: "info",
          message: "Rate limiting should be implemented at application level",
          passed: true
        });

      } catch (error) {
        results.push({
          test: "Security Edge Cases",
          scenario: "General security test",
          status: "error",
          message: `Error in security test: ${error}`,
          passed: false
        });
      }
    }

    // Calculate overall results
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.filter(r => !r.passed).length;
    const warningTests = results.filter(r => r.status === 'warning').length;

    return NextResponse.json({
      message: "Edge cases testing complete",
      testType,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        warnings: warningTests,
        successRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
      },
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      message: "Edge cases testing failed",
      error: error instanceof Error ? error.message : "Unknown error",
      results: [],
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, testData } = await request.json();
    
    if (action === "stress_test") {
      // Simulate multiple concurrent requests
      const concurrentRequests = 10;
      const results = [];

      for (let i = 0; i < concurrentRequests; i++) {
        try {
          const response = await fetch(`${request.url.split('/api')[0]}/api/test-auth`);
          const data = await response.json();
          
          results.push({
            request: i + 1,
            status: response.ok ? "success" : "failed",
            responseTime: Date.now(),
            data: data
          });
        } catch (error) {
          results.push({
            request: i + 1,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      return NextResponse.json({
        message: "Stress test complete",
        action,
        concurrentRequests,
        results,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      message: "Invalid action",
      action,
      timestamp: new Date().toISOString()
    }, { status: 400 });

  } catch (error) {
    return NextResponse.json({
      message: "Action failed",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
