import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function createSTEMCourses() {
  console.log('🎓 Creating STEM Courses for High School Students...')

  try {
    // Tìm teacher VietChung
    const teacher = await prisma.user.findUnique({
      where: { email: 'vietchungvn@gmail.com' }
    })

    if (!teacher) {
      console.error('❌ Teacher VietChung not found')
      return
    }

    // Tạo các categories
    const categories = [
      { name: "Mathematics" },
      { name: "Chemistry" },
      { name: "Physics" },
      { name: "Biology" },
      { name: "Programming" }
    ]

    for (const cat of categories) {
      await prisma.category.upsert({
        where: { name: cat.name },
        update: {},
        create: { name: cat.name }
      })
    }

    console.log('✅ Categories created')

    // Tạo khóa học Toán học cơ bản (Lớp 10-12)
    const mathCategory = await prisma.category.findUnique({ where: { name: "Mathematics" } })
    
    const mathCourse = await prisma.course.create({
      data: {
        title: "Toán học cơ bản - Lớp 10-12",
        description: "Khóa học toán học toàn diện từ lớp 10 đến lớp 12, bao gồm đại số, hình học, và giải tích",
        imageUrl: "/math-course.jpg",
        price: 0,
        isPublished: true,
        userId: teacher.id,
        categoryId: mathCategory!.id
      }
    })

    // Tạo chapters cho Toán học
    const mathChapters = [
      {
        title: "Đại số - Lớp 10",
        description: "Hàm số bậc nhất, bậc hai, phương trình và bất phương trình",
        position: 1,
        lessons: [
          { title: "Hàm số bậc nhất", description: "Khái niệm và đồ thị hàm số bậc nhất", position: 1 },
          { title: "Hàm số bậc hai", description: "Parabol và các tính chất", position: 2 },
          { title: "Phương trình bậc hai", description: "Giải phương trình và định lý Viète", position: 3 },
          { title: "Bất phương trình", description: "Bất phương trình bậc nhất và bậc hai", position: 4 }
        ]
      },
      {
        title: "Hình học - Lớp 10",
        description: "Vectơ, tọa độ trong mặt phẳng và không gian",
        position: 2,
        lessons: [
          { title: "Vectơ trong mặt phẳng", description: "Khái niệm vectơ và các phép toán", position: 1 },
          { title: "Tích vô hướng", description: "Tích vô hướng của hai vectơ", position: 2 },
          { title: "Phương trình đường thẳng", description: "Các dạng phương trình đường thẳng", position: 3 },
          { title: "Phương trình đường tròn", description: "Phương trình đường tròn và vị trí tương đối", position: 4 }
        ]
      },
      {
        title: "Lượng giác - Lớp 11",
        description: "Công thức lượng giác và phương trình lượng giác",
        position: 3,
        lessons: [
          { title: "Cung và góc lượng giác", description: "Đơn vị đo góc và cung lượng giác", position: 1 },
          { title: "Giá trị lượng giác", description: "Sin, cos, tan, cot của các góc đặc biệt", position: 2 },
          { title: "Công thức lượng giác", description: "Công thức cộng, nhân đôi, biến đổi", position: 3 },
          { title: "Phương trình lượng giác", description: "Giải các phương trình lượng giác cơ bản", position: 4 }
        ]
      },
      {
        title: "Giải tích - Lớp 12",
        description: "Đạo hàm, tích phân và ứng dụng",
        position: 4,
        lessons: [
          { title: "Giới hạn và liên tục", description: "Khái niệm giới hạn và tính liên tục", position: 1 },
          { title: "Đạo hàm", description: "Quy tắc tính đạo hàm và ứng dụng", position: 2 },
          { title: "Tích phân", description: "Nguyên hàm và tích phân xác định", position: 3 },
          { title: "Ứng dụng đạo hàm", description: "Tìm cực trị và khảo sát hàm số", position: 4 },
          { title: "Ứng dụng tích phân", description: "Tính diện tích và thể tích", position: 5 }
        ]
      }
    ]

    for (const chapterData of mathChapters) {
      const { lessons, ...chapterInfo } = chapterData
      
      const chapter = await prisma.chapter.create({
        data: {
          ...chapterInfo,
          courseId: mathCourse.id,
          isPublished: true
        }
      })

      for (const lessonData of lessons) {
        await prisma.chapter.create({
          data: {
            title: lessonData.title,
            description: lessonData.description,
            position: lessonData.position,
            isPublished: true,
            courseId: mathCourse.id
          }
        })
      }
    }

    console.log(`✅ Math course created: ${mathCourse.title}`)

    // Tạo khóa học Hóa học
    const chemistryCategory = await prisma.category.findUnique({ where: { name: "Chemistry" } })
    
    const chemistryCourse = await prisma.course.create({
      data: {
        title: "Hóa học - Lớp 10-12",
        description: "Khóa học hóa học toàn diện từ cơ bản đến nâng cao cho học sinh THPT",
        imageUrl: "/chemistry-course.jpg",
        price: 0,
        isPublished: true,
        userId: teacher.id,
        categoryId: chemistryCategory!.id
      }
    })

    // Tạo khóa học Vật lý
    const physicsCategory = await prisma.category.findUnique({ where: { name: "Physics" } })
    
    const physicsCourse = await prisma.course.create({
      data: {
        title: "Vật lý - Lớp 10-12",
        description: "Khóa học vật lý từ cơ bản đến nâng cao, bao gồm cơ học, điện học, quang học",
        imageUrl: "/physics-course.jpg",
        price: 0,
        isPublished: true,
        userId: teacher.id,
        categoryId: physicsCategory!.id
      }
    })

    // Tạo khóa học Sinh học
    const biologyCategory = await prisma.category.findUnique({ where: { name: "Biology" } })
    
    const biologyCourse = await prisma.course.create({
      data: {
        title: "Sinh học - Lớp 10-12",
        description: "Khóa học sinh học toàn diện từ tế bào đến hệ sinh thái",
        imageUrl: "/biology-course.jpg",
        price: 0,
        isPublished: true,
        userId: teacher.id,
        categoryId: biologyCategory!.id
      }
    })

    // Cập nhật khóa học Python với nội dung phù hợp lớp 10-12
    const pythonCourse = await prisma.course.findFirst({
      where: { title: "Python Programming for STEM Students" }
    })

    if (pythonCourse) {
      // Xóa các chapters cũ
      await prisma.chapter.deleteMany({
        where: { courseId: pythonCourse.id }
      })

      // Tạo lại với nội dung phù hợp lớp 10-12
      const pythonChapters = [
        {
          title: "Python Cơ bản - Lớp 10",
          description: "Làm quen với Python và các khái niệm cơ bản",
          position: 1,
          lessons: [
            { title: "Giới thiệu Python", description: "Python là gì và tại sao học Python?", position: 1 },
            { title: "Cài đặt môi trường", description: "Cài đặt Python, VSCode, và Jupyter", position: 2 },
            { title: "Biến và kiểu dữ liệu", description: "int, float, str, bool và cách sử dụng", position: 3 },
            { title: "Input/Output", description: "Nhập và xuất dữ liệu với input() và print()", position: 4 },
            { title: "Toán tử và biểu thức", description: "Các toán tử số học, so sánh, logic", position: 5 }
          ]
        },
        {
          title: "Cấu trúc điều khiển - Lớp 10",
          description: "if/else, vòng lặp và logic điều khiển chương trình",
          position: 2,
          lessons: [
            { title: "Câu lệnh if/elif/else", description: "Điều kiện và rẽ nhánh trong Python", position: 1 },
            { title: "Vòng lặp for", description: "Lặp với for và range()", position: 2 },
            { title: "Vòng lặp while", description: "Lặp với điều kiện while", position: 3 },
            { title: "Bài tập: Máy tính đơn giản", description: "Xây dựng máy tính đơn giản", position: 4 }
          ]
        },
        {
          title: "Cấu trúc dữ liệu - Lớp 11",
          description: "List, Tuple, Set, Dictionary và ứng dụng",
          position: 3,
          lessons: [
            { title: "List và Tuple", description: "Mảng trong Python và cách sử dụng", position: 1 },
            { title: "Set và Dictionary", description: "Tập hợp và từ điển", position: 2 },
            { title: "List Comprehension", description: "Tạo list nhanh và hiệu quả", position: 3 },
            { title: "Bài tập: Quản lý điểm số", description: "Quản lý điểm số học sinh", position: 4 }
          ]
        },
        {
          title: "Hàm và Module - Lớp 11",
          description: "Tạo hàm, sử dụng module và thư viện",
          position: 4,
          lessons: [
            { title: "Định nghĩa hàm", description: "Tạo và sử dụng hàm trong Python", position: 1 },
            { title: "Tham số và return", description: "Tham số mặc định, *args, **kwargs", position: 2 },
            { title: "Module và thư viện", description: "import, math, random, datetime", position: 3 },
            { title: "Bài tập: Thư viện toán học", description: "Tạo thư viện tính toán", position: 4 }
          ]
        },
        {
          title: "Lập trình hướng đối tượng - Lớp 12",
          description: "Class, Object, kế thừa trong Python",
          position: 5,
          lessons: [
            { title: "Class và Object", description: "Khái niệm OOP và cách sử dụng", position: 1 },
            { title: "Constructor và Method", description: "__init__, __str__ và các method đặc biệt", position: 2 },
            { title: "Kế thừa", description: "Inheritance và polymorphism", position: 3 },
            { title: "Bài tập: Hệ thống quản lý", description: "Xây dựng hệ thống quản lý sinh viên", position: 4 }
          ]
        },
        {
          title: "Xử lý dữ liệu - Lớp 12",
          description: "Đọc/ghi file, exception handling",
          position: 6,
          lessons: [
            { title: "Đọc và ghi file", description: "Làm việc với file .txt, .csv, .json", position: 1 },
            { title: "Exception Handling", description: "try, except, finally", position: 2 },
            { title: "Bài tập: Phân tích dữ liệu", description: "Đọc và phân tích dữ liệu từ file", position: 3 }
          ]
        },
        {
          title: "Thư viện khoa học - Lớp 12",
          description: "NumPy, Pandas, Matplotlib cho STEM",
          position: 7,
          lessons: [
            { title: "NumPy cơ bản", description: "Mảng đa chiều và tính toán", position: 1 },
            { title: "Pandas cơ bản", description: "DataFrame và xử lý dữ liệu", position: 2 },
            { title: "Matplotlib cơ bản", description: "Vẽ biểu đồ và trực quan hóa", position: 3 },
            { title: "Bài tập: Phân tích thí nghiệm", description: "Phân tích dữ liệu thí nghiệm", position: 4 }
          ]
        },
        {
          title: "Dự án STEM - Lớp 12",
          description: "Các dự án thực tế cho học sinh STEM",
          position: 8,
          lessons: [
            { title: "Dự án: Máy tính khoa học", description: "Xây dựng máy tính khoa học", position: 1 },
            { title: "Dự án: Phân tích dữ liệu khí hậu", description: "Phân tích và vẽ biểu đồ khí hậu", position: 2 },
            { title: "Dự án: Mô phỏng vật lý", description: "Mô phỏng chuyển động và dao động", position: 3 },
            { title: "Dự án cuối khóa", description: "Tổng hợp kiến thức và định hướng", position: 4 }
          ]
        }
      ]

      for (const chapterData of pythonChapters) {
        const { lessons, ...chapterInfo } = chapterData
        
        const chapter = await prisma.chapter.create({
          data: {
            ...chapterInfo,
            courseId: pythonCourse.id,
            isPublished: true
          }
        })

        for (const lessonData of lessons) {
          await prisma.chapter.create({
            data: {
              title: lessonData.title,
              description: lessonData.description,
              position: lessonData.position,
              isPublished: true,
              courseId: pythonCourse.id
            }
          })
        }
      }

      console.log(`✅ Python course updated with grade 10-12 content`)
    }

    console.log('🎉 All STEM courses created successfully!')
    console.log('📚 Courses:')
    console.log(`  - ${mathCourse.title}`)
    console.log(`  - ${chemistryCourse.title}`)
    console.log(`  - ${physicsCourse.title}`)
    console.log(`  - ${biologyCourse.title}`)
    console.log(`  - Python Programming (updated)`)

  } catch (error) {
    console.error('❌ Error creating STEM courses:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSTEMCourses()

