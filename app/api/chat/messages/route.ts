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

    const { roomId, content, type = "text" } = await request.json();

    if (!roomId || !content) {
      return NextResponse.json({ error: "Room ID and content are required" }, { status: 400 });
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

    // Create message
    const message = await db.chatMessage.create({
      data: {
        roomId,
        senderId: session.user.id,
        content,
        type
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    // Update room's updatedAt
    await db.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({ message });

  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
