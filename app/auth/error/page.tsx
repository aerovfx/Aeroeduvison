'use client'

import { useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

const errorMessages: Record<string, string> = {
  'Configuration': 'There is a problem with the server configuration.',
  'AccessDenied': 'You do not have permission to sign in.',
  'Verification': 'The verification token has expired or is invalid.',
  'Default': 'An error occurred during authentication.',
  'CredentialsSignin': 'Invalid email or password.',
  'OAuthSignin': 'Error occurred during OAuth sign in.',
  'OAuthCallback': 'Error occurred during OAuth callback.',
  'OAuthCreateAccount': 'Could not create OAuth account.',
  'EmailCreateAccount': 'Could not create email account.',
  'Callback': 'Error occurred during callback.',
  'OAuthAccountNotLinked': 'Email already exists with different provider.',
  'EmailSignin': 'Check your email for the sign in link.',
  'SessionRequired': 'Please sign in to access this page.',
}

function AuthErrorPageContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'Default'
  const message = errorMessages[error] || errorMessages['Default']

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Error Icon */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Authentication Error</h2>
          <p className="mt-2 text-sm text-gray-600">
            Something went wrong during the authentication process
          </p>
        </div>

        {/* Error Details */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center space-y-4">
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-red-800 font-medium">{message}</p>
              {error !== 'Default' && (
                <p className="text-red-600 text-sm mt-2">Error code: {error}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link
                href="/auth/signin"
                className="w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Link>

              <button
                onClick={() => window.location.reload()}
                className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </button>
            </div>

            {/* Help Text */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                If this problem persists, please contact support or try signing in with a different method.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>© 2025 LMS Math. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthErrorPageContent />
    </Suspense>
  )
}
