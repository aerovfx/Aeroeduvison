"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, BookOpen, Code, Zap, Shield, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function DocsHomePage() {
  const router = useRouter()
  
  const quickLinks = [
    {
      title: "Cho Người Mới",
      description: "Bắt đầu với module docs dành cho người mới bắt đầu",
      href: "/docs/beginner/index",
      icon: BookOpen,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Quick Start",
      description: "Hướng dẫn cài đặt và chạy dự án trong 5 phút",
      href: "/docs/getting-started/quick-start",
      icon: Rocket,
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "Python Simulations",
      description: "Tạo và chạy các phòng thí nghiệm ảo với Python",
      href: "/docs/simulations/python-simulations",
      icon: Code,
      color: "from-green-500 to-emerald-500",
    },
    {
      title: "OCR Grading",
      description: "Hệ thống chấm bài tự động với AI",
      href: "/docs/ocr-grading/overview",
      icon: Zap,
      color: "from-orange-500 to-red-500",
    },
    {
      title: "Authentication",
      description: "Thiết lập hệ thống xác thực với NextAuth",
      href: "/docs/authentication/overview",
      icon: Shield,
      color: "from-indigo-500 to-blue-500",
    },
    {
      title: "Deployment",
      description: "Deploy lên Google Cloud Run",
      href: "/docs/deployment/cloud-run",
      icon: Rocket,
      color: "from-teal-500 to-cyan-500",
    },
  ]

  const handleCardClick = (href: string) => (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't navigate if clicking on the Link button inside
    if ((e.target as HTMLElement).closest('a, button')) {
      return
    }
    e.preventDefault()
    router.push(href)
  }

  const handleCardKeyDown = (href: string) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Don't handle if focus is on a link/button inside
    if ((e.target as HTMLElement).closest('a, button')) {
      return
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      router.push(href)
    }
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <div className="space-y-4 py-12 md:py-16 lg:py-20">
        <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
          Documentation
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          AeroEduVison
          <span className="block bg-gradient-to-r from-red-400 via-teal-400 to-green-400 bg-clip-text text-transparent">
            Documentation
          </span>
        </h1>
        <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
          Hướng dẫn đầy đủ để xây dựng và sử dụng hệ thống LMS với AI, 
          simulations, và OCR grading.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg" className="group">
            <Link href="/docs/beginner/index">
              Bắt Đầu Ngay
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/docs/getting-started/introduction">
              Giới Thiệu
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Links Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 py-8">
        {quickLinks.map((link) => {
          const Icon = link.icon
          return (
            <Card
              key={link.href}
              className="group relative overflow-hidden border-2 transition-all hover:border-primary/50 hover:shadow-lg cursor-pointer focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
              onClick={handleCardClick(link.href)}
              onKeyDown={handleCardKeyDown(link.href)}
              role="button"
              tabIndex={0}
              aria-label={`Navigate to ${link.title}`}
            >
              <CardHeader>
                <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${link.color} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="group-hover:text-primary transition-colors">
                  {link.title}
                </CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" asChild className="w-full justify-start group-hover:bg-accent">
                  <Link href={link.href}>
                    Đọc thêm
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Features Section */}
      <div className="border-t py-12">
        <h2 className="text-3xl font-bold tracking-tight mb-8">Tính Năng Chính</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">🔐 Authentication</h3>
            <p className="text-muted-foreground">
              NextAuth v5 với 2FA, OAuth, và role-based access control
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">🔬 Simulations</h3>
            <p className="text-muted-foreground">
              20+ phòng thí nghiệm ảo với Python và real-time visualization
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">🖼️ OCR Grading</h3>
            <p className="text-muted-foreground">
              Chấm bài tự động với AI, nhận diện chữ viết tay
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">🤖 AI Features</h3>
            <p className="text-muted-foreground">
              Tạo nội dung tự động, gia sư thông minh, và learning paths
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">☁️ Cloud Ready</h3>
            <p className="text-muted-foreground">
              Deploy dễ dàng lên Google Cloud Run với Docker
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">📊 Analytics</h3>
            <p className="text-muted-foreground">
              Theo dõi tiến độ học tập real-time với XP system
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
