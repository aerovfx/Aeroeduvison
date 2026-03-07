import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getSignedDownloadUrl, getPublicUrl } from "@/lib/gcs";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const videoKey = searchParams.get('key');
    const useSignedUrl = searchParams.get('signed') === 'true';

    if (!videoKey) {
      return new NextResponse("Missing video key", { status: 400 });
    }

    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) {
      return new NextResponse("GCS bucket name not configured", { status: 500 });
    }

    let videoUrl: string;

    if (useSignedUrl) {
      // Generate signed URL for private videos
      videoUrl = await getSignedDownloadUrl(bucketName, videoKey, 3600); // 1 hour expiry
    } else {
      // Use public URL for public videos
      videoUrl = await getPublicUrl(bucketName, videoKey);
    }

    return NextResponse.json({ 
      videoUrl,
      key: videoKey,
      bucket: bucketName,
      isSigned: useSignedUrl
    });
  } catch (error) {
    console.error("[GCS_VIDEO_STREAM_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
