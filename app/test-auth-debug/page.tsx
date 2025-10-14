"use client"

import { useSession, signOut, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function TestAuthDebugPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    // Collect debug information
    const info = {
      session,
      status,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'SSR',
      timestamp: new Date().toISOString(),
      cookies: typeof document !== 'undefined' ? document.cookie : 'No cookies in SSR'
    }
    setDebugInfo(info)
  }, [session, status])

  if (status === "loading") {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Auth Debug - Loading...</h1>
        <div className="animate-pulse bg-gray-200 h-4 w-full rounded"></div>
      </div>
    )
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/sign-in" })
  }

  const handleRedirect = () => {
    console.log("Current session:", session)
    console.log("User role:", session?.user?.role)
    
    if (session?.user?.role === "ADMIN") {
      console.log("Redirecting to admin dashboard")
      router.push("/admin/dashboard")
    } else if (session?.user?.role === "TEACHER") {
      console.log("Redirecting to teacher courses")
      router.push("/teacher/courses")
    } else if (session?.user?.role === "STUDENT") {
      console.log("Redirecting to student dashboard")
      router.push("/dashboard")
    } else {
      console.log("No role found, redirecting to home")
      router.push("/")
    }
  }

  const testCredentials = async () => {
    // Test with admin credentials
    const result = await signIn('credentials', {
      email: 'admin@example.com',
      password: 'admin123',
      redirect: false
    })
    console.log("Sign in result:", result)
  }

  const testGoogle = async () => {
    await signIn('google', { callbackUrl: '/test-auth-debug' })
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔍 Auth Debug Page</h1>
      
      {/* Status Card */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3 text-blue-800">Authentication Status</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Status:</strong> <span className={status === "authenticated" ? "text-green-600" : "text-red-600"}>{status}</span>
          </div>
          <div>
            <strong>Authenticated:</strong> <span className={session ? "text-green-600" : "text-red-600"}>{session ? "Yes" : "No"}</span>
          </div>
        </div>
      </div>

      {/* Session Information */}
      {session && (
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3">Session Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><strong>User ID:</strong> {session.user.id || "Not available"}</div>
            <div><strong>Email:</strong> {session.user.email || "Not available"}</div>
            <div><strong>Name:</strong> {session.user.name || "Not available"}</div>
            <div><strong>Role:</strong> <span className="font-mono bg-yellow-100 px-2 py-1 rounded">{session.user.role || "Not available"}</span></div>
            <div><strong>Image:</strong> {session.user.image || "No image"}</div>
          </div>
        </div>
      )}

      {/* Debug Information */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Debug Information</h2>
        <pre className="text-xs overflow-auto bg-white p-3 rounded border max-h-96">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      {/* Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Test Actions</h2>
        
        <div className="flex flex-wrap gap-3">
          {!session ? (
            <>
              <button
                onClick={testCredentials}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Test Admin Login (credentials)
              </button>
              <button
                onClick={testGoogle}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Test Google Login
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleRedirect}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Go to Dashboard (based on role)
              </button>
              <button
                onClick={handleSignOut}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expected Behavior */}
      <div className="mt-8 p-4 bg-yellow-100 rounded-lg">
        <h3 className="font-semibold mb-2">Expected Behavior:</h3>
        <ul className="text-sm space-y-1">
          <li>• ADMIN role → /admin/dashboard</li>
          <li>• TEACHER role → /teacher/courses</li>
          <li>• STUDENT role → /dashboard</li>
          <li>• No role or unauthenticated → /sign-in</li>
        </ul>
      </div>

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

