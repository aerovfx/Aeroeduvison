import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixCourseLinks() {
  console.log('🔗 Fixing course links for learning paths...')

  try {
    // Tạo hoặc cập nhật các khóa học với slug phù hợp
    const courses = [
      {
        title: "Toán học cơ bản - Lớp 10-12",
        slug: "toan-hoc-co-ban",
        description: "Khóa học toán học toàn diện từ lớp 10 đến lớp 12, bao gồm đại số, hình học, và giải tích",
        imageUrl: "/math-course.jpg",
        category: "Mathematics"
      },
      {
        title: "Hóa học - Lớp 10-12", 
        slug: "hoa-hoc",
        description: "Khóa học hóa học toàn diện từ cơ bản đến nâng cao cho học sinh THPT",
        imageUrl: "/chemistry-course.jpg",
        category: "Chemistry"
      },
      {
        title: "Vật lý - Lớp 10-12",
        slug: "vat-ly", 
        description: "Khóa học vật lý từ cơ bản đến nâng cao, bao gồm cơ học, điện học, quang học",
        imageUrl: "/physics-course.jpg",
        category: "Physics"
      },
      {
        title: "Sinh học - Lớp 10-12",
        slug: "sinh-hoc",
        description: "Khóa học sinh học toàn diện từ tế bào đến hệ sinh thái",
        imageUrl: "/biology-course.jpg",
        category: "Biology"
      },
      {
        title: "Python Programming for STEM Students",
        slug: "python-programming",
        description: "Lập trình Python từ cơ bản đến nâng cao cho học sinh STEM",
        imageUrl: "/python-course.jpg",
        category: "Programming"
      }
    ]

    // Tìm teacher VietChung
    const teacher = await prisma.user.findUnique({
      where: { email: 'vietchungvn@gmail.com' }
    })

    if (!teacher) {
      console.error('❌ Teacher VietChung not found')
      return
    }

    for (const courseData of courses) {
      // Tìm category
      const category = await prisma.category.findUnique({
        where: { name: courseData.category }
      })

      if (!category) {
        console.error(`❌ Category ${courseData.category} not found`)
        continue
      }

      // Tìm khóa học hiện tại hoặc tạo mới
      let course = await prisma.course.findFirst({
        where: {
          OR: [
            { title: courseData.title },
            { title: { contains: courseData.slug } }
          ]
        },
        include: {
          chapters: true
        }
      })

      if (course) {
        // Cập nhật khóa học hiện tại
        course = await prisma.course.update({
          where: { id: course.id },
          data: {
            title: courseData.title,
            description: courseData.description,
            imageUrl: courseData.imageUrl,
            categoryId: category.id
          },
          include: {
            chapters: true
          }
        })
        console.log(`✅ Updated course: ${course.title}`)
      } else {
        // Tạo khóa học mới
        course = await prisma.course.create({
          data: {
            title: courseData.title,
            description: courseData.description,
            imageUrl: courseData.imageUrl,
            price: 0,
            isPublished: true,
            userId: teacher.id,
            categoryId: category.id
          },
          include: {
            chapters: true
          }
        })
        console.log(`✅ Created course: ${course.title}`)
      }

      // Tạo một số chapters mẫu nếu chưa có
      if (course.chapters.length === 0) {
        const sampleChapters = [
          {
            title: `Giới thiệu ${courseData.category}`,
            description: `Bắt đầu học ${courseData.category.toLowerCase()}`,
            position: 1,
            isPublished: true,
            courseId: course.id
          },
          {
            title: `Kiến thức cơ bản`,
            description: `Các khái niệm cơ bản trong ${courseData.category.toLowerCase()}`,
            position: 2,
            isPublished: true,
            courseId: course.id
          }
        ]

        for (const chapterData of sampleChapters) {
          await prisma.chapter.create({
            data: chapterData
          })
        }
        console.log(`  📝 Added sample chapters to ${course.title}`)
      }
    }

    console.log('🎉 Course links fixed successfully!')
    console.log('📚 Available courses:')
    const allCourses = await prisma.course.findMany({
      where: { isPublished: true },
      include: { category: true, chapters: true }
    })

    allCourses.forEach(course => {
      console.log(`  - ${course.title} (${course.chapters.length} chapters)`)
    })

  } catch (error) {
    console.error('❌ Error fixing course links:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixCourseLinks()

