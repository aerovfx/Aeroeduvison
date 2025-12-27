import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { labId, labName, xpEarned, parameters } = body;

    if (!labId || !labName || !xpEarned) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if lab already completed
    const existingCompletion = await db.labCompletion.findFirst({
      where: {
        userId: session.user.id,
        labId: labId,
      },
    });

    if (existingCompletion) {
      return NextResponse.json(
        { 
          message: "Lab already completed",
          alreadyCompleted: true,
          completion: existingCompletion
        },
        { status: 200 }
      );
    }

    // Create lab completion record
    const completion = await db.labCompletion.create({
      data: {
        userId: session.user.id,
        labId: labId,
        labName: labName,
        xpEarned: xpEarned,
        parameters: parameters || {},
        completedAt: new Date(),
      },
    });

    // Update user's total XP
    await db.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        xp: {
          increment: xpEarned,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Lab completed successfully",
      completion: completion,
      xpEarned: xpEarned,
    });

  } catch (error) {
    console.error("[LAB_COMPLETION_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check lab completion status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const labId = searchParams.get('labId');

    if (!labId) {
      return NextResponse.json(
        { error: "Lab ID is required" },
        { status: 400 }
      );
    }

    const completion = await db.labCompletion.findFirst({
      where: {
        userId: session.user.id,
        labId: labId,
      },
    });

    return NextResponse.json({
      completed: !!completion,
      completion: completion,
    });

  } catch (error) {
    console.error("[LAB_COMPLETION_CHECK_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

