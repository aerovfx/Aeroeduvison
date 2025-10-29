'use client';

"use client";

import { useState } from "react";
import { GCSUpload } from "@/components/ui/gcs-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function TestGCSVideoPage() {
  const [courseImageUrl, setCourseImageUrl] = useState<string | null>(null);
  const [courseImageKey, setCourseImageKey] = useState<string | null>(null);
  const [chapterVideoUrl, setChapterVideoUrl] = useState<string | null>(null);
  const [chapterVideoKey, setChapterVideoKey] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentKey, setAttachmentKey] = useState<string | null>(null);
  
  // Video player settings
  const [customVideoKey, setCustomVideoKey] = useState("");

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">GCS Video Upload & Streaming Test</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Course Image</CardTitle>
            <CardDescription>Upload course thumbnail image to GCS</CardDescription>
          </CardHeader>
          <CardContent>
            <GCSUpload
              uploadType="course-image"
              accept="image/*"
              maxSize={4} // 4MB
              onUploadComplete={(url, key) => {
                setCourseImageUrl(url);
                setCourseImageKey(key);
              }}
            />
            {courseImageUrl && (
              <div className="mt-4 space-y-2">
                <Label>Uploaded URL:</Label>
                <Input value={courseImageUrl} readOnly />
                <Label>GCS Key:</Label>
                <Input value={courseImageKey || ""} readOnly />
                <img src={courseImageUrl} alt="Course Thumbnail" className="mt-2 max-w-full h-auto rounded-md" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chapter Video</CardTitle>
            <CardDescription>Upload chapter video content to GCS</CardDescription>
          </CardHeader>
          <CardContent>
            <GCSUpload
              uploadType="chapter-video"
              accept="video/*"
              maxSize={512000} // 512GB
              onUploadComplete={(url, key) => {
                setChapterVideoUrl(url);
                setChapterVideoKey(key);
              }}
            />
            {chapterVideoUrl && (
              <div className="mt-4 space-y-2">
                <Label>Uploaded URL:</Label>
                <Input value={chapterVideoUrl} readOnly />
                <Label>GCS Key:</Label>
                <Input value={chapterVideoKey || ""} readOnly />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attachment</CardTitle>
            <CardDescription>Upload course attachments to GCS</CardDescription>
          </CardHeader>
          <CardContent>
            <GCSUpload
              uploadType="attachment"
              accept="*/*"
              maxSize={100} // 100MB
              onUploadComplete={(url, key) => {
                setAttachmentUrl(url);
                setAttachmentKey(key);
              }}
            />
            {attachmentUrl && (
              <div className="mt-4 space-y-2">
                <Label>Uploaded URL:</Label>
                <Input value={attachmentUrl} readOnly />
                <Label>GCS Key:</Label>
                <Input value={attachmentKey || ""} readOnly />
                <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  View Attachment
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Video Player Test */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>GCS Video Player Test</CardTitle>
          <CardDescription>Test video streaming from GCS with public URLs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Custom Video Key (optional):</Label>
              <Input
                placeholder="Enter GCS key to test custom video"
                value={customVideoKey}
                onChange={(e) => setCustomVideoKey(e.target.value)}
              />
            </div>

            {chapterVideoUrl && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Uploaded Video:</h3>
                <video 
                  src={chapterVideoUrl} 
                  controls 
                  className="w-full h-96 bg-black rounded-lg"
                  preload="metadata"
                />
                <p className="text-sm text-muted-foreground">Video URL: {chapterVideoUrl}</p>
              </div>
            )}

            {customVideoKey && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Custom Video:</h3>
                <video 
                  src={`https://storage.googleapis.com/mathvideostore/${customVideoKey}`}
                  controls 
                  className="w-full h-96 bg-black rounded-lg"
                  preload="metadata"
                />
                <p className="text-sm text-muted-foreground">Video URL: https://storage.googleapis.com/mathvideostore/{customVideoKey}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>GCS Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold">1. Google Cloud Storage Setup:</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Create a GCS bucket in Google Cloud Console</li>
                <li>Create a service account with Storage Admin permissions</li>
                <li>Download the service account key JSON file</li>
                <li>Enable public access for demo videos (or use signed URLs for private)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">2. Environment Variables:</h3>
              <p>Add these to your <code className="bg-gray-100 px-1 rounded">.env.local</code>:</p>
              <pre className="bg-gray-100 p-2 rounded text-xs mt-2">
{`GOOGLE_CLOUD_PROJECT_ID="your-project-id"
GOOGLE_CLOUD_KEY_FILE="path/to/service-account-key.json"
# OR use credentials JSON directly:
GOOGLE_CLOUD_CREDENTIALS='{"type":"service_account",...}'
GCS_BUCKET_NAME="your-gcs-bucket-name"
NEXT_PUBLIC_GCS_BUCKET_NAME="your-gcs-bucket-name"`}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold">3. CORS Configuration for GCS Bucket:</h3>
              <p>Add the following CORS policy to your GCS bucket:</p>
              <pre className="bg-gray-100 p-2 rounded text-xs mt-2">
{`[
  {
    "origin": ["http://localhost:3000"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type", "Range"],
    "maxAgeSeconds": 3600
  }
]`}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold">4. Public Access (for demo):</h3>
              <p>To make videos publicly accessible, set bucket permissions:</p>
              <pre className="bg-gray-100 p-2 rounded text-xs mt-2">
{`gsutil iam ch allUsers:objectViewer gs://your-bucket-name`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
