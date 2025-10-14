import { NextRequest, NextResponse } from 'next/server';

// Mock STEM projects data - same as in STEMContext
const mockSTEMProjects = [
  {
    id: "project_1759913053775",
    title: "Smart Traffic Light System",
    description: "Thiết kế hệ thống đèn giao thông thông minh dùng AI để nhận diện mật độ phương tiện và tự động điều chỉnh thời gian đèn",
    category: "Engineering",
    status: "completed",
    teamMembers: [
      { id: "1", name: "Nguyễn Văn An", role: "AI Engineer", email: "an@example.com" },
      { id: "2", name: "Trần Thị Bình", role: "Hardware Developer", email: "binh@example.com" },
      { id: "3", name: "Lê Văn Cường", role: "IoT Specialist", email: "cuong@example.com" }
    ],
    instructor: {
      id: "teacher1",
      name: "Thầy Phạm Minh Giao thông",
      email: "giao-thong@example.com"
    },
    createdAt: "2024-09-01",
    updatedAt: "2024-10-25",
    dueDate: "2024-10-25",
    tags: ["AI", "IoT", "Transportation", "Arduino"],
    difficulty: "advanced",
    progress: 100,
    milestones: [
      { 
        id: "m1", 
        title: "Khảo sát và ý tưởng", 
        description: "Nghiên cứu tình hình giao thông và đề xuất giải pháp", 
        status: "completed", 
        dueDate: "2024-09-10", 
        deliverables: [] 
      },
      { 
        id: "m2", 
        title: "Thiết kế mạch điều khiển", 
        description: "Thiết kế và chế tạo mạch điều khiển đèn giao thông", 
        status: "completed", 
        dueDate: "2024-09-25", 
        deliverables: [] 
      },
      { 
        id: "m3", 
        title: "Lập trình AI nhận diện xe", 
        description: "Phát triển thuật toán AI để nhận diện mật độ phương tiện", 
        status: "completed", 
        dueDate: "2024-10-10", 
        deliverables: [] 
      },
      { 
        id: "m4", 
        title: "Thử nghiệm mô hình", 
        description: "Kiểm thử và tối ưu hóa hệ thống", 
        status: "completed", 
        dueDate: "2024-10-25", 
        deliverables: [] 
      }
    ],
    feedback: [
      {
        id: "f1",
        author: "Thầy Phạm Minh Giao thông",
        content: "Dự án xuất sắc! Hệ thống AI hoạt động rất chính xác trong việc nhận diện mật độ giao thông.",
        date: "2024-10-25",
        type: "approval"
      }
    ],
    isPublic: true,
    thumbnail: "/images/stem/smart-traffic.jpg"
  },
  {
    id: "1",
    title: "AI Tutor for Math",
    description: "Phát triển trợ lý AI hỗ trợ học sinh giải toán từng bước và gợi ý cách học hiệu quả",
    category: "Technology",
    status: "completed",
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
    progress: 100,
    milestones: [
      { id: "m1", title: "Thu thập bộ đề toán", description: "Tập hợp các bài toán từ cơ bản đến nâng cao", status: "completed", dueDate: "2024-09-15", deliverables: [] },
      { id: "m2", title: "Huấn luyện AI giải toán", description: "Phát triển và huấn luyện mô hình AI", status: "completed", dueDate: "2024-10-01", deliverables: [] },
      { id: "m3", title: "Thử nghiệm với học sinh", description: "Kiểm thử với nhóm học sinh thực tế", status: "completed", dueDate: "2024-10-15", deliverables: [] },
      { id: "m4", title: "Triển khai bản demo", description: "Hoàn thiện và triển khai ứng dụng", status: "completed", dueDate: "2024-10-30", deliverables: [] }
    ],
    feedback: [
      {
        id: "f2",
        author: "Cô Nguyễn Thị Toán học",
        content: "AI tutor rất hữu ích! Học sinh phản hồi tích cực về khả năng giải thích từng bước.",
        date: "2024-10-30",
        type: "approval"
      }
    ],
    isPublic: true,
    thumbnail: "/images/stem/ai-tutor.jpg"
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    if (projectId) {
      // Get specific project
      const project = mockSTEMProjects.find(p => p.id === projectId);
      
      if (project) {
        return NextResponse.json({
          success: true,
          project
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Project not found'
        }, { status: 404 });
      }
    } else {
      // Get all projects
      return NextResponse.json({
        success: true,
        projects: mockSTEMProjects
      });
    }
  } catch (error) {
    console.error('Error in STEM sync API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
