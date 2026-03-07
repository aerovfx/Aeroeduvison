'use client';

"use client"

import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Key, Bell, Eye, Shield, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useLanguage } from '@/contexts/LanguageContext';

export default function SettingsPage() {
  const { t } = useLanguage();
  
  const { data: session } = useSession()

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

  const settingsSections = [
    {
      icon: Key,
      title: "Mật khẩu & Bảo mật",
      description: "Thay đổi mật khẩu và cài đặt bảo mật tài khoản",
      href: "/dashboard/change-password",
      iconColor: "text-red-500",
      bgColor: "bg-red-50",
    },
    {
      icon: Bell,
      title: "Thông báo",
      description: "Quản lý thông báo email và push notifications",
      href: "/dashboard/notifications",
      iconColor: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      icon: Eye,
      title: "Quyền riêng tư",
      description: "Kiểm soát ai có thể xem thông tin của bạn",
      href: "/dashboard/privacy",
      iconColor: "text-purple-500",
      bgColor: "bg-purple-50",
    },
    {
      icon: Shield,
      title: "Phiên đăng nhập",
      description: "Xem và quản lý các phiên đăng nhập của bạn",
      href: "/dashboard/sessions",
      iconColor: "text-green-500",
      bgColor: "bg-green-50",
    },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="w-8 h-8" />
          Cài đặt
        </h1>
        <p className="text-gray-600 mt-2">Quản lý cài đặt tài khoản và tùy chọn</p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4">
        {settingsSections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg ${section.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${section.iconColor}`} />
                    
              </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{section.title}</h3>
                      <p className="text-sm text-gray-600">{section.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin tài khoản</CardTitle>
          <CardDescription>
            Thông tin cơ bản về tài khoản của bạn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">{t('form.email')}</p>
              <p className="font-medium">{session.user.email}</p>
            </div>
            <div>
              <p className="text-gray-600">Vai trò</p>
              <p className="font-medium">
                {session.user.role === "ADMIN" ? "Quản trị viên" :
                 session.user.role === "TEACHER" ? "Giảng viên" :
                 "Học viên"}
              </p>
            </div>
          </div>
          <Link href="/dashboard/profile">
            <Button variant="outline" className="w-full sm:w-auto">
              Xem hồ sơ đầy đủ
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

