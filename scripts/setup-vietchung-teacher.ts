import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function setupVietChungTeacher() {
  console.log('👨‍🏫 Setting up VietChung as Teacher...')

  try {
    // Tạo tài khoản giáo viên VietChung
    const hashedPassword = await hash('vietchung@3M', 12)
    
    const teacher = await prisma.user.upsert({
      where: { email: 'vietchungvn@gmail.com' },
      update: {},
      create: {
        name: 'VietChung',
        email: 'vietchungvn@gmail.com',
        password: hashedPassword,
        role: 'TEACHER',
        image: '/teachers/vietchung.jpg'
      }
    })

    console.log(`✅ Teacher created: ${teacher.name} (${teacher.email})`)

    // Tạo category Programming trước
    const category = await prisma.category.upsert({
      where: { name: "Programming" },
      update: {},
      create: { name: "Programming" }
    })

    // Tạo khóa học Python
    const course = await prisma.course.create({
      data: {
        title: "Python Programming for STEM Students",
        description: "Khóa học Python từ cơ bản đến nâng cao dành cho học sinh STEM, bao gồm lập trình cơ bản, xử lý dữ liệu, và các dự án thực tế.",
        imageUrl: "/python-course.jpg",
        price: 0, // Miễn phí cho học sinh
        isPublished: true,
        userId: teacher.id,
        categoryId: category.id
      }
    })

    console.log(`✅ Course created: ${course.title}`)

    // Tạo các chapters
    const chaptersData = [
      {
        title: "Phần 1: Làm quen với Python",
        description: "Giới thiệu Python, cài đặt môi trường, và các kiểu dữ liệu cơ bản",
        position: 1,
        lessons: [
          {
            title: "Giới thiệu Python và cài đặt môi trường",
            description: "Tìm hiểu về Python, cài đặt Python, VSCode, và Jupyter Notebook",
            position: 1,
            videoUrl: "/videos/python-intro.mp4"
          },
          {
            title: "Chương trình đầu tiên: Hello World",
            description: "Viết và chạy chương trình Python đầu tiên",
            position: 2,
            videoUrl: "/videos/hello-world.mp4"
          },
          {
            title: "Các kiểu dữ liệu cơ bản",
            description: "int, float, str, bool và cách sử dụng",
            position: 3,
            videoUrl: "/videos/data-types.mp4"
          },
          {
            title: "Toán tử và biểu thức",
            description: "Toán tử số học, so sánh, logic trong Python",
            position: 4,
            videoUrl: "/videos/operators.mp4"
          },
          {
            title: "Nhập và xuất dữ liệu",
            description: "Sử dụng input() và print() với format",
            position: 5,
            videoUrl: "/videos/input-output.mp4"
          }
        ]
      },
      {
        title: "Phần 2: Cấu trúc điều khiển",
        description: "Học về if/else, vòng lặp for/while và các bài tập thực hành",
        position: 2,
        lessons: [
          {
            title: "Câu lệnh rẽ nhánh if/elif/else",
            description: "Kiểm tra điều kiện và thực hiện khối code tương ứng",
            position: 1,
            videoUrl: "/videos/if-else.mp4"
          },
          {
            title: "Vòng lặp for và while",
            description: "Sử dụng vòng lặp để lặp lại các thao tác",
            position: 2,
            videoUrl: "/videos/loops.mp4"
          },
          {
            title: "Vòng lặp lồng nhau và điều khiển",
            description: "break, continue, pass và vòng lặp lồng nhau",
            position: 3,
            videoUrl: "/videos/nested-loops.mp4"
          },
          {
            title: "Bài tập thực hành",
            description: "Máy tính đơn giản, đoán số, bảng cửu chương",
            position: 4,
            videoUrl: "/videos/control-practice.mp4"
          }
        ]
      },
      {
        title: "Phần 3: Cấu trúc dữ liệu",
        description: "List, Tuple, Set, Dictionary và các phương thức quan trọng",
        position: 3,
        lessons: [
          {
            title: "List và Tuple",
            description: "Học về list và tuple, indexing, slicing",
            position: 1,
            videoUrl: "/videos/list-tuple.mp4"
          },
          {
            title: "Set và Dictionary",
            description: "Tập hợp và từ điển trong Python",
            position: 2,
            videoUrl: "/videos/set-dict.mp4"
          },
          {
            title: "List Comprehension",
            description: "Tạo list nhanh chóng và hiệu quả",
            position: 3,
            videoUrl: "/videos/comprehension.mp4"
          },
          {
            title: "Bài tập: Quản lý danh bạ",
            description: "Xây dựng chương trình quản lý danh bạ đơn giản",
            position: 4,
            videoUrl: "/videos/contact-manager.mp4"
          }
        ]
      },
      {
        title: "Phần 4: Hàm và Module",
        description: "Định nghĩa hàm, tham số, import module và tạo thư viện",
        position: 4,
        lessons: [
          {
            title: "Định nghĩa hàm cơ bản",
            description: "Tạo và sử dụng hàm trong Python",
            position: 1,
            videoUrl: "/videos/functions-basic.mp4"
          },
          {
            title: "Tham số và giá trị trả về",
            description: "Tham số mặc định, *args, **kwargs",
            position: 2,
            videoUrl: "/videos/function-params.mp4"
          },
          {
            title: "Import module và thư viện",
            description: "Sử dụng thư viện chuẩn và bên thứ 3",
            position: 3,
            videoUrl: "/videos/modules.mp4"
          },
          {
            title: "Tạo thư viện mini",
            description: "Viết thư viện toán học và xử lý chuỗi",
            position: 4,
            videoUrl: "/videos/custom-modules.mp4"
          }
        ]
      },
      {
        title: "Phần 5: Lập trình hướng đối tượng",
        description: "Class, Object, kế thừa, đa hình trong Python",
        position: 5,
        lessons: [
          {
            title: "Class và Object cơ bản",
            description: "Tạo class, object, thuộc tính và phương thức",
            position: 1,
            videoUrl: "/videos/class-object.mp4"
          },
          {
            title: "Constructor và Destructor",
            description: "__init__, __str__, __del__ methods",
            position: 2,
            videoUrl: "/videos/constructor.mp4"
          },
          {
            title: "Kế thừa và đa hình",
            description: "Inheritance và polymorphism trong Python",
            position: 3,
            videoUrl: "/videos/inheritance.mp4"
          },
          {
            title: "Bài tập: Quản lý sinh viên",
            description: "Xây dựng hệ thống quản lý sinh viên với OOP",
            position: 4,
            videoUrl: "/videos/student-management.mp4"
          }
        ]
      },
      {
        title: "Phần 6: Xử lý dữ liệu",
        description: "Đọc/ghi file, exception handling, phân tích dữ liệu",
        position: 6,
        lessons: [
          {
            title: "Đọc và ghi file",
            description: "Làm việc với file .txt, .csv, .json",
            position: 1,
            videoUrl: "/videos/file-handling.mp4"
          },
          {
            title: "Exception Handling",
            description: "try, except, finally và xử lý lỗi",
            position: 2,
            videoUrl: "/videos/exception-handling.mp4"
          },
          {
            title: "Phân tích dữ liệu cơ bản",
            description: "Đọc dữ liệu từ file và tạo báo cáo",
            position: 3,
            videoUrl: "/videos/data-analysis.mp4"
          }
        ]
      },
      {
        title: "Phần 7: Thư viện phổ biến",
        description: "NumPy, Pandas, Matplotlib cho data science",
        position: 7,
        lessons: [
          {
            title: "NumPy - Xử lý mảng",
            description: "Làm việc với mảng đa chiều trong NumPy",
            position: 1,
            videoUrl: "/videos/numpy.mp4"
          },
          {
            title: "Pandas - Xử lý dữ liệu",
            description: "DataFrame và Series trong Pandas",
            position: 2,
            videoUrl: "/videos/pandas.mp4"
          },
          {
            title: "Matplotlib - Vẽ biểu đồ",
            description: "Tạo biểu đồ với Matplotlib",
            position: 3,
            videoUrl: "/videos/matplotlib.mp4"
          },
          {
            title: "Bài tập: Phân tích điểm thi",
            description: "Phân tích dữ liệu học sinh và vẽ biểu đồ",
            position: 4,
            videoUrl: "/videos/grade-analysis.mp4"
          }
        ]
      },
      {
        title: "Phần 8: Dự án cuối khóa",
        description: "Xây dựng các ứng dụng thực tế",
        position: 8,
        lessons: [
          {
            title: "Dự án 1: Quản lý chi tiêu cá nhân",
            description: "Xây dựng ứng dụng CLI quản lý chi tiêu",
            position: 1,
            videoUrl: "/videos/expense-tracker.mp4"
          },
          {
            title: "Dự án 2: Phân tích dữ liệu học sinh",
            description: "Phân tích và trực quan hóa dữ liệu học sinh",
            position: 2,
            videoUrl: "/videos/student-data-analysis.mp4"
          },
          {
            title: "Dự án 3: Mini Game - Cờ caro",
            description: "Tạo trò chơi cờ caro bằng Python",
            position: 3,
            videoUrl: "/videos/tic-tac-toe.mp4"
          },
          {
            title: "Tổng kết và hướng phát triển",
            description: "Tổng kết khóa học và định hướng học tập tiếp theo",
            position: 4,
            videoUrl: "/videos/course-summary.mp4"
          }
        ]
      }
    ]

    // Tạo chapters và lessons
    for (const chapterData of chaptersData) {
      const { lessons, ...chapterInfo } = chapterData
      
      const chapter = await prisma.chapter.create({
        data: {
          ...chapterInfo,
          courseId: course.id,
          isPublished: true
        }
      })

      console.log(`✅ Chapter created: ${chapter.title}`)

      // Tạo lessons cho chapter (sử dụng Chapter model)
      for (const lessonData of chapterData.lessons) {
        await prisma.chapter.create({
          data: {
            title: lessonData.title,
            description: lessonData.description,
            videoUrl: lessonData.videoUrl,
            position: lessonData.position,
            isPublished: true,
            courseId: course.id
          }
        })
        console.log(`  ✅ Lesson: ${lessonData.title}`)
      }
    }

    // Tạo một số exercises mẫu
    const exercises = [
      {
        title: "Bài tập: Máy tính đơn giản",
        description: "Viết chương trình máy tính đơn giản với 4 phép toán cơ bản",
        content: `# Bài tập: Máy tính đơn giản
# Yêu cầu: Viết chương trình máy tính đơn giản
# Cho phép người dùng nhập 2 số và chọn phép toán
# Hiển thị kết quả

# Gợi ý:
# 1. Sử dụng input() để nhập số
# 2. Sử dụng input() để nhập phép toán
# 3. Sử dụng if/elif để xử lý từng phép toán
# 4. In kết quả ra màn hình

# Code mẫu bắt đầu:
num1 = float(input("Nhập số thứ nhất: "))
phep_toan = input("Chọn phép toán (+, -, *, /): ")
num2 = float(input("Nhập số thứ hai: "))

# Viết code của bạn ở đây...`,
        type: "CODING"
      },
      {
        title: "Bài tập: Quản lý danh bạ",
        description: "Tạo chương trình quản lý danh bạ đơn giản",
        content: `# Bài tập: Quản lý danh bạ
# Yêu cầu: Tạo chương trình quản lý danh bạ
# Cho phép thêm, xem, tìm kiếm liên hệ

# Gợi ý:
# 1. Sử dụng list để lưu danh bạ
# 2. Sử dụng dict để lưu thông tin mỗi liên hệ
# 3. Tạo các hàm: them_lien_he(), xem_danh_ba(), tim_kiem()

# Code mẫu bắt đầu:
danh_ba = []

def them_lien_he(ten, so_dien_thoai):
    # Viết code của bạn ở đây
    pass

def xem_danh_ba():
    # Viết code của bạn ở đây
    pass

# Test chương trình
them_lien_he("Alice", "0123456789")
them_lien_he("Bob", "0987654321")
xem_danh_ba()`,
        type: "CODING"
      }
    ]

    console.log('🎉 VietChung Teacher Setup Complete!')
    console.log(`👨‍🏫 Teacher: ${teacher.name} (${teacher.email})`)
    console.log(`📚 Course: ${course.title}`)
    console.log(`📖 Chapters: ${chaptersData.length}`)
    console.log(`📝 Total lessons: ${chaptersData.reduce((sum, ch) => sum + ch.lessons.length, 0)}`)

    console.log('\n🔑 Login credentials:')
    console.log(`Email: ${teacher.email}`)
    console.log(`Password: vietchung@3M`)
    console.log(`Role: ${teacher.role}`)

  } catch (error) {
    console.error('❌ Error setting up VietChung teacher:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupVietChungTeacher()
