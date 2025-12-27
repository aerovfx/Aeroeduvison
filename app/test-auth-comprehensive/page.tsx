'use client';

"use client"

import { useState, useEffect } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  User, 
  Shield, 
  Clock,
  RefreshCw,
  LogOut,
  LogIn,
  Eye,
  EyeOff
} from "lucide-react"

interface TestResult {
  test: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: any
}

export default function ComprehensiveAuthTestPage() {
  const { data: session, status, update } = useSession()
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [testCredentials, setTestCredentials] = useState({
    email: "",
    password: ""
  })
  const [showPassword, setShowPassword] = useState(false)

  // Test users for different scenarios
  const testUsers = [
    { email: "teacher@example.com", password: "teacher123", role: "TEACHER", name: "Test Teacher" },
    { email: "student@example.com", password: "student123", role: "STUDENT", name: "Test Student" },
    { email: "admin@example.com", password: "admin123", role: "ADMIN", name: "Test Admin" }
  ]

  const runAuthTests = async () => {
    setIsRunningTests(true)
    setTestResults([])
    const results: TestResult[] = []

    // Test 1: Session Status Check
    try {
      if (status === "loading") {
        results.push({
          test: "Session Loading State",
          status: "warning",
          message: "Session is still loading"
        })
      } else if (status === "unauthenticated") {
        results.push({
          test: "Session Status",
          status: "pass",
          message: "No active session (expected for unauthenticated state)"
        })
      } else if (session) {
        results.push({
          test: "Session Status",
          status: "pass",
          message: `Active session found for user: ${session.user.email}`,
          details: session
        })
      }
    } catch (error) {
      results.push({
        test: "Session Status Check",
        status: "fail",
        message: `Error checking session: ${error}`
      })
    }

    // Test 2: Role-based Access
    if (session) {
      try {
        const role = session.user.role
        const validRoles = ["STUDENT", "TEACHER", "ADMIN"]
        
        if (validRoles.includes(role)) {
          results.push({
            test: "Role Validation",
            status: "pass",
            message: `Valid role: ${role}`
          })
        } else {
          results.push({
            test: "Role Validation",
            status: "fail",
            message: `Invalid role: ${role}. Expected one of: ${validRoles.join(", ")}`
          })
        }
      } catch (error) {
        results.push({
          test: "Role Validation",
          status: "fail",
          message: `Error validating role: ${error}`
        })
      }
    }

    // Test 3: Session Data Integrity
    if (session) {
      try {
        const requiredFields = ["id", "email", "role"]
        const missingFields = requiredFields.filter(field => !session.user[field as keyof typeof session.user])
        
        if (missingFields.length === 0) {
          results.push({
            test: "Session Data Integrity",
            status: "pass",
            message: "All required session fields present"
          })
        } else {
          results.push({
            test: "Session Data Integrity",
            status: "fail",
            message: `Missing required fields: ${missingFields.join(", ")}`
          })
        }
      } catch (error) {
        results.push({
          test: "Session Data Integrity",
          status: "fail",
          message: `Error checking session data: ${error}`
        })
      }
    }

    // Test 4: JWT Token Validation
    try {
      const response = await fetch("/api/test-auth")
      const data = await response.json()
      
      if (response.ok) {
        results.push({
          test: "JWT Token Validation",
          status: "pass",
          message: "JWT token is valid and accessible via API"
        })
      } else {
        results.push({
          test: "JWT Token Validation",
          status: "fail",
          message: `JWT validation failed: ${data.message}`
        })
      }
    } catch (error) {
      results.push({
        test: "JWT Token Validation",
        status: "fail",
        message: `Error validating JWT: ${error}`
      })
    }

    // Test 5: Session Persistence
    if (session) {
      try {
        // Wait a bit and check if session is still valid
        await new Promise(resolve => setTimeout(resolve, 1000))
        const currentSession = await update()
        
        if (currentSession && currentSession.user.id === session.user.id) {
          results.push({
            test: "Session Persistence",
            status: "pass",
            message: "Session persists correctly"
          })
        } else {
          results.push({
            test: "Session Persistence",
            status: "warning",
            message: "Session may have changed or expired"
          })
        }
      } catch (error) {
        results.push({
          test: "Session Persistence",
          status: "fail",
          message: `Error testing session persistence: ${error}`
        })
      }
    }

    setTestResults(results)
    setIsRunningTests(false)
  }

  const testLogin = async (email: string, password: string) => {
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        setTestResults(prev => [...prev, {
          test: `Login Test - ${email}`,
          status: "pass",
          message: "Login successful"
        }])
      } else {
        setTestResults(prev => [...prev, {
          test: `Login Test - ${email}`,
          status: "fail",
          message: `Login failed: ${result?.error || "Unknown error"}`
        }])
      }
    } catch (error) {
      setTestResults(prev => [...prev, {
        test: `Login Test - ${email}`,
        status: "fail",
        message: `Login error: ${error}`
      }])
    }
  }

  const testLogout = async () => {
    try {
      await signOut({ redirect: false })
      setTestResults(prev => [...prev, {
        test: "Logout Test",
        status: "pass",
        message: "Logout successful"
      }])
    } catch (error) {
      setTestResults(prev => [...prev, {
        test: "Logout Test",
        status: "fail",
        message: `Logout error: ${error}`
      }])
    }
  }

  const testSessionCleanup = async () => {
    if (!session) {
      setTestResults(prev => [...prev, {
        test: "Session Cleanup Test",
        status: "warning",
        message: "No active session to test cleanup"
      }])
      return
    }

    const currentUserId = session.user.id
    const currentUserEmail = session.user.email

    try {
      // Sign out current user
      await signOut({ redirect: false })
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Try to sign in with different user
      const otherUser = testUsers.find(user => user.email !== currentUserEmail)
      if (otherUser) {
        const result = await signIn("credentials", {
          email: otherUser.email,
          password: otherUser.password,
          redirect: false,
        })

        if (result?.ok) {
          setTestResults(prev => [...prev, {
            test: "Session Cleanup Test",
            status: "pass",
            message: `Successfully switched from ${currentUserEmail} to ${otherUser.email}`
          }])
        } else {
          setTestResults(prev => [...prev, {
            test: "Session Cleanup Test",
            status: "fail",
            message: `Failed to switch users: ${result?.error}`
          }])
        }
      }
    } catch (error) {
      setTestResults(prev => [...prev, {
        test: "Session Cleanup Test",
        status: "fail",
        message: `Session cleanup error: ${error}`
      }])
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-50 border-green-200'
      case 'fail':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🔐 Comprehensive Auth Testing</h1>
        <p className="text-gray-600">
          Test authentication system, session management, and role-based access control
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="session">Session Tests</TabsTrigger>
          <TabsTrigger value="login">Login Tests</TabsTrigger>
          <TabsTrigger value="security">Security Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Current Session Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {status === "loading" ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading session...
                </div>
              ) : session ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Authenticated
                    </Badge>
                    <Badge variant="outline">
                      <Shield className="h-3 w-3 mr-1" />
                      {session.user.role}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>ID:</strong> {session.user.id}
                    </div>
                    <div>
                      <strong>Email:</strong> {session.user.email}
                    </div>
                    <div>
                      <strong>Name:</strong> {session.user.name || "N/A"}
                    </div>
                    <div>
                      <strong>Role:</strong> {session.user.role}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-gray-50 text-gray-700">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Authenticated
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={runAuthTests} 
                  disabled={isRunningTests}
                  className="flex items-center gap-2"
                >
                  {isRunningTests ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Run All Tests
                </Button>
                
                {session ? (
                  <Button 
                    onClick={testLogout} 
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Test Logout
                  </Button>
                ) : (
                  <Button 
                    onClick={testSessionCleanup} 
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Test Session Cleanup
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="session" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Session Management Tests</CardTitle>
              <CardDescription>
                Test session persistence, validation, and cleanup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={runAuthTests} 
                  disabled={isRunningTests}
                  className="w-full"
                >
                  {isRunningTests ? "Running Tests..." : "Run Session Tests"}
                </Button>
                
                {testResults.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Test Results:</h3>
                    {testResults.map((result, index) => (
                      <Alert key={index} className={getStatusColor(result.status)}>
                        <div className="flex items-start gap-2">
                          {getStatusIcon(result.status)}
                          <div className="flex-1">
                            <AlertDescription>
                              <strong>{result.test}:</strong> {result.message}
                              {result.details && (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-sm text-gray-600">
                                    View Details
                                  </summary>
                                  <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto">
                                    {JSON.stringify(result.details, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="login" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Login Tests</CardTitle>
              <CardDescription>
                Test authentication with different user roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {testUsers.map((user) => (
                    <Card key={user.email} className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold">{user.name}</h4>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <Badge variant="outline" className="mt-1">
                            {user.role}
                          </Badge>
                        </div>
                        <Button 
                          onClick={() => testLogin(user.email, user.password)}
                          size="sm"
                          className="w-full"
                        >
                          <LogIn className="h-4 w-4 mr-2" />
                          Test Login
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Custom Login Test</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={testCredentials.email}
                        onChange={(e) => setTestCredentials(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={testCredentials.password}
                          onChange={(e) => setTestCredentials(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Enter password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={() => testLogin(testCredentials.email, testCredentials.password)}
                    className="mt-3"
                    disabled={!testCredentials.email || !testCredentials.password}
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Test Custom Login
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Tests</CardTitle>
              <CardDescription>
                Test edge cases and security scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={testSessionCleanup}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <RefreshCw className="h-6 w-6 mb-2" />
                    <span>Session Cleanup</span>
                    <span className="text-xs text-gray-500">Test user switching</span>
                  </Button>
                  
                  <Button 
                    onClick={() => testLogin("invalid@example.com", "wrongpassword")}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <XCircle className="h-6 w-6 mb-2" />
                    <span>Invalid Credentials</span>
                    <span className="text-xs text-gray-500">Test error handling</span>
                  </Button>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Security Test Notes:</strong>
                    <ul className="mt-2 text-sm space-y-1">
                      <li>• Session cleanup ensures old sessions are properly invalidated</li>
                      <li>• Invalid credentials should be rejected without exposing user data</li>
                      <li>• Role-based access should be enforced at middleware level</li>
                      <li>• JWT tokens should expire and be refreshed appropriately</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
