"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugAuthPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [error, setError] = useState("")

  const testCredentials = async () => {
    setIsLoading(true)
    setError("")
    setDebugInfo({})

    try {
      console.log("Testing credentials login...")
      
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      console.log("Sign in result:", result)

      const debugData = {
        signInResult: result,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        email: email,
        hasPassword: !!password
      }

      if (result?.error) {
        debugData.error = result.error
        setError(`Login failed: ${result.error}`)
      } else if (result?.ok) {
        debugData.success = true
        
        // Try to get session
        try {
          const session = await getSession()
          debugData.session = session
          console.log("Session after login:", session)
        } catch (sessionError) {
          debugData.sessionError = sessionError
          console.error("Session error:", sessionError)
        }
      } else {
        debugData.unknownResult = true
        setError("Unknown result from signIn")
      }

      setDebugInfo(debugData)
    } catch (error) {
      console.error("Login error:", error)
      setError(`Login error: ${error}`)
      setDebugInfo({ error: error.toString(), timestamp: new Date().toISOString() })
    } finally {
      setIsLoading(false)
    }
  }

  const testGoogle = async () => {
    setIsLoading(true)
    setError("")
    
    try {
      console.log("Testing Google login...")
      const result = await signIn("google", { 
        callbackUrl: "/debug-auth",
        redirect: false 
      })
      console.log("Google sign in result:", result)
      setDebugInfo({ googleResult: result, timestamp: new Date().toISOString() })
    } catch (error) {
      console.error("Google login error:", error)
      setError(`Google login error: ${error}`)
      setDebugInfo({ googleError: error.toString(), timestamp: new Date().toISOString() })
      setIsLoading(false)
    }
  }

  const checkSession = async () => {
    try {
      const session = await getSession()
      console.log("Current session:", session)
      setDebugInfo(prev => ({ ...prev, currentSession: session, timestamp: new Date().toISOString() }))
    } catch (error) {
      console.error("Session check error:", error)
      setError(`Session check error: ${error}`)
    }
  }

  const testDatabase = async () => {
    try {
      const response = await fetch('/api/test-db')
      const data = await response.json()
      console.log("Database test:", data)
      setDebugInfo(prev => ({ ...prev, databaseTest: data, timestamp: new Date().toISOString() }))
    } catch (error) {
      console.error("Database test error:", error)
      setError(`Database test error: ${error}`)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔍 Auth Debug Page</h1>
      
      {/* Test Forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Credentials Test */}
        <Card>
          <CardHeader>
            <CardTitle>Test Credentials Login</CardTitle>
            <CardDescription>Test with email/password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin123"
              />
            </div>
            <Button onClick={testCredentials} disabled={isLoading} className="w-full">
              {isLoading ? "Testing..." : "Test Credentials"}
            </Button>
          </CardContent>
        </Card>

        {/* Google Test */}
        <Card>
          <CardHeader>
            <CardTitle>Test Google Login</CardTitle>
            <CardDescription>Test Google OAuth</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testGoogle} disabled={isLoading} variant="outline" className="w-full">
              {isLoading ? "Testing..." : "Test Google"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Debug Actions */}
      <div className="flex gap-4 mb-6">
        <Button onClick={checkSession} variant="outline">
          Check Current Session
        </Button>
        <Button onClick={testDatabase} variant="outline">
          Test Database Connection
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-red-800 mb-2">Error:</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Debug Information */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
          <CardDescription>Raw debug data from auth operations</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto bg-gray-100 p-4 rounded border max-h-96">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Test Accounts */}
      <div className="mt-6 p-4 bg-green-100 rounded-lg">
        <h3 className="font-semibold mb-2">Test Accounts:</h3>
        <div className="text-sm space-y-1">
          <div><strong>Admin:</strong> admin@example.com / admin123</div>
          <div><strong>Teacher:</strong> teacher@example.com / teacher123</div>
          <div><strong>Student:</strong> student@example.com / student123</div>
        </div>
      </div>
    </div>
  )
}

