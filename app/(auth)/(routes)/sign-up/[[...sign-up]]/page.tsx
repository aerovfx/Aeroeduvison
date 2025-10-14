"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "STUDENT"
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      console.log("🔄 Starting registration...", { email: formData.email, name: formData.name })
      
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      })

      const data = await response.json()
      console.log("📬 Registration response:", { status: response.status, data })

      if (response.ok && data.userId) {
        console.log("✅ Registration successful, starting auto-login...")
        
        // Auto-login after successful registration
        const loginResult = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        })

        console.log("🔐 Login result:", loginResult)

        if (loginResult?.error) {
          console.error("❌ Auto-login failed:", loginResult.error)
          // If auto-login fails, redirect to sign-in page
          setError("Tài khoản đã được tạo. Vui lòng đăng nhập.")
          setTimeout(() => {
            router.push("/sign-in?message=Account created. Please sign in.")
          }, 2000)
        } else if (loginResult?.ok) {
          console.log("✅ Auto-login successful, checking session...")
          
          // Wait for session to be created
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Verify session
          const sessionResponse = await fetch("/api/auth/session")
          const session = await sessionResponse.json()
          console.log("📊 Session after login:", session)
          
          if (session?.user) {
            console.log("✅ Session valid, redirecting to dashboard...")
            // Login successful, redirect to dashboard
            router.push("/dashboard")
            router.refresh() // Force refresh to load new session
          } else {
            console.warn("⚠️ Session not created, redirecting to sign-in...")
            setError("Vui lòng đăng nhập để tiếp tục.")
            setTimeout(() => {
              router.push("/sign-in")
            }, 1500)
          }
        } else {
          console.error("❌ Unexpected login result:", loginResult)
          setError("Tài khoản đã được tạo. Vui lòng đăng nhập.")
          setTimeout(() => {
            router.push("/sign-in")
          }, 2000)
        }
      } else {
        console.error("❌ Registration failed:", data)
        
        // Show specific error message
        if (data.error === "User already exists") {
          setError("Email này đã được đăng ký. Vui lòng đăng nhập hoặc sử dụng email khác.")
        } else {
          setError(data.error || data.details || "Có lỗi xảy ra. Vui lòng thử lại.")
        }
      }
    } catch (error) {
      console.error("❌ Registration exception:", error)
      setError("Không thể kết nối đến server. Vui lòng thử lại.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleGoogleSignUp = async () => {
    setIsLoading(true)
    setError("")
    
    try {
      await signIn("google", { 
        callbackUrl: "/dashboard",
        redirect: false 
      })
    } catch (error) {
      setError("Failed to sign up with Google")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Sign Up</CardTitle>
          <CardDescription className="text-center">
            Create a new account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => handleChange("role", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role">
                    {formData.role === "STUDENT" ? "Student" : formData.role === "TEACHER" ? "Teacher" : "Select your role"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="TEACHER">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-50 px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignUp}
            disabled={isLoading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}