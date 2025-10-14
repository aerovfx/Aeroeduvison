"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Key, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function ChangePasswordPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess(false)

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError("Vui lòng điền đầy đủ thông tin")
      setIsLoading(false)
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Mật khẩu mới không khớp")
      setIsLoading(false)
      return
    }

    if (formData.newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự")
      setIsLoading(false)
      return
    }

    if (formData.newPassword === formData.currentPassword) {
      setError("Mật khẩu mới phải khác mật khẩu cũ")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
        
        // Show success message then redirect
        setTimeout(() => {
          router.push("/dashboard/profile")
        }, 2000)
      } else {
        setError(data.error || "Không thể đổi mật khẩu. Vui lòng thử lại.")
      }
    } catch (error) {
      setError("Có lỗi xảy ra. Vui lòng thử lại.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!session?.user) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">Đang tải...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Back Button */}
      <Link href="/dashboard/profile">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Quay lại hồ sơ
        </Button>
      </Link>

      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold">Đổi mật khẩu</h1>
        <p className="text-gray-600 mt-2">Cập nhật mật khẩu của bạn để bảo mật tài khoản</p>
      </div>

      {/* Success Message */}
      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <div>
                <p className="font-medium">Đổi mật khẩu thành công!</p>
                <p className="text-sm text-green-700">Đang chuyển về trang hồ sơ...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Password Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Thay đổi mật khẩu
          </CardTitle>
          <CardDescription>
            Nhập mật khẩu hiện tại và mật khẩu mới của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
              <Input
                id="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                placeholder="Nhập mật khẩu hiện tại"
                disabled={isLoading || success}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                disabled={isLoading || success}
                required
              />
              <p className="text-xs text-gray-500">
                Mật khẩu nên có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Nhập lại mật khẩu mới"
                disabled={isLoading || success}
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isLoading || success}
                className="gap-2"
              >
                <Key className="w-4 h-4" />
                {isLoading ? "Đang xử lý..." : "Đổi mật khẩu"}
              </Button>
              <Link href="/dashboard/profile">
                <Button type="button" variant="outline" disabled={isLoading}>
                  Hủy
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">💡 Mẹo bảo mật</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>✓ Sử dụng mật khẩu mạnh với ít nhất 8 ký tự</p>
          <p>✓ Kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt</p>
          <p>✓ Không sử dụng thông tin cá nhân dễ đoán</p>
          <p>✓ Không chia sẻ mật khẩu với người khác</p>
          <p>✓ Thay đổi mật khẩu định kỳ</p>
        </CardContent>
      </Card>
    </div>
  )
}


