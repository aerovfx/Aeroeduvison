import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Lấy tất cả khóa học đã publish
    const courses = await db.course.findMany({
      where: {
        isPublished: true
      },
      include: {
        category: true,
        chapters: {
          where: {
            isPublished: true
          },
          orderBy: {
            position: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Mapping courses to learning paths
    const learningPaths = courses.map((course) => {
      // Tính progress dựa trên số chapters (giả sử 0% cho demo)
      const completedChapters = 0;
      const totalChapters = course.chapters.length;
      const progress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

      // Mapping category to icon and color
      const getCategoryInfo = (categoryName: string) => {
        switch (categoryName?.toLowerCase()) {
          case 'mathematics':
          case 'algebra':
          case 'geometry':
            return {
              icon: 'Calculator',
              color: 'bg-blue-500'
            };
          case 'chemistry':
            return {
              icon: 'Atom',
              color: 'bg-green-500'
            };
          case 'physics':
            return {
              icon: 'Zap',
              color: 'bg-purple-500'
            };
          case 'biology':
            return {
              icon: 'Dna',
              color: 'bg-pink-500'
            };
          case 'programming':
            return {
              icon: 'Code2',
              color: 'bg-orange-500'
            };
          default:
            return {
              icon: 'BookOpen',
              color: 'bg-gray-500'
            };
        }
      };

      const categoryInfo = getCategoryInfo(course.category?.name || '');

      return {
        id: course.id,
        title: course.title,
        description: course.description || `Khóa học ${course.category?.name || 'tổng quát'}`,
        icon: categoryInfo.icon,
        color: categoryInfo.color,
        progress: progress,
        completed: completedChapters,
        total: totalChapters,
        href: `/courses/${course.id}`,
        category: course.category?.name || 'General'
      };
    });

    // Thêm các learning paths mặc định nếu chưa có trong database
    const defaultPaths = [
      {
        id: "toan-hoc-co-ban",
        title: "Toán học cơ bản",
        description: "Học các khái niệm toán học cơ bản từ lớp 10-12",
        icon: "Calculator",
        color: "bg-blue-500",
        progress: 25,
        completed: 5,
        total: 20,
        href: "/courses/toan-hoc-co-ban",
        category: "Mathematics"
      },
      {
        id: "hoa-hoc",
        title: "Hóa học",
        description: "Khám phá thế giới hóa học từ cơ bản đến nâng cao",
        icon: "Atom",
        color: "bg-green-500",
        progress: 60,
        completed: 9,
        total: 15,
        href: "/courses/hoa-hoc",
        category: "Chemistry"
      },
      {
        id: "vat-ly",
        title: "Vật lý",
        description: "Hiểu các định luật vật lý và ứng dụng thực tế",
        icon: "Zap",
        color: "bg-purple-500",
        progress: 10,
        completed: 2,
        total: 18,
        href: "/courses/vat-ly",
        category: "Physics"
      },
      {
        id: "sinh-hoc",
        title: "Sinh học",
        description: "Khám phá sự sống và các quá trình sinh học",
        icon: "Dna",
        color: "bg-pink-500",
        progress: 0,
        completed: 0,
        total: 12,
        href: "/courses/sinh-hoc",
        category: "Biology"
      }
    ];

    // Merge database courses with default paths, avoiding duplicates
    const existingTitles = learningPaths.map(p => p.title);
    const uniqueDefaultPaths = defaultPaths.filter(p => !existingTitles.includes(p.title));
    
    const allPaths = [...learningPaths, ...uniqueDefaultPaths];

    return NextResponse.json(allPaths);
  } catch (error) {
    console.error('Error fetching learning paths:', error);
    return NextResponse.json({ error: 'Failed to fetch learning paths' }, { status: 500 });
  }
}
