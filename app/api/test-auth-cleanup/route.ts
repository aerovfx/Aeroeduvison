import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { action, targetEmail } = await request.json();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        message: "No active session",
        success: false,
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    const currentUserEmail = session.user.email!.toLowerCase().trim();
    
    if (action === "test_session_cleanup") {
      // Test switching between users
      if (!targetEmail) {
        return NextResponse.json({ 
          message: "Target email required for session cleanup test",
          success: false,
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }

      const normalizedTargetEmail = targetEmail.toLowerCase().trim();
      
      // Check if target user exists
      const targetUser = await db.user.findUnique({
        where: { email: normalizedTargetEmail },
        select: { id: true, email: true, role: true, name: true }
      });

      if (!targetUser) {
        return NextResponse.json({ 
          message: "Target user not found",
          success: false,
          targetEmail: normalizedTargetEmail,
          timestamp: new Date().toISOString()
        }, { status: 404 });
      }

      // Check if current user and target user are different
      if (currentUserEmail === normalizedTargetEmail) {
        return NextResponse.json({ 
          message: "Cannot switch to same user",
          success: false,
          currentUser: currentUserEmail,
          targetUser: normalizedTargetEmail,
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }

      return NextResponse.json({ 
        message: "Session cleanup test ready",
        success: true,
        currentUser: {
          email: currentUserEmail,
          id: session.user.id,
          role: session.user.role
        },
        targetUser: {
          email: targetUser.email,
          id: targetUser.id,
          role: targetUser.role,
          name: targetUser.name
        },
        instructions: [
          "1. Current session will be invalidated",
          "2. Client should sign out current user",
          "3. Client should sign in with target user",
          "4. Verify session data is updated correctly"
        ],
        timestamp: new Date().toISOString()
      });
    }

    if (action === "validate_session_cleanup") {
      // Validate that session cleanup was successful
      const normalizedEmail = session.user.email!.toLowerCase().trim();
      
      const dbUser = await db.user.findUnique({
        where: { email: normalizedEmail },
        select: { 
          id: true, 
          email: true, 
          role: true, 
          name: true,
          updatedAt: true
        }
      });

      if (!dbUser) {
        return NextResponse.json({ 
          message: "User not found in database",
          success: false,
          timestamp: new Date().toISOString()
        }, { status: 401 });
      }

      // Check session consistency
      const sessionConsistent = 
        session.user.id === dbUser.id &&
        session.user.email === dbUser.email &&
        session.user.role === dbUser.role;

      return NextResponse.json({ 
        message: "Session cleanup validation complete",
        success: true,
        sessionConsistent,
        session: {
          user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: session.user.role
          }
        },
        databaseUser: dbUser,
        timestamp: new Date().toISOString()
      });
    }

    if (action === "force_session_refresh") {
      // Force a session refresh by updating the user's updatedAt timestamp
      const normalizedEmail = session.user.email!.toLowerCase().trim();
      
      const updatedUser = await db.user.update({
        where: { email: normalizedEmail },
        data: { updatedAt: new Date() },
        select: { 
          id: true, 
          email: true, 
          role: true, 
          name: true,
          updatedAt: true
        }
      });

      return NextResponse.json({ 
        message: "Session refresh triggered",
        success: true,
        updatedUser,
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
      message: "Session cleanup test failed",
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        message: "No active session",
        success: false,
        timestamp: new Date().toISOString()
      });
    }

    // Get all users for testing purposes
    const users = await db.user.findMany({
      select: { 
        id: true, 
        email: true, 
        role: true, 
        name: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const currentUser = users.find(user => 
      user.email.toLowerCase().trim() === session.user.email!.toLowerCase().trim()
    );

    const otherUsers = users.filter(user => 
      user.email.toLowerCase().trim() !== session.user.email!.toLowerCase().trim()
    );

    return NextResponse.json({ 
      message: "Session cleanup test data",
      success: true,
      currentUser,
      otherUsers: otherUsers.slice(0, 5), // Limit to 5 other users
      totalUsers: users.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({ 
      message: "Failed to get session cleanup test data",
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
