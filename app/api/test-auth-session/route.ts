import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        message: "No active session",
        authenticated: false,
        timestamp: new Date().toISOString()
      });
    }

    // Validate session against database
    const normalizedEmail = session.user.email!.toLowerCase().trim();
    const dbUser = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { 
        id: true, 
        email: true, 
        role: true, 
        name: true, 
        image: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!dbUser) {
      return NextResponse.json({ 
        message: "User not found in database",
        authenticated: false,
        session: null,
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Check if session data matches database
    const sessionValid = 
      session.user.id === dbUser.id &&
      session.user.email === dbUser.email &&
      session.user.role === dbUser.role;

    return NextResponse.json({ 
      message: "Session validation complete",
      authenticated: true,
      sessionValid,
      session: {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          image: session.user.image
        }
      },
      databaseUser: dbUser,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      message: "Session validation failed",
      error: error instanceof Error ? error.message : "Unknown error",
      authenticated: false,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json();
    
    if (action === "invalidate") {
      // This would typically involve clearing server-side session data
      // For JWT-based sessions, we can't directly invalidate on server
      // The client would need to sign out
      return NextResponse.json({ 
        message: "Session invalidation requested - client should sign out",
        action: "invalidate",
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === "refresh") {
      const session = await getServerSession(authOptions);
      
      if (!session) {
        return NextResponse.json({ 
          message: "No session to refresh",
          action: "refresh",
          timestamp: new Date().toISOString()
        }, { status: 401 });
      }

      // Force refresh by getting latest user data
      const normalizedEmail = session.user.email!.toLowerCase().trim();
      const dbUser = await db.user.findUnique({
        where: { email: normalizedEmail },
        select: { 
          id: true, 
          email: true, 
          role: true, 
          name: true, 
          image: true,
          updatedAt: true
        }
      });

      if (!dbUser) {
        return NextResponse.json({ 
          message: "User not found during refresh",
          action: "refresh",
          timestamp: new Date().toISOString()
        }, { status: 401 });
      }

      return NextResponse.json({ 
        message: "Session refreshed successfully",
        action: "refresh",
        refreshedUser: dbUser,
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
