import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { checkCourseManagementPermission } from "@/lib/permission-middleware";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    
    // Check permission using middleware
    const permissionCheck = await checkCourseManagementPermission(req as NextRequest, courseId);
    if (permissionCheck) return permissionCheck;

    const session = await getServerSession(authOptions);
    const course = await db.course.findUnique({
      where: {
        id: courseId,
        userId: session?.user?.id,
      },
      include: {
        chapters: {
          include: {
            muxData: true,
          }
        }
      }
    });

    if (!course) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Clean up muxData records from DB (Mux API no longer used)
    for (const chapter of course.chapters) {
      if (chapter.muxData) {
        await db.muxData.delete({
          where: { id: chapter.muxData.id },
        }).catch(() => {});
      }
    }

    const deletedCourse = await db.course.delete({
      where: {
        id: courseId,
      },
    });

    return NextResponse.json(deletedCourse);
  } catch (error) {
    console.log("[COURSE_ID_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    
    // Check permission using middleware
    const permissionCheck = await checkCourseManagementPermission(req as NextRequest, courseId);
    if (permissionCheck) return permissionCheck;
    
    const session = await getServerSession(authOptions);
    const values = await req.json();

    const course = await db.course.update({
      where: {
        id: courseId,
        userId: session?.user?.id
      },
      data: {
        ...values,
      }
    });

    return NextResponse.json(course);
  } catch (error) {
    console.log("[COURSE_ID]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}