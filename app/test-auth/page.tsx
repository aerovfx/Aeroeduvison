"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function TestAuthPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return <div className="p-8">Loading...</div>
  }

  if (!session) {
    return <div className="p-8">Not authenticated</div>
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/sign-in" })
  }

  const handleRedirect = () => {
    if (session.user.role === "ADMIN") {
      router.push("/admin/dashboard")
    } else if (session.user.role === "TEACHER") {
      router.push("/teacher/courses")
    } else if (session.user.role === "STUDENT") {
      router.push("/dashboard")
    } else {
      router.push("/")
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Auth Test Page</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Session Information:</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>

      <div className="space-y-4">
        <div>
          <strong>User ID:</strong> {session.user.id}
        </div>
        <div>
          <strong>Email:</strong> {session.user.email}
        </div>
        <div>
          <strong>Name:</strong> {session.user.name}
        </div>
        <div>
          <strong>Role:</strong> {session.user.role}
        </div>
        <div>
          <strong>Image:</strong> {session.user.image || "No image"}
        </div>
      </div>

      <div className="mt-6 space-x-4">
        <button
          onClick={handleRedirect}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Go to Dashboard (based on role)
        </button>
        <button
          onClick={handleSignOut}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>

      <div className="mt-6 p-4 bg-yellow-100 rounded-lg">
        <h3 className="font-semibold mb-2">Expected Redirects:</h3>
        <ul className="text-sm space-y-1">
          <li>• ADMIN → /admin/dashboard</li>
          <li>• TEACHER → /teacher/courses</li>
          <li>• STUDENT → /dashboard</li>
        </ul>
      </div>
    </div>
  )
}