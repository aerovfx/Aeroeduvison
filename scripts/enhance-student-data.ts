import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function enhanceStudentData() {
  console.log('🎮 Enhancing student data with achievements and progress...')

  try {
    // Tìm student
    const student = await prisma.user.findUnique({
      where: { email: 'student@example.com' }
    })

    if (!student) {
      console.error('❌ Student not found')
      return
    }

    // Tạo thêm một số userProgress để có progress thực tế
    const mathCourse = await prisma.course.findFirst({
      where: { title: { contains: 'Toán học' } },
      include: { chapters: { where: { isPublished: true }, orderBy: { position: 'asc' } } }
    })

    if (mathCourse && mathCourse.chapters.length > 0) {
      // Hoàn thành thêm 2 chapters nữa
      const additionalChapters = mathCourse.chapters.slice(5, 7) // chapters 6-7
      
      for (const chapter of additionalChapters) {
        await prisma.userProgress.upsert({
          where: {
            userId_chapterId: {
              userId: student.id,
              chapterId: chapter.id
            }
          },
          update: { isCompleted: true },
          create: {
            userId: student.id,
            chapterId: chapter.id,
            isCompleted: true
          }
        })
        console.log(`✅ Completed additional chapter: ${chapter.title}`)
      }
    }

    // Tạo progress cho Hóa học
    const chemistryCourse = await prisma.course.findFirst({
      where: { title: { contains: 'Hóa học' } },
      include: { chapters: { where: { isPublished: true }, orderBy: { position: 'asc' } } }
    })

    if (chemistryCourse && chemistryCourse.chapters.length > 0) {
      // Hoàn thành thêm 1 chapter nữa để có 60%
      const additionalChapter = chemistryCourse.chapters[9] // chapter 10
      
      if (additionalChapter) {
        await prisma.userProgress.upsert({
          where: {
            userId_chapterId: {
              userId: student.id,
              chapterId: additionalChapter.id
            }
          },
          update: { isCompleted: true },
          create: {
            userId: student.id,
            chapterId: additionalChapter.id,
            isCompleted: true
          }
        })
        console.log(`✅ Completed chemistry chapter: ${additionalChapter.title}`)
      }
    }

    // Tạo progress cho Vật lý (thêm 1 chapter để có 10%)
    const physicsCourse = await prisma.course.findFirst({
      where: { title: { contains: 'Vật lý' } },
      include: { chapters: { where: { isPublished: true }, orderBy: { position: 'asc' } } }
    })

    if (physicsCourse && physicsCourse.chapters.length > 0) {
      const additionalChapter = physicsCourse.chapters[1] // chapter 2
      
      if (additionalChapter) {
        await prisma.userProgress.upsert({
          where: {
            userId_chapterId: {
              userId: student.id,
              chapterId: additionalChapter.id
            }
          },
          update: { isCompleted: true },
          create: {
            userId: student.id,
            chapterId: additionalChapter.id,
            isCompleted: true
          }
        })
        console.log(`✅ Completed physics chapter: ${additionalChapter.title}`)
      }
    }

    console.log('\n📊 Student progress enhanced successfully!')

    console.log('\n🎉 Student data enhanced successfully!')
    console.log('📊 Summary:')
    console.log('  - Additional progress added to courses')
    console.log('  - Student dashboard ready with rich data')

  } catch (error) {
    console.error('❌ Error enhancing student data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

enhanceStudentData()
