"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { Upload, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface GCSUploadProps {
  onUploadComplete: (url: string, key: string) => void;
  accept?: string;
  maxSize?: number; // in MB
  uploadType: "course-image" | "chapter-video" | "attachment";
}

export const GCSUpload = ({ onUploadComplete, accept, maxSize, uploadType }: GCSUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      if (maxSize && selectedFile.size > maxSize * 1024 * 1024) {
        toast.error(`File size exceeds ${maxSize}MB limit.`);
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setUploadProgress(0);
    } else {
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      // 1. Get presigned URL from our API
      const presignedUrlRes = await fetch("/api/upload/gcs-presigned-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          uploadType: uploadType,
        }),
      });

      const { url: signedUrl, key } = await presignedUrlRes.json();

      if (!presignedUrlRes.ok) {
        throw new Error("Failed to get presigned URL.");
      }

      // 2. Upload file directly to GCS using the presigned URL
      const xhr = new XMLHttpRequest();
      
      // Configure XHR with better error handling
      xhr.open("PUT", signedUrl, true);
      xhr.setRequestHeader("Content-Type", file.type);
      
      // Set longer timeout for large files
      xhr.timeout = 10 * 60 * 1000; // 10 minutes
      
      console.log("Starting GCS upload:", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        signedUrl: signedUrl.substring(0, 100) + "..."
      });

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentCompleted = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(percentCompleted);
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      };

      xhr.onload = () => {
        console.log("XHR Upload completed:", {
          status: xhr.status,
          statusText: xhr.statusText,
          readyState: xhr.readyState
        });
        
        if (xhr.status >= 200 && xhr.status < 300) {
          // Generate the final public URL
          const bucketName = process.env.NEXT_PUBLIC_GCS_BUCKET_NAME || 'mathvideostore';
          const publicUrl = `https://storage.googleapis.com/${bucketName}/${key}`;
          
          console.log("Upload successful:", publicUrl);
          onUploadComplete(publicUrl, key);
          toast.success("File uploaded successfully to GCS!");
          setFile(null);
        } else {
          console.error("GCS Upload Failed:", {
            status: xhr.status,
            statusText: xhr.statusText,
            responseText: xhr.responseText,
            responseURL: xhr.responseURL
          });
          toast.error(`GCS upload failed: ${xhr.status} ${xhr.statusText}`);
        }
        setLoading(false);
      };

      xhr.onerror = () => {
        console.error("GCS Upload Network Error:", {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText,
          readyState: xhr.readyState
        });
        toast.error(`Network error during GCS upload. Status: ${xhr.status || 'Unknown'}`);
        setLoading(false);
      };

      xhr.ontimeout = () => {
        console.error("GCS Upload Timeout");
        toast.error("Upload timeout. Please try again with a smaller file.");
        setLoading(false);
      };

      xhr.onabort = () => {
        console.error("GCS Upload Aborted");
        toast.error("Upload was cancelled.");
        setLoading(false);
      };

      try {
        console.log("Sending file to GCS...");
        xhr.send(file);
      } catch (error: any) {
        console.error("XHR Send Error:", error);
        toast.error(`Upload failed: ${error.message}`);
        setLoading(false);
      }

    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="gcs-file-upload" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Upload File to GCS
        </label>
        <div className="flex items-center gap-4">
          <Input
            id="gcs-file-upload"
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="gcs-file-upload"
            className="flex items-center gap-2 justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            {file ? file.name : "Choose File"}
          </label>
          <Button onClick={handleUpload} disabled={!file || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? "Uploading..." : "Upload to GCS"}
          </Button>
        </div>
      </div>
      {loading && uploadProgress > 0 && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-sm text-muted-foreground text-center">{uploadProgress}% uploaded to GCS</p>
        </div>
      )}
      {file && !loading && (
        <p className="text-sm text-muted-foreground">Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
      )}
    </div>
  );
};
