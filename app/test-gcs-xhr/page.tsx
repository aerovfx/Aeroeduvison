'use client';

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TestGCSXHRPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const testXHRUpload = () => {
    if (!file) {
      setResult("❌ Please select a file first.");
      return;
    }

    setLoading(true);
    setResult("");

    const bucketName = "mathvideostore";
    const fileName = `test-uploads/${Date.now()}-${file.name}`;
    const url = `https://storage.googleapis.com/${bucketName}/${fileName}`;
    
    console.log("Attempting XHR upload to:", url);

    const xhr = new XMLHttpRequest();
    
    xhr.onload = function() {
      console.log("XHR Response:", xhr.status, xhr.statusText);
      if (xhr.status >= 200 && xhr.status < 300) {
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        setResult(`✅ Upload successful! URL: ${publicUrl}`);
      } else {
        setResult(`❌ Upload failed: ${xhr.status} ${xhr.statusText}\n${xhr.responseText}`);
      }
      setLoading(false);
    };

    xhr.onerror = function() {
      console.error("XHR Error:", xhr.status, xhr.statusText);
      setResult(`❌ XHR Error: ${xhr.status} ${xhr.statusText}`);
      setLoading(false);
    };

    xhr.ontimeout = function() {
      console.error("XHR Timeout");
      setResult("❌ Upload timeout");
      setLoading(false);
    };

    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.timeout = 30000; // 30 seconds

    try {
      xhr.send(file);
    } catch (error: any) {
      console.error("XHR Send Error:", error);
      setResult(`❌ Send Error: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">🧪 GCS XHR Upload Test</h1>
      
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select File:</label>
          <Input
            type="file"
            onChange={handleFileChange}
            accept="image/*,video/*,.pdf,.txt"
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <Button onClick={testXHRUpload} disabled={!file || loading} className="w-full">
          {loading ? "Uploading..." : "Test XHR Upload"}
        </Button>

        {result && (
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">Result:</h3>
            <pre className="text-sm whitespace-pre-wrap">{result}</pre>
          </div>
        )}

        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium mb-2">📋 XHR vs Fetch:</h3>
          <ul className="text-sm space-y-1">
            <li>• XHR có thể handle CORS khác với fetch</li>
            <li>• XHR có timeout và error handling tốt hơn</li>
            <li>• Expected result: 403 Forbidden (no CORS error)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
