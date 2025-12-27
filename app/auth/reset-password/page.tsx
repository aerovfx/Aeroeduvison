'use client';

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { toast } from "react-hot-toast"
import { useLanguage } from '@/contexts/LanguageContext';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthLabel } from "@/lib/password-validation"

function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'fair' | 'good' | 'strong' | 'very-strong' | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      toast.error("Invalid reset link")
      router.push("/auth/forgot-password")
      return
    }
    setToken(tokenParam)
  }, [searchParams, router])

  // Validate password on change
  useEffect(() => {
    if (password) {
      const validation = validatePassword(password)
      setPasswordStrength(validation.strength)
      setPasswordErrors(validation.errors)
    } else {
      setPasswordStrength(null)
      setPasswordErrors([])
    }
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Client-side validation
    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      setIsLoading(false)
      return
    }

    // Validate password strength
    const validation = validatePassword(password)
    if (!validation.isValid) {
      toast.error("Password does not meet requirements")
      setPasswordErrors(validation.errors)
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setIsSuccess(true)
        toast.success(data.message || "Password reset successfully!")
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push("/auth/login")
        }, 2000)
      } else {
        // Handle API validation errors
        if (data.errors && Array.isArray(data.errors)) {
          setPasswordErrors(data.errors)
          toast.error(data.error || "Password validation failed")
        } else {
          toast.error(data.error || "Something went wrong")
        }
      }
    } catch (error) {
      toast.error("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Password Reset Successfully</CardTitle>
            <CardDescription className="text-center">
              Your password has been updated successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/auth/login">
              <Button className="w-full">
                Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Invalid Reset Link</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/auth/forgot-password">
              <Button>Request New Reset Link</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                className={passwordErrors.length > 0 ? "border-red-500" : ""}
              />
              
              {/* Password Strength Indicator */}
              {password && passwordStrength && (
                <div className="mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Strength:</span>
                    <span className={`text-xs font-medium ${getPasswordStrengthColor(passwordStrength)}`}>
                      {getPasswordStrengthLabel(passwordStrength)}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Password Validation Errors */}
              {passwordErrors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {passwordErrors.map((error, index) => (
                    <p key={index} className="text-xs text-red-600">
                      • {error}
                    </p>
                  ))}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                className={confirmPassword && password !== confirmPassword ? "border-red-500" : ""}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600">Passwords do not match</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || passwordErrors.length > 0 || password !== confirmPassword}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Link href="/auth/login" className="text-sm text-blue-600 hover:underline">
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  const { t } = useLanguage();

  return (
    <Suspense fallback={<div>{t('common.loading')}</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}

// Disable static generation
export const dynamic = 'force-dynamic'
