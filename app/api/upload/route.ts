import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkFileUploadPermission } from "@/lib/permission-middleware";

export async function POST(request: NextRequest) {
  try {
    // Check file upload permission
    const permissionCheck = await checkFileUploadPermission(request);
    if (permissionCheck) {
      return NextResponse.json({ error: "Unauthorized" }, { status: permissionCheck.status });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // For development, just return a mock URL
    const mockUrl = `https://mock-upload.com/${Date.now()}-${file.name}`;
    
    console.log(`Mock upload: ${file.name} (${file.size} bytes) -> ${mockUrl}`);
    
    return NextResponse.json({
      success: true,
      url: mockUrl,
      name: file.name,
      size: file.size,
      type: file.type
    });
    
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
