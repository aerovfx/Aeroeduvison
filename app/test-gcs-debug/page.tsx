'use client';

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TestGCSDebugPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      addLog(`File selected: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      setFile(null);
      addLog("No file selected");
    }
  };

  const testDirectUpload = async () => {
    if (!file) {
      setResult("❌ Please select a file first.");
      return;
    }

    setLoading(true);
    setResult("");
    addLog("Starting direct upload test...");

    try {
      const bucketName = "mathvideostore";
      const fileName = `test-uploads/${Date.now()}-${file.name}`;
      const url = `https://storage.googleapis.com/${bucketName}/${fileName}`;
      
      addLog(`Upload URL: ${url}`);
      addLog(`File type: ${file.type}`);
      addLog(`File size: ${file.size} bytes`);
      
      console.log("Attempting direct upload to:", url);
      addLog("Making fetch request...");
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      addLog(`Response status: ${response.status} ${response.statusText}`);
      console.log("Upload response:", response.status, response.statusText);

      if (response.ok) {
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        setResult(`✅ Upload successful! URL: ${publicUrl}`);
        addLog("Upload successful!");
      } else {
        const errorText = await response.text();
        setResult(`❌ Upload failed: ${response.status} ${response.statusText}\n${errorText}`);
        addLog(`Upload failed: ${response.status} ${response.statusText}`);
        addLog(`Error details: ${errorText}`);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      setResult(`❌ Error: ${error.message}`);
      addLog(`Error: ${error.message}`);
      addLog(`Error type: ${error.name}`);
    } finally {
      setLoading(false);
      addLog("Upload test completed");
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setResult("");
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">🔍 GCS Upload Debug</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
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

          <Button onClick={testDirectUpload} disabled={!file || loading} className="w-full">
            {loading ? "Uploading..." : "Test Direct Upload"}
          </Button>

          {result && (
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Result:</h3>
              <pre className="text-sm whitespace-pre-wrap">{result}</pre>
            </div>
          )}
        </div>

        {/* Debug Logs */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Debug Logs:</h3>
            <Button onClick={clearLogs} variant="outline" size="sm">
              Clear Logs
            </Button>
          </div>
          
          <div className="p-4 bg-gray-100 rounded-lg h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No logs yet...</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono text-gray-700">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium mb-2">📋 Debug Instructions:</h3>
        <ul className="text-sm space-y-1">
          <li>• Select a small file (&lt; 1MB) for testing</li>
          <li>• Watch the debug logs for detailed information</li>
          <li>• Check browser console for additional errors</li>
          <li>• Expected result: 403 Forbidden (no CORS error)</li>
        </ul>
      </div>
    </div>
  );
}
