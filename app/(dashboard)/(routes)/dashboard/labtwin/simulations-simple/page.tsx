"use client"

import { useState } from "react";
import Link from "next/link";

export default function SimulationsSimplePage() {
  const simulations = [
    {
      id: "refraction",
      name: "⚗️ Khúc xạ ánh sáng",
      description: "Định luật Snell và phản xạ toàn phần",
      color: "bg-purple-500"
    },
    {
      id: "projectile",
      name: "🎯 Chuyển động ném xiên",
      description: "Quỹ đạo parabol với dữ liệu v, a, E",
      color: "bg-red-500"
    },
    {
      id: "motion-tracking",
      name: "📷 Motion Tracking",
      description: "3D → 2D projection với camera model",
      color: "bg-green-500"
    },
    {
      id: "harmonic-motion",
      name: "📈 Dao động điều hòa",
      description: "Đồ thị x(t), v(t), E(t) với custom inputs",
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Link href="/dashboard/labtwin" className="text-blue-600 hover:underline mb-6 inline-block">
        ← Quay lại LabTwin
      </Link>
      
      <h1 className="text-4xl font-bold mb-4">🐍 Python Simulations</h1>
      <p className="text-gray-600 mb-8">
        4 mô phỏng vật lý được tạo bằng Python và hiển thị trực tiếp trong Next.js
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {simulations.map((sim) => (
          <div key={sim.id} className="bg-white border-2 rounded-lg p-6 hover:shadow-xl transition-all">
            <div className={`w-12 h-12 ${sim.color} rounded-lg flex items-center justify-center text-white text-2xl mb-4`}>
              {sim.name.split(' ')[0]}
            </div>
            <h2 className="text-2xl font-bold mb-2">{sim.name}</h2>
            <p className="text-gray-600 mb-4">{sim.description}</p>
            <Link 
              href={`/dashboard/labtwin/labs/${sim.id}`}
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Bắt đầu →
            </Link>
          </div>
        ))}
      </div>

      {/* Video Tracking */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg p-8">
        <h2 className="text-3xl font-bold mb-3">🎬 Video Trajectory Tracking</h2>
        <p className="mb-6 text-lg">
          Upload video và theo dõi chuyển động vật thể - Export CSV data
        </p>
        <Link 
          href="/dashboard/labtwin/video-tracking"
          className="inline-block bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          Mở Video Tracking Tool →
        </Link>
      </div>

      {/* How it works */}
      <div className="mt-12 bg-white border rounded-lg p-8">
        <h3 className="text-2xl font-bold mb-6">🛠️ Cách hoạt động</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { num: "1", title: "Viết Python", desc: "Tạo simulation trong /python-simulations/" },
            { num: "2", title: "Build Data", desc: "Chạy build.py → data.json" },
            { num: "3", title: "Copy", desc: "Auto copy sang /public/labs/" },
            { num: "4", title: "Hiển thị", desc: "Tự động render trong Next.js" }
          ].map(step => (
            <div key={step.num} className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
                {step.num}
              </div>
              <h4 className="font-semibold mb-2">{step.title}</h4>
              <p className="text-sm text-gray-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Build command */}
      <div className="mt-8 bg-gray-900 text-green-400 p-6 rounded-lg font-mono">
        <div className="text-sm text-gray-400 mb-2">Build all simulations:</div>
        <div className="text-lg">$ npm run simulations:build</div>
      </div>
    </div>
  );
}


