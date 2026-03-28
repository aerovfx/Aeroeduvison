'use client';

import { useSession, signOut } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Mail, Shield, Calendar, ArrowRightLeft, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useLanguage } from '@/contexts/LanguageContext';
import toast from "react-hot-toast"

export default function ProfilePage() {
  const { t } = useLanguage();

  const { data: session, update: updateSession } = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState("")
  const [selectedRole, setSelectedRole] = useState("")
  const [isSavingRole, setIsSavingRole] = useState(false)
  const [showRoleConfirm, setShowRoleConfirm] = useState(false)

  // Sync state when session loads
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "")
      setSelectedRole(session.user.role || "STUDENT")
    }
  }, [session?.user])

  if (!session?.user) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">Đang tải thông tin...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const user = session.user

  const getRoleBadge = (role: string) => {
    const badges = {
      ADMIN: { label: "Quản trị viên", className: "bg-red-100 text-red-800" },
      TEACHER: { label: "Giảng viên", className: "bg-blue-100 text-blue-800" },
      STUDENT: { label: "Học viên", className: "bg-green-100 text-green-800" },
    }
    return badges[role as keyof typeof badges] || { label: role, className: "bg-gray-100 text-gray-800" }
  }

  const roleBadge = getRoleBadge(user.role)
  const isAdmin = user.role === "ADMIN"
  const hasRoleChanged = selectedRole !== user.role

  const handleRoleChange = async () => {
    if (!hasRoleChanged) return

    setIsSavingRole(true)
    try {
      const response = await fetch("/api/user/role", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Không thể cập nhật vai trò")
        setSelectedRole(user.role) // Revert
        return
      }

      toast.success(
        `Đã chuyển sang ${selectedRole === "TEACHER" ? "Giảng viên" : "Học viên"}. Đang đăng xuất...`
      )

      // Wait a moment for the toast to show, then sign out
      setTimeout(() => {
        signOut({ callbackUrl: "/auth/login" })
      }, 1500)
    } catch (error) {
      console.error("Error updating role:", error)
      toast.error("Đã xảy ra lỗi khi cập nhật vai trò")
      setSelectedRole(user.role) // Revert
    } finally {
      setIsSavingRole(false)
      setShowRoleConfirm(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hồ sơ cá nhân</h1>
        <p className="text-gray-600 mt-2">Quản lý thông tin tài khoản của bạn</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin cá nhân</CardTitle>
          <CardDescription>
            Thông tin cơ bản về tài khoản của bạn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold ${
              user.role === "ADMIN" ? "bg-red-500" :
              user.role === "TEACHER" ? "bg-blue-500" :
              "bg-green-500"
            }`}>
              {user.name
                ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                : user.email?.[0]?.toUpperCase() || "U"}

              </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className="text-gray-600">{user.email}</p>
              <Badge className={`mt-2 ${roleBadge.className}`}>
                {roleBadge.label}
              </Badge>
            </div>
          </div>

          {/* Info Fields */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Họ và tên
              </Label>
              <Input
                id="name"
                value={name || user.name || ""}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
                placeholder="Nhập họ và tên"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                value={user.email || ""}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">
                Email không thể thay đổi
              </p>
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Vai trò hiện tại
              </Label>
              <Input
                value={roleBadge.label}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Mã người dùng
              </Label>
              <Input
                value={user.id}
                disabled
                className="bg-gray-50 font-mono text-xs"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            {!isEditing ? (
              <>
                <Button onClick={() => setIsEditing(true)}>
                  Chỉnh sửa thông tin
                </Button>
                <Link href="/dashboard/settings">
                  <Button variant="outline">
                    Cài đặt tài khoản
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Button onClick={() => {
                  // TODO: Implement save profile
                  setIsEditing(false)
                  alert("Chức năng cập nhật thông tin đang được phát triển")
                }}>
                  Lưu thay đổi
                </Button>
                <Button variant="outline" onClick={() => {
                  setName(user.name || "")
                  setIsEditing(false)
                }}>
                  Hủy
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Role Switcher Card */}
      {!isAdmin && (
        <Card className="border-2 border-dashed border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              Chuyển đổi vai trò
            </CardTitle>
            <CardDescription>
              Chuyển đổi giữa vai trò Học viên và Giảng viên. Hệ thống sẽ đăng xuất để cập nhật quyền truy cập.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => { setSelectedRole("STUDENT"); setShowRoleConfirm(false); }}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedRole === "STUDENT"
                    ? "border-green-500 bg-green-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    selectedRole === "STUDENT" ? "bg-green-500" : "bg-gray-300"
                  }`}>
                    S
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Học viên</p>
                    <p className="text-xs text-gray-500">STUDENT</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Truy cập khóa học, bài tập, AI Tutor và phòng thí nghiệm ảo.
                </p>
              </button>

              <button
                onClick={() => { setSelectedRole("TEACHER"); setShowRoleConfirm(false); }}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedRole === "TEACHER"
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    selectedRole === "TEACHER" ? "bg-blue-500" : "bg-gray-300"
                  }`}>
                    T
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Giảng viên</p>
                    <p className="text-xs text-gray-500">TEACHER</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Tạo khóa học, quản lý lớp học, ra đề thi và theo dõi học viên.
                </p>
              </button>
            </div>

            {/* Confirmation & Save */}
            {hasRoleChanged && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <p className="text-amber-800 text-sm font-medium">
                  ⚠️ Bạn đang chuyển từ <strong>{getRoleBadge(user.role).label}</strong> sang{" "}
                  <strong>{getRoleBadge(selectedRole).label}</strong>.
                </p>
                <p className="text-amber-700 text-sm">
                  Sau khi lưu, hệ thống sẽ <strong>đăng xuất</strong> và yêu cầu bạn đăng nhập lại để cập nhật quyền truy cập mới.
                </p>

                {!showRoleConfirm ? (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setShowRoleConfirm(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      Chuyển đổi vai trò
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedRole(user.role)}
                    >
                      Hủy
                    </Button>
                  </div>
                ) : (
                  <div className="bg-white border border-amber-300 rounded-lg p-3 space-y-3">
                    <p className="text-sm font-medium text-gray-800">
                      Xác nhận chuyển đổi vai trò?
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleRoleChange}
                        disabled={isSavingRole}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isSavingRole ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Đang lưu...
                          </>
                        ) : (
                          "Xác nhận & Đăng xuất"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowRoleConfirm(false)
                          setSelectedRole(user.role)
                        }}
                        disabled={isSavingRole}
                      >
                        Hủy bỏ
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security Card */}
      <Card>
        <CardHeader>
          <CardTitle>Bảo mật</CardTitle>
          <CardDescription>
            Quản lý mật khẩu và bảo mật tài khoản
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/change-password">
            <Button variant="outline" className="w-full sm:w-auto">
              Đổi mật khẩu
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
