import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { roomId } = await params;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is participant in the room
    const participant = await db.chatParticipant.findFirst({
      where: {
        roomId,
        userId: session.user.id,
        isActive: true
      }
    });

    if (!participant) {
      return NextResponse.json({ error: "Not a participant in this room" }, { status: 403 });
    }

    // Get messages for the room
    const messages = await db.chatMessage.findMany({
      where: {
        roomId,
        isDeleted: false
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return NextResponse.json({ messages });

  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
