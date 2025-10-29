'use client';

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestGCSSimplePage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testGCS = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/upload/gcs-presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: 'test.mp4',
          contentType: 'video/mp4',
          uploadType: 'chapter-video'
        }),
      })

      const data = await response.text()
      setResult({
        status: response.status,
        statusText: response.statusText,
        data: data,
        headers: Object.fromEntries(response.headers.entries())
      })
    } catch (error) {
      setResult({ error: error.toString() })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">GCS Upload Test</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test GCS Upload API</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={testGCS} disabled={loading} className="w-full">
            {loading ? "Testing..." : "Test GCS Upload API"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>API Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto bg-gray-100 p-3 rounded border">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 p-4 bg-blue-100 rounded-lg">
        <h3 className="font-semibold mb-2">Expected Results:</h3>
        <div className="text-sm space-y-1">
          <div>✅ <strong>Status 200:</strong> GCS upload working correctly</div>
          <div>⚠️ <strong>Status 401:</strong> Authentication required (normal behavior)</div>
          <div>❌ <strong>Status 500:</strong> Server error - needs fixing</div>
        </div>
      </div>
    </div>
  )
}