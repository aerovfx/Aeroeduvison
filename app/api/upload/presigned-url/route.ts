import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isTeacher } from "@/lib/teacher";
import { generatePresignedUrl, generateFileKey } from "@/lib/s3";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isTeacher(session?.user?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { filename, contentType, uploadType } = body;

    if (!filename || !contentType || !uploadType) {
      return NextResponse.json(
        { error: "Missing required fields: filename, contentType, uploadType" },
        { status: 400 }
      );
    }

    // Validate upload type
    const validTypes = ["course-image", "chapter-video", "attachment"];
    if (!validTypes.includes(uploadType)) {
      return NextResponse.json(
        { error: "Invalid upload type" },
        { status: 400 }
      );
    }

    // Generate file key
    const fileKey = generateFileKey(session.user.id, uploadType as any, filename);

    // Generate presigned URL
    const presignedUrl = await generatePresignedUrl({
      key: fileKey,
      contentType,
      expiresIn: 3600, // 1 hour
    });

    return NextResponse.json({
      success: true,
      presignedUrl,
      fileKey,
      publicUrl: `https://${process.env.AWS_S3_BUCKET_NAME || "aeroschool-uploads"}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${fileKey}`,
    });

  } catch (error) {
    console.error("Presigned URL generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate presigned URL" },
      { status: 500 }
    );
  }
}
