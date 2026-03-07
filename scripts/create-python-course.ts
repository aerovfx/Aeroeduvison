import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createPythonCourse() {
  console.log('🚀 Creating Python STEM Learning Path...')

  try {
    // Tạo khóa học chính
    const course = await prisma.course.create({
      data: {
        title: "Python Programming for STEM Students",
        description: "Khóa học Python từ cơ bản đến nâng cao dành cho học sinh STEM, bao gồm lập trình cơ bản, xử lý dữ liệu, và các dự án thực tế.",
        imageUrl: "/python-course.jpg",
        price: 0, // Miễn phí cho học sinh
        isPublished: true,
        userId: "default-teacher", // Sẽ được thay thế bằng teacher thực tế
        category: {
          connectOrCreate: {
            where: { name: "Programming" },
            create: { name: "Programming" }
          }
        }
      }
    })

    console.log(`✅ Course created: ${course.id}`)

    // Tạo các chapters
    const chapters = [
      {
        title: "Phần 1: Làm quen với Python",
        description: "Giới thiệu Python, cài đặt môi trường, và các kiểu dữ liệu cơ bản",
        position: 1
      },
      {
        title: "Phần 2: Cấu trúc điều khiển",
        description: "Học về if/else, vòng lặp for/while và các bài tập thực hành",
        position: 2
      },
      {
        title: "Phần 3: Cấu trúc dữ liệu",
        description: "List, Tuple, Set, Dictionary và các phương thức quan trọng",
        position: 3
      },
      {
        title: "Phần 4: Hàm và Module",
        description: "Định nghĩa hàm, tham số, import module và tạo thư viện",
        position: 4
      },
      {
        title: "Phần 5: Lập trình hướng đối tượng",
        description: "Class, Object, kế thừa, đa hình trong Python",
        position: 5
      },
      {
        title: "Phần 6: Xử lý dữ liệu",
        description: "Đọc/ghi file, exception handling, phân tích dữ liệu",
        position: 6
      },
      {
        title: "Phần 7: Thư viện phổ biến",
        description: "NumPy, Pandas, Matplotlib cho data science",
        position: 7
      },
      {
        title: "Phần 8: Dự án cuối khóa",
        description: "Xây dựng các ứng dụng thực tế: quản lý chi tiêu, phân tích dữ liệu, mini game",
        position: 8
      }
    ]

    const createdChapters = []
    for (const chapterData of chapters) {
      const chapter = await prisma.chapter.create({
        data: {
          ...chapterData,
          courseId: course.id,
          isPublished: true,
          position: chapterData.position
        }
      })
      createdChapters.push(chapter)
      console.log(`✅ Chapter created: ${chapter.title}`)
    }

    // Tạo lessons cho Chapter 1
    const chapter1Lessons = [
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

    for (const lessonData of chapter1Lessons) {
      await prisma.lesson.create({
        data: {
          ...lessonData,
          chapterId: createdChapters[0].id,
          isPublished: true
        }
      })
      console.log(`✅ Lesson created: ${lessonData.title}`)
    }

    // Tạo lessons cho Chapter 2
    const chapter2Lessons = [
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

    for (const lessonData of chapter2Lessons) {
      await prisma.lesson.create({
        data: {
          ...lessonData,
          chapterId: createdChapters[1].id,
          isPublished: true
        }
      })
      console.log(`✅ Lesson created: ${lessonData.title}`)
    }

    // Tạo một số exercises mẫu
    const exercises = [
      {
        title: "Bài tập: Máy tính đơn giản",
        description: "Viết chương trình máy tính đơn giản với 4 phép toán cơ bản",
        lessonId: createdChapters[1].lessons[3]?.id || null,
        isPublished: true,
        type: "CODING",
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

# Viết code của bạn ở đây...`
      },
      {
        title: "Bài tập: Quản lý danh bạ",
        description: "Tạo chương trình quản lý danh bạ đơn giản",
        lessonId: createdChapters[2].lessons[0]?.id || null,
        isPublished: true,
        type: "CODING",
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
xem_danh_ba()`
      }
    ]

    console.log('🎉 Python STEM Learning Path created successfully!')
    console.log(`📚 Course: ${course.title}`)
    console.log(`📖 Chapters: ${createdChapters.length}`)
    console.log(`📝 Total lessons: ${chapter1Lessons.length + chapter2Lessons.length}`)

  } catch (error) {
    console.error('❌ Error creating Python course:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createPythonCourse()

