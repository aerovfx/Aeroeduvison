import Mux from "@mux/mux-node";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { checkCourseManagementPermission } from "@/lib/permission-middleware";

let Video: any = null;
try {
  const mux = new Mux(
    process.env.MUX_TOKEN_ID || '',
    process.env.MUX_TOKEN_SECRET || '',
  );
  Video = mux.Video;
} catch (error) {
  console.warn('Mux not configured, video features disabled');
}

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

    for (const chapter of course.chapters) {
      if (chapter.muxData?.assetId && Video) {
        try {
          await Video.Assets.del(chapter.muxData.assetId);
        } catch (error) {
          console.warn('Failed to delete Mux asset:', error);
        }
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