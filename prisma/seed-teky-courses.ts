/**
 * Seed Script: Lộ trình học từ Teky - Giáo viên Việt Chung
 * Source: https://edtech.teky.edu.vn/khoa_hoc
 *
 * Tạo:
 * - Tài khoản GV Việt Chung (thegioithu2@gmail.com)
 * - Categories cho 2 lộ trình: Lập trình & Truyền thông đa phương tiện
 * - 11 khóa học với chapters chi tiết
 * - 2 LearningPathTemplate tổng hợp
 */

import "dotenv/config"
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log("🚀 Bắt đầu seed dữ liệu lộ trình Teky - GV Việt Chung...\n")

  // ========================================
  // 1. Tạo/cập nhật tài khoản GV Việt Chung
  // ========================================
  const hashedPassword = await hash('teacher123', 12)
  const teacher = await prisma.user.upsert({
    where: { email: 'thegioithu2@gmail.com' },
    update: {
      name: 'Việt Chung',
      role: 'TEACHER',
    },
    create: {
      id: 'teacher-viet-chung',
      email: 'thegioithu2@gmail.com',
      name: 'Việt Chung',
      password: hashedPassword,
      role: 'TEACHER',
      updatedAt: new Date(),
    },
  })
  console.log(`✅ Giáo viên: ${teacher.name} (${teacher.email})\n`)

  // ========================================
  // 2. Tạo Categories
  // ========================================
  const categories = [
    { id: 'cat-lap-trinh', name: 'Lập trình' },
    { id: 'cat-truyen-thong', name: 'Truyền thông đa phương tiện' },
    { id: 'cat-ai', name: 'Trí tuệ nhân tạo (AI)' },
    { id: 'cat-thi-dau', name: 'Luyện thi & Thi đấu' },
  ]

  const createdCategories: Record<string, any> = {}
  for (const cat of categories) {
    createdCategories[cat.id] = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: { id: cat.id, name: cat.name },
    })
    console.log(`📁 Category: ${cat.name}`)
  }
  console.log()

  // ========================================
  // 3. Tạo Khóa học + Chapters
  // ========================================
  const coursesData = [
    // --- LỘ TRÌNH LẬP TRÌNH ---
    {
      id: 'teky-be-lam-game',
      title: 'Bé Làm Game',
      description: 'Phát triển Game 2D, 3D cùng các công cụ Codekitten, Tynker, Miniworld, Pitolox, Microbit. Khóa học dành cho trẻ 7-10 tuổi, giúp bé tiếp cận lập trình qua việc tạo game thú vị.',
      categoryId: 'cat-lap-trinh',
      price: 0,
      chapters: [
        { title: 'Làm quen với Codekitten', description: 'Giới thiệu giao diện, kéo thả khối lệnh cơ bản để tạo nhân vật di chuyển', isFree: true },
        { title: 'Tạo game đầu tiên với Tynker', description: 'Sử dụng Tynker để lập trình game đơn giản với nhân vật và chướng ngại vật' },
        { title: 'Xây dựng thế giới 3D với Miniworld', description: 'Tạo môi trường game 3D, thiết kế địa hình và nhân vật trong Miniworld' },
        { title: 'Lập trình với Pitolox', description: 'Kết hợp logic lập trình với thiết kế game tương tác trên Pitolox' },
        { title: 'Dự án Microbit', description: 'Lập trình vi điều khiển Microbit, kết hợp phần cứng với game' },
        { title: 'Dự án tổng kết: Game 2D hoàn chỉnh', description: 'Hoàn thành một game 2D hoàn chỉnh kết hợp các kỹ năng đã học' },
      ],
    },
    {
      id: 'teky-sieu-nhan-lap-trinh',
      title: 'Siêu nhân lập trình',
      description: 'Chuyển từ ngôn ngữ lập trình kéo thả sang ngôn ngữ Python phổ biến trên thế giới. Dành cho học sinh 11-15 tuổi, xây dựng nền tảng lập trình vững chắc.',
      categoryId: 'cat-lap-trinh',
      price: 0,
      chapters: [
        { title: 'Từ Scratch đến Python', description: 'Hiểu sự chuyển đổi từ lập trình kéo thả sang viết code Python', isFree: true },
        { title: 'Biến, kiểu dữ liệu và toán tử', description: 'Các khái niệm cơ bản: biến số, chuỗi, danh sách, phép tính' },
        { title: 'Câu lệnh điều kiện và vòng lặp', description: 'If/else, for/while loop - điều khiển luồng chương trình' },
        { title: 'Hàm và module', description: 'Viết hàm tái sử dụng, import module có sẵn' },
        { title: 'Lập trình game với Pygame', description: 'Xây dựng game đơn giản sử dụng thư viện Pygame' },
        { title: 'Dự án Python thực tế', description: 'Hoàn thành dự án Python: chatbot, quiz game, hoặc ứng dụng nhỏ' },
      ],
    },
    {
      id: 'teky-lap-trinh-app-swift',
      title: 'Lập trình App - Swift',
      description: 'Sử dụng ngôn ngữ lập trình Swift - Ngôn ngữ lập trình của Apple. Cam kết có chứng chỉ sau khi hoàn thành. Dành cho học sinh 15-18 tuổi.',
      categoryId: 'cat-lap-trinh',
      price: 0,
      chapters: [
        { title: 'Giới thiệu Swift & Xcode', description: 'Cài đặt môi trường, cú pháp Swift cơ bản, Swift Playground', isFree: true },
        { title: 'UI cơ bản với SwiftUI', description: 'Tạo giao diện người dùng: Text, Image, Button, Stack layout' },
        { title: 'Navigation & Data Flow', description: 'Điều hướng màn hình, truyền dữ liệu giữa các view' },
        { title: 'Làm việc với API & JSON', description: 'Gọi REST API, parse JSON, hiển thị dữ liệu từ server' },
        { title: 'Core Data & Local Storage', description: 'Lưu trữ dữ liệu local, CRUD operations với Core Data' },
        { title: 'Dự án App hoàn chỉnh', description: 'Xây dựng app iOS hoàn chỉnh và chuẩn bị submit App Store' },
      ],
    },
    {
      id: 'teky-lap-trinh-web-cpap',
      title: 'Lập trình Web - CPAP',
      description: 'Thiết kế Web với Python - xây dựng website bán hàng, TMĐT. Cam kết có chứng chỉ Django. Dành cho học sinh 15-18 tuổi.',
      categoryId: 'cat-lap-trinh',
      price: 0,
      chapters: [
        { title: 'HTML & CSS cơ bản', description: 'Cấu trúc trang web, styling, responsive design cơ bản', isFree: true },
        { title: 'JavaScript nền tảng', description: 'Biến, hàm, DOM manipulation, xử lý sự kiện' },
        { title: 'Python cho Web - Django', description: 'Cài đặt Django, cấu trúc project, views & templates' },
        { title: 'Database & Models', description: 'Thiết kế database, Django ORM, migrations' },
        { title: 'Xây dựng website TMĐT', description: 'Trang sản phẩm, giỏ hàng, thanh toán, quản lý đơn hàng' },
        { title: 'Deploy & Chứng chỉ Django', description: 'Deploy website lên server, ôn thi chứng chỉ Django' },
      ],
    },
    {
      id: 'teky-lap-trinh-game-unity',
      title: 'Lập trình Game - Unity',
      description: 'Lập trình Game chuyên nghiệp, game thị trường. Cam kết có chứng chỉ Unity sau khi hoàn thành. Dành cho học sinh 15-18 tuổi.',
      categoryId: 'cat-lap-trinh',
      price: 0,
      chapters: [
        { title: 'Giới thiệu Unity Engine', description: 'Giao diện Unity, Scene, GameObject, Component cơ bản', isFree: true },
        { title: 'C# cho Unity', description: 'Cú pháp C# cơ bản, MonoBehaviour, biến, hàm, lớp' },
        { title: 'Physics & Collision', description: 'Rigidbody, Collider, trigger events, lực và trọng lực' },
        { title: 'UI & Animations', description: 'Canvas, Button, Text, Animator, sprite animation' },
        { title: 'Game 2D hoàn chỉnh', description: 'Platformer game: level design, enemies, scoring, game states' },
        { title: 'Game 3D & Chứng chỉ Unity', description: 'Xây dựng game 3D, publish lên store, ôn thi chứng chỉ Unity' },
      ],
    },

    // --- LỘ TRÌNH TRUYỀN THÔNG ĐA PHƯƠNG TIỆN ---
    {
      id: 'teky-digi-stem-art',
      title: 'Digi - STEM Art',
      description: 'Sử dụng các công cụ thiết kế và kể chuyện số như Solidwork, Cospaces, AI tool để tạo ra sản phẩm nghệ thuật. Dành cho trẻ 7-10 tuổi.',
      categoryId: 'cat-truyen-thong',
      price: 0,
      chapters: [
        { title: 'Nghệ thuật số cơ bản', description: 'Giới thiệu thiết kế số, màu sắc, bố cục qua các công cụ trực tuyến', isFree: true },
        { title: 'Kể chuyện số với Cospaces', description: 'Tạo thế giới 3D, thêm nhân vật, animation để kể câu chuyện' },
        { title: 'Thiết kế 3D với Solidwork', description: 'Mô hình 3D cơ bản, sketch, extrude, revolve' },
        { title: 'Sáng tạo với AI Tools', description: 'Sử dụng AI tạo hình ảnh, chỉnh sửa và phối hợp với thiết kế' },
        { title: 'Dự án nghệ thuật STEM', description: 'Kết hợp khoa học và nghệ thuật: mô hình hệ mặt trời, cơ thể người' },
      ],
    },
    {
      id: 'teky-digistyle-multimedia',
      title: 'DigiStyle Multimedia',
      description: 'Đào tạo thiết kế và truyền thông đa phương tiện với các công cụ Canva, Inkscape, GIMP. Dành cho học sinh 11-15 tuổi.',
      categoryId: 'cat-truyen-thong',
      price: 0,
      chapters: [
        { title: 'Thiết kế đồ họa với Canva', description: 'Tạo poster, banner, infographic chuyên nghiệp với Canva', isFree: true },
        { title: 'Chỉnh sửa ảnh với GIMP', description: 'Cắt ghép, chỉnh màu, retouch, tạo hiệu ứng với GIMP' },
        { title: 'Vector Design với Inkscape', description: 'Thiết kế logo, icon, minh họa vector với Inkscape' },
        { title: 'Video Editing cơ bản', description: 'Cắt ghép video, thêm nhạc, chuyển cảnh, text overlay' },
        { title: 'Branding & Social Media', description: 'Xây dựng bộ nhận diện thương hiệu, content cho mạng xã hội' },
        { title: 'Portfolio sáng tạo', description: 'Tổng hợp tất cả sản phẩm thành portfolio cá nhân chuyên nghiệp' },
      ],
    },

    // --- AI ---
    {
      id: 'teky-ai-for-kids',
      title: 'A.I for Kids',
      description: 'Khóa học A.I Online duy nhất tại Việt Nam đào tạo cho trẻ kỹ năng sử dụng AI. Cam kết chứng chỉ Quốc Tế. Dành cho trẻ 7-10 tuổi.',
      categoryId: 'cat-ai',
      price: 0,
      chapters: [
        { title: 'AI là gì?', description: 'Giới thiệu AI qua các ví dụ thực tế: trợ lý ảo, nhận diện khuôn mặt', isFree: true },
        { title: 'Machine Learning cho bé', description: 'Huấn luyện mô hình AI đơn giản: phân loại hình ảnh, nhận diện vật thể' },
        { title: 'AI sáng tạo', description: 'Tạo tranh vẽ, nhạc, câu chuyện với công cụ AI' },
        { title: 'Chatbot thông minh', description: 'Xây dựng chatbot đơn giản với logic hỏi-đáp' },
        { title: 'Dự án AI & Chứng chỉ', description: 'Hoàn thành dự án AI cá nhân, ôn luyện và thi chứng chỉ Quốc Tế' },
      ],
    },
    {
      id: 'teky-ai-for-teens',
      title: 'A.I for Teens',
      description: 'Khóa học A.I Online duy nhất tại Việt Nam đào tạo cho trẻ kỹ năng sử dụng AI. Cam kết chứng chỉ Quốc Tế. Dành cho học sinh 11-15 tuổi.',
      categoryId: 'cat-ai',
      price: 0,
      chapters: [
        { title: 'Nền tảng AI & Python', description: 'Cài đặt Python, thư viện AI cơ bản, NumPy, Pandas', isFree: true },
        { title: 'Machine Learning cơ bản', description: 'Supervised/Unsupervised learning, train model phân loại' },
        { title: 'Computer Vision', description: 'Nhận diện hình ảnh, OpenCV, xử lý ảnh cơ bản' },
        { title: 'Natural Language Processing', description: 'Xử lý ngôn ngữ tự nhiên, phân tích văn bản, sentiment analysis' },
        { title: 'Generative AI', description: 'Prompt engineering, sử dụng API AI, tạo nội dung với AI' },
        { title: 'Dự án AI nâng cao & Chứng chỉ', description: 'Xây dựng ứng dụng AI hoàn chỉnh, ôn thi chứng chỉ Quốc Tế' },
      ],
    },

    // --- LUYỆN THI ---
    {
      id: 'teky-tin-hoc-tre',
      title: 'Luyện thi Tin học trẻ',
      description: 'Luyện thi kì thi Tin học Trẻ, kì thi Tin học dành cho học sinh danh giá nhất tại Việt Nam. Dành cho học sinh 7-18 tuổi.',
      categoryId: 'cat-thi-dau',
      price: 0,
      chapters: [
        { title: 'Tổng quan kì thi Tin học Trẻ', description: 'Cấu trúc đề thi, quy chế, chiến lược ôn luyện', isFree: true },
        { title: 'Thuật toán & Tư duy logic', description: 'Thuật toán sắp xếp, tìm kiếm, đệ quy, quy hoạch động' },
        { title: 'Cấu trúc dữ liệu', description: 'Mảng, stack, queue, linked list, tree, graph' },
        { title: 'Giải đề thi mẫu', description: 'Phân tích và giải các đề thi Tin học Trẻ các năm trước' },
        { title: 'Thi thử & Đánh giá', description: 'Thi thử theo thời gian thực, chấm điểm và phân tích kết quả' },
      ],
    },
    {
      id: 'teky-hkico',
      title: 'Luyện thi HKICO',
      description: 'Luyện thi HKICO - Cuộc thi Lập trình Quốc tế có uy tín dành cho trẻ em trên toàn thế giới. Dành cho học sinh 7-18 tuổi.',
      categoryId: 'cat-thi-dau',
      price: 0,
      chapters: [
        { title: 'Giới thiệu HKICO', description: 'Tổng quan cuộc thi, cấu trúc đề, ngôn ngữ lập trình được phép', isFree: true },
        { title: 'Computational Thinking', description: 'Tư duy tính toán: decomposition, pattern recognition, abstraction' },
        { title: 'Problem Solving Strategies', description: 'Chiến lược giải bài: brute force, greedy, divide & conquer' },
        { title: 'Past Papers & Solutions', description: 'Giải đề thi HKICO các năm trước, phân tích lời giải mẫu' },
        { title: 'Mock Test & Final Review', description: 'Thi thử quốc tế, đánh giá và bổ sung kiến thức trước kì thi' },
      ],
    },
  ]

  for (const courseData of coursesData) {
    const { chapters, categoryId, ...courseFields } = courseData

    const course = await prisma.course.upsert({
      where: { id: courseData.id },
      update: {
        title: courseFields.title,
        description: courseFields.description,
      },
      create: {
        id: courseFields.id,
        title: courseFields.title,
        description: courseFields.description,
        price: courseFields.price,
        isPublished: true,
        userId: teacher.id,
        categoryId: categoryId,
        updatedAt: new Date(),
      },
    })
    console.log(`📚 Khóa học: ${course.title}`)

    // Tạo chapters
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i]
      const chapterId = `${courseData.id}-ch-${i + 1}`
      await prisma.chapter.upsert({
        where: { id: chapterId },
        update: {
          title: ch.title,
          description: ch.description,
        },
        create: {
          id: chapterId,
          title: ch.title,
          description: ch.description || '',
          position: i + 1,
          isPublished: true,
          isFree: ch.isFree || false,
          courseId: course.id,
          updatedAt: new Date(),
        },
      })
    }
    console.log(`   └─ ${chapters.length} chapters`)
  }
  console.log()

  // ========================================
  // 4. Tạo Learning Path Templates
  // ========================================

  // Template 1: Lộ trình Lập trình
  await prisma.learningPathTemplate.upsert({
    where: { id: 'teky-lo-trinh-lap-trinh' },
    update: {
      title: 'Lộ trình Lập trình Teky',
      description: 'Lộ trình học lập trình toàn diện từ cơ bản đến nâng cao, theo chuẩn khung CSTA. Bao gồm: Bé Làm Game (7-10 tuổi) → Siêu nhân lập trình (11-15 tuổi) → Lập trình App/Web/Game chuyên nghiệp (15-18 tuổi).',
    },
    create: {
      id: 'teky-lo-trinh-lap-trinh',
      title: 'Lộ trình Lập trình Teky',
      description: 'Lộ trình học lập trình toàn diện từ cơ bản đến nâng cao, theo chuẩn khung CSTA. Bao gồm: Bé Làm Game (7-10 tuổi) → Siêu nhân lập trình (11-15 tuổi) → Lập trình App/Web/Game chuyên nghiệp (15-18 tuổi).',
      createdById: teacher.id,
      isPublished: true,
      category: 'Lập trình',
      tags: ['lập trình', 'coding', 'python', 'swift', 'unity', 'django', 'CSTA', 'teky'],
      difficultyLevel: 'balanced',
      estimatedWeeks: 48,
      weeklyHoursRequired: 'moderate',
      targetAcademicLevels: ['elementary', 'middle_school', 'high_school'],
      targetGoalTypes: ['career_prep', 'skill_building', 'competition'],
      targetDomains: ['computer_science', 'programming', 'game_development', 'web_development'],
      goals: [
        'Làm quen với tư duy lập trình qua lập trình kéo thả (7-10 tuổi)',
        'Chuyển sang ngôn ngữ Python chuyên nghiệp (11-15 tuổi)',
        'Phát triển ứng dụng/game/web thực tế với chứng chỉ quốc tế (15-18 tuổi)',
        'Xây dựng portfolio dự án cá nhân để du học STEM',
      ],
      domains: ['computer_science'],
      segments: [
        {
          title: 'Giai đoạn 1: Bé Làm Game (7-10 tuổi)',
          description: 'Tiếp cận lập trình qua game 2D/3D với Codekitten, Tynker, Miniworld, Microbit',
          weekStart: 1,
          weekEnd: 16,
          courses: ['teky-be-lam-game'],
        },
        {
          title: 'Giai đoạn 2: Siêu nhân lập trình (11-15 tuổi)',
          description: 'Chuyển sang Python, xây dựng nền tảng lập trình vững chắc',
          weekStart: 17,
          weekEnd: 32,
          courses: ['teky-sieu-nhan-lap-trinh'],
        },
        {
          title: 'Giai đoạn 3: Chuyên sâu (15-18 tuổi) - Chọn 1 trong 3',
          description: 'Lập trình App Swift / Web Django / Game Unity - Cam kết chứng chỉ',
          weekStart: 33,
          weekEnd: 48,
          courses: ['teky-lap-trinh-app-swift', 'teky-lap-trinh-web-cpap', 'teky-lap-trinh-game-unity'],
        },
      ],
      weeklyPlan: {
        sessionsPerWeek: 2,
        minutesPerSession: 90,
        format: 'Học trực tuyến 1-1 hoặc nhóm nhỏ',
      },
      metadata: {
        source: 'https://edtech.teky.edu.vn/khoa_hoc',
        teacherName: 'Việt Chung',
        teacherEmail: 'thegioithu2@gmail.com',
        standard: 'CSTA (Computer Science Teachers Association)',
        lastUpdated: new Date().toISOString(),
      },
      updatedAt: new Date(),
    },
  })
  console.log(`🗺️  Learning Path Template: Lộ trình Lập trình Teky`)

  // Template 2: Lộ trình Truyền thông đa phương tiện
  await prisma.learningPathTemplate.upsert({
    where: { id: 'teky-lo-trinh-truyen-thong' },
    update: {
      title: 'Lộ trình Truyền thông Đa phương tiện Teky',
      description: 'Lộ trình thiết kế và truyền thông đa phương tiện. Từ nghệ thuật số STEM (7-10 tuổi) đến thiết kế đồ họa chuyên nghiệp (11-15 tuổi).',
    },
    create: {
      id: 'teky-lo-trinh-truyen-thong',
      title: 'Lộ trình Truyền thông Đa phương tiện Teky',
      description: 'Lộ trình thiết kế và truyền thông đa phương tiện. Từ nghệ thuật số STEM (7-10 tuổi) đến thiết kế đồ họa chuyên nghiệp (11-15 tuổi).',
      createdById: teacher.id,
      isPublished: true,
      category: 'Truyền thông đa phương tiện',
      tags: ['thiết kế', 'multimedia', 'canva', 'gimp', 'inkscape', 'cospaces', 'STEM art', 'teky'],
      difficultyLevel: 'easy_start',
      estimatedWeeks: 32,
      weeklyHoursRequired: 'moderate',
      targetAcademicLevels: ['elementary', 'middle_school'],
      targetGoalTypes: ['skill_building', 'creative_expression'],
      targetDomains: ['digital_art', 'multimedia', 'design'],
      goals: [
        'Phát triển tư duy sáng tạo qua nghệ thuật số và công cụ AI (7-10 tuổi)',
        'Thành thạo thiết kế đồ họa và truyền thông đa phương tiện (11-15 tuổi)',
        'Xây dựng portfolio sáng tạo cá nhân chuyên nghiệp',
      ],
      domains: ['digital_art'],
      segments: [
        {
          title: 'Giai đoạn 1: Digi - STEM Art (7-10 tuổi)',
          description: 'Nghệ thuật số với Solidwork, Cospaces, AI tools',
          weekStart: 1,
          weekEnd: 16,
          courses: ['teky-digi-stem-art'],
        },
        {
          title: 'Giai đoạn 2: DigiStyle Multimedia (11-15 tuổi)',
          description: 'Thiết kế chuyên nghiệp với Canva, GIMP, Inkscape',
          weekStart: 17,
          weekEnd: 32,
          courses: ['teky-digistyle-multimedia'],
        },
      ],
      weeklyPlan: {
        sessionsPerWeek: 2,
        minutesPerSession: 90,
        format: 'Học trực tuyến 1-1 hoặc nhóm nhỏ',
      },
      metadata: {
        source: 'https://edtech.teky.edu.vn/khoa_hoc',
        teacherName: 'Việt Chung',
        teacherEmail: 'thegioithu2@gmail.com',
        standard: 'CSTA (Computer Science Teachers Association)',
        lastUpdated: new Date().toISOString(),
      },
      updatedAt: new Date(),
    },
  })
  console.log(`🗺️  Learning Path Template: Lộ trình Truyền thông Đa phương tiện Teky`)

  // Template 3: Lộ trình AI
  await prisma.learningPathTemplate.upsert({
    where: { id: 'teky-lo-trinh-ai' },
    update: {
      title: 'Lộ trình Trí tuệ Nhân tạo (AI) Teky',
      description: 'Lộ trình học AI từ cơ bản đến nâng cao. A.I for Kids (7-10 tuổi) → A.I for Teens (11-15 tuổi). Cam kết chứng chỉ Quốc Tế.',
    },
    create: {
      id: 'teky-lo-trinh-ai',
      title: 'Lộ trình Trí tuệ Nhân tạo (AI) Teky',
      description: 'Lộ trình học AI từ cơ bản đến nâng cao. A.I for Kids (7-10 tuổi) → A.I for Teens (11-15 tuổi). Cam kết chứng chỉ Quốc Tế.',
      createdById: teacher.id,
      isPublished: true,
      category: 'Trí tuệ nhân tạo',
      tags: ['AI', 'machine learning', 'python', 'computer vision', 'NLP', 'chứng chỉ quốc tế', 'teky'],
      difficultyLevel: 'balanced',
      estimatedWeeks: 32,
      weeklyHoursRequired: 'moderate',
      targetAcademicLevels: ['elementary', 'middle_school'],
      targetGoalTypes: ['skill_building', 'career_prep'],
      targetDomains: ['artificial_intelligence', 'machine_learning', 'computer_science'],
      goals: [
        'Hiểu khái niệm AI và Machine Learning qua thực hành (7-10 tuổi)',
        'Xây dựng mô hình AI với Python, Computer Vision, NLP (11-15 tuổi)',
        'Đạt chứng chỉ AI Quốc Tế',
      ],
      domains: ['computer_science'],
      segments: [
        {
          title: 'Giai đoạn 1: A.I for Kids (7-10 tuổi)',
          description: 'Làm quen AI qua thực hành: phân loại hình ảnh, chatbot, AI sáng tạo',
          weekStart: 1,
          weekEnd: 16,
          courses: ['teky-ai-for-kids'],
        },
        {
          title: 'Giai đoạn 2: A.I for Teens (11-15 tuổi)',
          description: 'AI nâng cao: ML với Python, Computer Vision, NLP, Generative AI',
          weekStart: 17,
          weekEnd: 32,
          courses: ['teky-ai-for-teens'],
        },
      ],
      weeklyPlan: {
        sessionsPerWeek: 2,
        minutesPerSession: 90,
        format: 'Học trực tuyến 1-1 hoặc nhóm nhỏ',
      },
      metadata: {
        source: 'https://edtech.teky.edu.vn/khoa_hoc',
        teacherName: 'Việt Chung',
        teacherEmail: 'thegioithu2@gmail.com',
        certification: 'Chứng chỉ AI Quốc Tế',
        lastUpdated: new Date().toISOString(),
      },
      updatedAt: new Date(),
    },
  })
  console.log(`🗺️  Learning Path Template: Lộ trình AI Teky`)

  // Template 4: Lộ trình Luyện thi
  await prisma.learningPathTemplate.upsert({
    where: { id: 'teky-lo-trinh-thi-dau' },
    update: {
      title: 'Lộ trình Luyện thi & Thi đấu Teky',
      description: 'Luyện thi Tin học Trẻ (quốc gia) và HKICO (quốc tế). Dành cho học sinh 7-18 tuổi có đam mê lập trình thi đấu.',
    },
    create: {
      id: 'teky-lo-trinh-thi-dau',
      title: 'Lộ trình Luyện thi & Thi đấu Teky',
      description: 'Luyện thi Tin học Trẻ (quốc gia) và HKICO (quốc tế). Dành cho học sinh 7-18 tuổi có đam mê lập trình thi đấu.',
      createdById: teacher.id,
      isPublished: true,
      category: 'Luyện thi & Thi đấu',
      tags: ['tin học trẻ', 'HKICO', 'competitive programming', 'olympiad', 'thuật toán', 'teky'],
      difficultyLevel: 'challenging',
      estimatedWeeks: 24,
      weeklyHoursRequired: 'intensive',
      targetAcademicLevels: ['elementary', 'middle_school', 'high_school'],
      targetGoalTypes: ['competition', 'academic_excellence'],
      targetDomains: ['competitive_programming', 'algorithms', 'computer_science'],
      goals: [
        'Nắm vững thuật toán và cấu trúc dữ liệu',
        'Đạt giải kì thi Tin học Trẻ cấp quốc gia',
        'Đạt thành tích cao tại HKICO (Cuộc thi Lập trình Quốc tế)',
      ],
      domains: ['computer_science'],
      segments: [
        {
          title: 'Luyện thi Tin học Trẻ',
          description: 'Thuật toán, cấu trúc dữ liệu, giải đề thi mẫu các năm',
          weekStart: 1,
          weekEnd: 12,
          courses: ['teky-tin-hoc-tre'],
        },
        {
          title: 'Luyện thi HKICO Quốc tế',
          description: 'Computational thinking, problem solving strategies, past papers',
          weekStart: 13,
          weekEnd: 24,
          courses: ['teky-hkico'],
        },
      ],
      weeklyPlan: {
        sessionsPerWeek: 3,
        minutesPerSession: 90,
        format: 'Học trực tuyến 1-1 với huấn luyện viên',
      },
      metadata: {
        source: 'https://edtech.teky.edu.vn/khoa_hoc',
        teacherName: 'Việt Chung',
        teacherEmail: 'thegioithu2@gmail.com',
        competitions: ['Tin học Trẻ', 'HKICO'],
        lastUpdated: new Date().toISOString(),
      },
      updatedAt: new Date(),
    },
  })
  console.log(`🗺️  Learning Path Template: Lộ trình Luyện thi & Thi đấu Teky`)

  // ========================================
  // 5. Tổng kết
  // ========================================
  console.log('\n' + '='.repeat(50))
  console.log('✅ SEED HOÀN TẤT!')
  console.log('='.repeat(50))
  console.log(`👤 Giáo viên: Việt Chung (thegioithu2@gmail.com)`)
  console.log(`📁 Categories: ${categories.length}`)
  console.log(`📚 Khóa học: ${coursesData.length}`)
  console.log(`📖 Tổng chapters: ${coursesData.reduce((sum, c) => sum + c.chapters.length, 0)}`)
  console.log(`🗺️  Learning Path Templates: 4`)
  console.log('='.repeat(50))
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed thất bại:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
