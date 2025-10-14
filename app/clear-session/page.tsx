"use client"

import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function ClearSessionPage() {
  const router = useRouter()
  const [status, setStatus] = useState("Clearing all session data...")
  const [steps, setSteps] = useState<string[]>([])

  const addStep = (step: string) => {
    setSteps(prev => [...prev, step])
  }

  useEffect(() => {
    async function clearEverything() {
      try {
        // Step 1: Sign out from NextAuth
        addStep("1. Signing out from NextAuth...")
        await signOut({ redirect: false })
        addStep("✅ NextAuth sign out complete")

        // Step 2: Clear localStorage
        addStep("2. Clearing localStorage...")
        localStorage.clear()
        addStep("✅ localStorage cleared")

        // Step 3: Clear sessionStorage
        addStep("3. Clearing sessionStorage...")
        sessionStorage.clear()
        addStep("✅ sessionStorage cleared")

        // Step 4: Clear all cookies
        addStep("4. Clearing all cookies...")
        const cookies = document.cookie.split(";")
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i]
          const eqPos = cookie.indexOf("=")
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
        }
        addStep("✅ Cookies cleared")

        // Step 5: Clear caches
        addStep("5. Clearing service worker caches...")
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(cacheNames.map(name => caches.delete(name)))
          addStep(`✅ ${cacheNames.length} cache(s) cleared`)
        }

        // Step 6: Success
        addStep("")
        addStep("🎉 All session data cleared successfully!")
        addStep("")
        addStep("Redirecting to sign-in page in 3 seconds...")
        
        setStatus("Complete! Redirecting...")

        // Redirect after 3 seconds
        setTimeout(() => {
          window.location.href = "/sign-in"
        }, 3000)

      } catch (error) {
        addStep(`❌ Error: ${error}`)
        setStatus("Error occurred!")
      }
    }

    clearEverything()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧹 Clearing Session Data
          </h1>
          <p className="text-gray-600">{status}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
          <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap">
            {steps.map((step, idx) => (
              <div key={idx} className="mb-1">
                {step}
              </div>
            ))}
          </pre>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Why is this needed?</strong>
          </p>
          <p className="text-sm text-blue-700 mt-2">
            When NEXTAUTH_SECRET changes, old JWT cookies cannot be decrypted.
            This causes the session to appear as "unauthenticated" even though
            login is successful. Clearing all cookies fixes this issue.
          </p>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => window.location.href = "/sign-in"}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    </div>
  )
}


