import { NextRequest, NextResponse } from "next/server";
import { getSignedDownloadUrl } from "@/lib/gcs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    
    if (!imageUrl) {
      return new NextResponse("Missing image URL", { status: 400 });
    }

    // Extract bucket name and file path from GCS URL
    const url = new URL(imageUrl);
    if (url.hostname !== 'storage.googleapis.com') {
      return new NextResponse("Invalid GCS URL", { status: 400 });
    }

    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) {
      return new NextResponse("Invalid GCS URL format", { status: 400 });
    }

    const bucketName = pathParts[0];
    const fileName = pathParts.slice(1).join('/');

    // Generate signed URL for download (1 hour expiry)
    const signedUrl = await getSignedDownloadUrl(bucketName, fileName, 3600);

    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error("Image signed URL error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
