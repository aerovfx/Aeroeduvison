import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isTeacher } from "@/lib/teacher";
import { getSignedUploadUrl } from "@/lib/gcs";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const isAuthorized = isTeacher(session?.user?.role);

    if (!userId || !isAuthorized) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { filename, contentType, uploadType } = await req.json();

    if (!filename || !contentType || !uploadType) {
      return new NextResponse("Missing filename, contentType or uploadType", { status: 400 });
    }

    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) {
      console.error("[GCS_CONFIG_ERROR] GCS_BUCKET_NAME not set");
      return new NextResponse("GCS bucket name not configured", { status: 500 });
    }

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    if (!projectId) {
      console.error("[GCS_CONFIG_ERROR] GOOGLE_CLOUD_PROJECT_ID not set");
      return new NextResponse("Google Cloud Project ID not configured", { status: 500 });
    }

    console.log("[GCS_CONFIG] Using bucket:", bucketName, "project:", projectId);

    // Determine folder based on upload type
    let folder = "uploads";
    if (uploadType === "course-image") {
      folder = "course-images";
    } else if (uploadType === "chapter-video") {
      folder = "chapter-videos";
    } else if (uploadType === "attachment") {
      folder = "attachments";
    }

    // Generate unique filename
    const fileExtension = filename.split('.').pop();
    const uniqueFileName = `${folder}/${randomUUID()}.${fileExtension}`;
    
    // Get signed URL for upload
    const signedUrl = await getSignedUploadUrl(bucketName, uniqueFileName, contentType);

    return NextResponse.json({ 
      url: signedUrl, 
      key: uniqueFileName,
      bucket: bucketName 
    });
  } catch (error) {
    console.error("[GCS_PRESIGNED_URL_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
