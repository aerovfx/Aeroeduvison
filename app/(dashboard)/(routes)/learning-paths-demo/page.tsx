"use client"

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calculator, Atom, Zap, Dna, Code2 } from "lucide-react";

export default function LearningPathsDemoPage() {
  const learningPaths = [
    {
      id: "toan-hoc-co-ban",
      title: "Toán học cơ bản",
      description: "Học các khái niệm toán học cơ bản từ lớp 10-12",
      icon: Calculator,
      color: "bg-blue-500",
      progress: 25,
      completed: 5,
      total: 20,
      href: "/learning-paths-demo/toan-hoc"
    },
    {
      id: "hoa-hoc",
      title: "Hóa học",
      description: "Khám phá thế giới hóa học từ cơ bản đến nâng cao",
      icon: Atom,
      color: "bg-green-500",
      progress: 60,
      completed: 9,
      total: 15,
      href: "/learning-paths-demo/hoa-hoc"
    },
    {
      id: "vat-ly",
      title: "Vật lý",
      description: "Hiểu các định luật vật lý và ứng dụng thực tế",
      icon: Zap,
      color: "bg-purple-500",
      progress: 10,
      completed: 2,
      total: 18,
      href: "/learning-paths-demo/vat-ly"
    },
    {
      id: "sinh-hoc",
      title: "Sinh học",
      description: "Khám phá sự sống và các quá trình sinh học",
      icon: Dna,
      color: "bg-pink-500",
      progress: 0,
      completed: 0,
      total: 12,
      href: "/learning-paths-demo/sinh-hoc"
    },
    {
      id: "python-programming",
      title: "Python Programming",
      description: "Lập trình Python từ cơ bản đến nâng cao cho học sinh STEM",
      icon: Code2,
      color: "bg-orange-500",
      progress: 0,
      completed: 0,
      total: 32,
      href: "/learning-paths-demo/python"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Chọn lộ trình học tập</h1>
        <p className="text-gray-600">Chọn môn học bạn muốn học</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {learningPaths.map((path) => {
          const IconComponent = path.icon;
          
          return (
            <Link key={path.id} href={path.href}>
              <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-2 hover:border-blue-300">
                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg ${path.color} text-white`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      path.progress === 0 ? 'bg-gray-300' :
                      path.progress < 30 ? 'bg-red-500' :
                      path.progress < 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                  </div>
                  <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                    {path.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {path.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Tiến độ học tập</span>
                    <span>{path.completed}/{path.total} bài học</span>
                  </div>
                  <Progress value={path.progress} className="h-2" />
                  <div className="text-xs text-gray-500">
                    {path.progress}% hoàn thành
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="text-center mt-8">
        <p className="text-gray-600 text-sm">
          Chọn một lộ trình học tập để bắt đầu hành trình học tập của bạn
        </p>
      </div>
    </div>
  );
}

