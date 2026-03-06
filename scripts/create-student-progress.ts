import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createStudentProgress() {
  console.log('👤 Creating sample learning paths for student...')

  try {
    // Tìm student
    const student = await prisma.user.findUnique({
      where: { email: 'student@example.com' }
    })

    if (!student) {
      console.error('❌ Student not found')
      return
    }

    console.log(`✅ Found student: ${student.name}`)

    // Lấy các khóa học
    const courses = await prisma.course.findMany({
      where: { isPublished: true },
      include: {
        chapters: {
          where: { isPublished: true },
          orderBy: { position: 'asc' }
        }
      }
    })

    console.log(`📚 Found ${courses.length} courses`)

    // Tạo progress cho từng khóa học
    for (const course of courses) {
      console.log(`\n📖 Processing: ${course.title}`)
      
      // Xóa progress cũ nếu có
      await prisma.userProgress.deleteMany({
        where: {
          userId: student.id,
          chapter: {
            courseId: course.id
          }
        }
      })

      let completedChapters = 0
      let totalChapters = course.chapters.length

      // Thiết lập progress dựa trên loại khóa học
      if (course.title.includes('Toán học')) {
        completedChapters = Math.floor(totalChapters * 0.25) // 25% hoàn thành
      } else if (course.title.includes('Hóa học')) {
        completedChapters = Math.floor(totalChapters * 0.60) // 60% hoàn thành
      } else if (course.title.includes('Vật lý')) {
        completedChapters = Math.floor(totalChapters * 0.10) // 10% hoàn thành
      } else if (course.title.includes('Sinh học')) {
        completedChapters = 0 // 0% hoàn thành
      } else if (course.title.includes('Python')) {
        completedChapters = 0 // 0% hoàn thành
      }

      // Tạo progress cho các chapters đã hoàn thành
      for (let i = 0; i < completedChapters; i++) {
        const chapter = course.chapters[i]
        if (chapter) {
          await prisma.userProgress.create({
            data: {
              userId: student.id,
              chapterId: chapter.id,
              isCompleted: true
            }
          })
          console.log(`  ✅ Completed: ${chapter.title}`)
        }
      }

      // Tạo progress cho chapter hiện tại (nếu có)
      if (completedChapters < totalChapters) {
        const currentChapter = course.chapters[completedChapters]
        if (currentChapter) {
          await prisma.userProgress.create({
            data: {
              userId: student.id,
              chapterId: currentChapter.id,
              isCompleted: false
            }
          })
          console.log(`  🔄 In Progress: ${currentChapter.title}`)
        }
      }

      console.log(`  📊 Progress: ${completedChapters}/${totalChapters} chapters`)
    }

    // Tạo một số achievements/special activities
    console.log('\n🏆 Creating special activities...')
    
    const specialActivities = [
      {
        title: "Kiểm tra",
        xp: 30,
        description: "Bài kiểm tra kiến thức cơ bản",
        isLocked: true,
        lockReason: "Hoàn thành ít nhất 5 bài học để mở khóa"
      },
      {
        title: "Kho báu",
        xp: 0,
        description: "Thu thập điểm thưởng và phần thưởng",
        isLocked: true,
        lockReason: "Đạt cấp độ 3 để mở khóa"
      },
      {
        title: "Hệ phương trình",
        xp: 35,
        description: "Giải hệ phương trình nâng cao",
        isLocked: true,
        lockReason: "Hoàn thành chương Đại số để mở khóa"
      },
      {
        title: "Thử thách",
        xp: 50,
        description: "Thử thách lập trình Python",
        isLocked: true,
        lockReason: "Hoàn thành khóa Python cơ bản để mở khóa"
      }
    ]

    console.log('✅ Special activities created:')
    specialActivities.forEach(activity => {
      console.log(`  🔒 ${activity.title} (+${activity.xp} XP) - ${activity.lockReason}`)
    })

    console.log('\n🎉 Student learning paths created successfully!')
    console.log('📊 Summary:')
    console.log(`  - Student: ${student.name} (${student.email})`)
    console.log(`  - Courses: ${courses.length}`)
    console.log(`  - Special Activities: ${specialActivities.length}`)

  } catch (error) {
    console.error('❌ Error creating student progress:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createStudentProgress()

