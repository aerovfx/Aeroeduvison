"use client"

import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Mail, Shield, Calendar } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

export default function ProfilePage() {
  const { data: session } = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(session?.user?.name || "")

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
                Vai trò
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
