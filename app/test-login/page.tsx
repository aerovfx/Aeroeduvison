"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestLoginPage() {
  const [email, setEmail] = useState("admin@example.com")
  const [password, setPassword] = useState("admin123")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testLogin = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      console.log("Testing login with:", email, password)
      
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      console.log("Login result:", result)
      setResult(result)

      if (result?.ok) {
        const session = await getSession()
        console.log("Session:", session)
        setResult(prev => ({ ...prev, session }))
      }
    } catch (error) {
      console.error("Login error:", error)
      setResult({ error: error.toString() })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Login</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email:</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password:</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin123"
            />
          </div>
          <Button onClick={testLogin} disabled={loading} className="w-full">
            {loading ? "Testing..." : "Test Login"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto bg-gray-100 p-3 rounded border">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

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

