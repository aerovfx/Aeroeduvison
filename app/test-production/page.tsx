"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestProductionPage() {
  const { data: session, status } = useSession()
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
        data: data
      })
    } catch (error) {
      setResult({ error: error.toString() })
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") return <div>Loading session...</div>

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Production Test</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Session Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p><strong>Status:</strong> {status}</p>
          {session ? (
            <div>
              <p><strong>User:</strong> {session.user?.email}</p>
              <p><strong>Role:</strong> {session.user?.role}</p>
              <p><strong>Name:</strong> {session.user?.name}</p>
            </div>
          ) : (
            <p>Not authenticated</p>
          )}
        </CardContent>
      </Card>

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
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <div className="text-sm space-y-1">
          <div>1. Make sure you're logged in</div>
          <div>2. Click "Test GCS Upload API" button</div>
          <div>3. Check the result below</div>
          <div>4. If status is 401, authentication is not working</div>
          <div>5. If status is 200, GCS upload is working</div>
        </div>
      </div>
    </div>
  )
}

