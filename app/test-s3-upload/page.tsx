'use client';

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { S3Upload } from "@/components/ui/s3-upload";

export default function TestS3UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<Array<{url: string, file: File}>>([]);

  const handleUploadComplete = (url: string, file: File) => {
    setUploadedFiles(prev => [...prev, { url, file }]);
  };

  const clearUploads = () => {
    setUploadedFiles([]);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">S3 Upload Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Course Image Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Course Image</CardTitle>
            <CardDescription>Upload course thumbnail image</CardDescription>
          </CardHeader>
          <CardContent>
            <S3Upload
              uploadType="course-image"
              accept="image/*"
              maxSize={4}
              onUploadComplete={handleUploadComplete}
            />
          </CardContent>
        </Card>

        {/* Chapter Video Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Chapter Video</CardTitle>
            <CardDescription>Upload chapter video content</CardDescription>
          </CardHeader>
          <CardContent>
            <S3Upload
              uploadType="chapter-video"
              accept="video/*"
              maxSize={512000}
              onUploadComplete={handleUploadComplete}
            />
          </CardContent>
        </Card>

        {/* Attachment Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Attachment</CardTitle>
            <CardDescription>Upload course attachments</CardDescription>
          </CardHeader>
          <CardContent>
            <S3Upload
              uploadType="attachment"
              accept="*/*"
              maxSize={100}
              onUploadComplete={handleUploadComplete}
            />
          </CardContent>
        </Card>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Uploaded Files</CardTitle>
              <Button variant="outline" onClick={clearUploads}>
                Clear All
              </Button>
            </div>
            <CardDescription>
              {uploadedFiles.length} file(s) uploaded successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadedFiles.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(item.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="text-sm text-gray-500">
                        Type: {item.file.type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 break-all max-w-xs">
                        {item.url}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold">1. AWS S3 Setup:</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Create an S3 bucket</li>
                <li>Create IAM user with S3 permissions</li>
                <li>Get Access Key ID and Secret Access Key</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">2. Environment Variables:</h3>
              <p>Add these to your <code className="bg-gray-100 px-1 rounded">.env.local</code>:</p>
              <pre className="bg-gray-100 p-2 rounded text-xs mt-2">
{`AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET_NAME="your-bucket-name"`}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold">3. S3 Bucket Policy:</h3>
              <p>Make sure your bucket allows public read access for uploaded files.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
