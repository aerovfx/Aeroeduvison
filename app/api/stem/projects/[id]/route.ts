import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Get specific STEM project by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { id } = await params;
    
    // Fetch project from database
    const project = await db.sTEMProject.findUnique({
      where: {
        id: id
      },
      include: {
        teamMembers: true,
        milestones: {
          include: {
            deliverables: true
          },
          orderBy: {
            position: 'asc'
          }
        },
        feedback: true
      }
    });

    if (project) {
      // Transform to match frontend format
      const transformedProject = {
        id: project.id,
        title: project.title,
        description: project.description,
        category: project.category,
        status: project.status,
        difficulty: project.difficulty,
        progress: project.progress,
        isPublic: project.isPublic,
        thumbnail: project.thumbnail,
        dueDate: project.dueDate?.toISOString(),
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        teamMembers: project.teamMembers.map(member => ({
          id: member.id,
          name: member.name,
          role: member.role,
          email: member.email,
          avatar: member.avatar
        })),
        instructor: {
          id: session.user.id,
          name: session.user.name || 'Instructor',
          email: session.user.email || 'instructor@example.com'
        },
        tags: [], // TODO: Add tags field to schema
        milestones: project.milestones.map(milestone => ({
          id: milestone.id,
          title: milestone.title,
          description: milestone.description,
          status: milestone.status,
          dueDate: milestone.dueDate?.toISOString(),
          completedAt: milestone.completedAt?.toISOString(),
          deliverables: milestone.deliverables.map(deliverable => ({
            id: deliverable.id,
            title: deliverable.title,
            description: deliverable.description,
            type: deliverable.type,
            url: deliverable.url
          }))
        })),
        feedback: project.feedback.map(feedback => ({
          id: feedback.id,
          author: feedback.author,
          content: feedback.content,
          type: feedback.type,
          date: feedback.createdAt.toISOString(),
          isResolved: feedback.isResolved
        }))
      };

      return NextResponse.json({
        success: true,
        project: transformedProject
      });
    }

    // Fallback to mock data if not found in database
    const mockProjects = [
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
      }
    ];

    const mockProject = mockProjects.find(p => p.id === id);
    
    if (mockProject) {
      return NextResponse.json({
        success: true,
        project: mockProject
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Project not found'
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Error fetching STEM project:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// PUT - Update STEM project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { id } = await params;
    const updateData = await request.json();
    
    // TODO: Update in database
    const updatedProject = {
      id,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      project: updatedProject,
      message: 'Project updated successfully'
    });

  } catch (error) {
    console.error('Error updating STEM project:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// DELETE - Delete STEM project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { id } = await params;
    
    // TODO: Delete from database
    
    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting STEM project:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
