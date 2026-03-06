import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all chat rooms for the user
    const chatRooms = await db.chatRoom.findMany({
      where: {
        participants: {
          some: {
            userId: session.user.id,
            isActive: true
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json({ chatRooms });

  } catch (error) {
    console.error("Error fetching chat rooms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { participantId, name } = await request.json();

    if (!participantId) {
      return NextResponse.json({ error: "Participant ID is required" }, { status: 400 });
    }

    // Check if chat room already exists between these users
    const existingRoom = await db.chatRoom.findFirst({
      where: {
        type: "1-1",
        participants: {
          every: {
            userId: {
              in: [session.user.id, participantId]
            }
          }
        }
      },
      include: {
        participants: true
      }
    });

    if (existingRoom) {
      return NextResponse.json({ chatRoom: existingRoom });
    }

    // Create new chat room
    const chatRoom = await db.chatRoom.create({
      data: {
        name: name || "Chat",
        type: "1-1",
        maxParticipants: 2,
        createdBy: session.user.id,
        participants: {
          create: [
            {
              userId: session.user.id,
              role: "participant"
            },
            {
              userId: participantId,
              role: "participant"
            }
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ chatRoom });

  } catch (error) {
    console.error("Error creating chat room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
