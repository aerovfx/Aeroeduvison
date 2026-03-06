import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { xp, subject, lessonTitle } = await request.json();

    if (!xp || xp <= 0) {
      return NextResponse.json({ error: "Invalid XP amount" }, { status: 400 });
    }

    // Get current user data
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        name: true, 
        email: true,
        // Add XP field if it exists in your schema
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // For now, we'll store XP in a simple way
    // You might want to create a separate XP table or add XP field to User model
    const currentXP = 0; // This should come from your database
    const newXP = currentXP + xp;
    
    // Calculate level based on XP (simple formula: level = floor(XP / 100) + 1)
    const newLevel = Math.floor(newXP / 100) + 1;

    // Here you would update the user's XP in the database
    // For now, we'll just return the calculated values
    // await db.user.update({
    //   where: { id: session.user.id },
    //   data: { xp: newXP, level: newLevel }
    // });

    return NextResponse.json({
      success: true,
      xp: newXP,
      level: newLevel,
      xpGained: xp,
      subject,
      lessonTitle
    });

  } catch (error) {
    console.error("Error updating XP:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user XP data
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        name: true, 
        email: true,
        // Add XP field if it exists in your schema
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentXP = 0; // This should come from your database
    const level = Math.floor(currentXP / 100) + 1;

    return NextResponse.json({
      xp: currentXP,
      level,
      gems: 12, // Mock data for now
      hearts: 5, // Mock data for now
      streak: 3 // Mock data for now
    });

  } catch (error) {
    console.error("Error fetching XP:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
