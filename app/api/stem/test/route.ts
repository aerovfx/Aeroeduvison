import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Test STEM projects without authentication
export async function GET() {
  try {
    // Test database connection
    const projectCount = await db.sTEMProject.count();
    
    // Return mock project for testing
    const mockProject = {
      id: "project_1759925672955",
      title: "AI Tutor for Math",
      description: "Phát triển trợ lý AI hỗ trợ học sinh giải toán từng bước và gợi ý cách học hiệu quả",
      category: "Technology",
      status: "in-progress",
      teamMembers: [
        { id: "4", name: "Phạm Thị Dung", role: "AI Developer", email: "dung@example.com" },
        { id: "5", name: "Hoàng Văn Đức", role: "NLP Engineer", email: "duc@example.com" }
      ],
      instructor: {
        id: "teacher2",
        name: "Cô Nguyễn Thị Toán học",
        email: "toan-hoc@example.com"
      },
      createdAt: "2024-09-01",
      updatedAt: "2024-10-30",
      dueDate: "2024-10-30",
      tags: ["AI", "NLP", "Math", "Education"],
      difficulty: "advanced",
      progress: 75,
      milestones: [
        { id: "m1", title: "Thu thập bộ đề toán", description: "Tập hợp các bài toán từ cơ bản đến nâng cao", status: "completed", dueDate: "2024-09-15", deliverables: [] },
        { id: "m2", title: "Huấn luyện AI giải toán", description: "Phát triển và huấn luyện mô hình AI", status: "completed", dueDate: "2024-10-01", deliverables: [] },
        { id: "m3", title: "Thử nghiệm với học sinh", description: "Kiểm thử với nhóm học sinh thực tế", status: "in-progress", dueDate: "2024-10-15", deliverables: [] },
        { id: "m4", title: "Triển khai bản demo", description: "Hoàn thiện và triển khai ứng dụng", status: "pending", dueDate: "2024-10-30", deliverables: [] }
      ],
      feedback: [
        {
          id: "f2",
          author: "Cô Nguyễn Thị Toán học",
          content: "AI tutor đang phát triển tốt! Cần cải thiện thêm khả năng giải thích chi tiết.",
          date: "2024-10-25",
          type: "suggestion"
        }
      ],
      isPublic: true,
      thumbnail: "/images/stem/ai-tutor.jpg"
    };

    return NextResponse.json({
      success: true,
      message: 'STEM projects API is working',
      database: {
        connected: true,
        projectCount: projectCount
      },
      testProject: mockProject
    });

  } catch (error) {
    console.error('Error testing STEM projects:', error);
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
