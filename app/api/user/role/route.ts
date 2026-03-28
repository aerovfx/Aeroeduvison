import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await req.json();

    // Only allow switching between STUDENT and TEACHER
    if (!["STUDENT", "TEACHER"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Only STUDENT or TEACHER allowed." },
        { status: 400 }
      );
    }

    // Don't allow ADMIN users to downgrade themselves
    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (currentUser?.role === "ADMIN") {
      return NextResponse.json(
        { error: "Admin cannot change role from this page." },
        { status: 403 }
      );
    }

    // Update user role
    const updatedUser = await db.user.update({
      where: { email: session.user.email },
      data: { role },
      select: { id: true, email: true, role: true, name: true },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `Role updated to ${role}. Please log in again to apply changes.`,
    });
  } catch (error) {
    console.error("[USER_ROLE_UPDATE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
