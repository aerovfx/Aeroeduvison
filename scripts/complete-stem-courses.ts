import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function completeSTEMCourses() {
  console.log('📚 Completing STEM courses with chapters...')

  try {
    // Tìm các khóa học cần hoàn thiện
    const courses = await prisma.course.findMany({
      where: {
        title: {
          in: [
            'Hóa học - Lớp 10-12',
            'Vật lý - Lớp 10-12', 
            'Sinh học - Lớp 10-12'
          ]
        }
      },
      include: {
        chapters: true
      }
    })

    for (const course of courses) {
      if (course.chapters.length === 0) {
        console.log(`📝 Adding chapters to ${course.title}...`)
        
        let chaptersData = []

        if (course.title.includes('Hóa học')) {
          chaptersData = [
            {
              title: "Cấu trúc nguyên tử - Lớp 10",
              description: "Nguyên tử, hạt nhân, electron và cấu hình electron",
              position: 1,
              lessons: [
                { title: "Thành phần nguyên tử", description: "Proton, neutron, electron", position: 1 },
                { title: "Cấu hình electron", description: "Orbital và phân lớp electron", position: 2 },
                { title: "Bảng tuần hoàn", description: "Chu kỳ, nhóm và tính chất", position: 3 },
                { title: "Liên kết hóa học", description: "Liên kết ion, cộng hóa trị", position: 4 }
              ]
            },
            {
              title: "Phản ứng hóa học - Lớp 10",
              description: "Cân bằng phương trình và tính toán hóa học",
              position: 2,
              lessons: [
                { title: "Phương trình hóa học", description: "Cách viết và cân bằng phương trình", position: 1 },
                { title: "Tính toán hóa học", description: "Mol, khối lượng, thể tích", position: 2 },
                { title: "Nồng độ dung dịch", description: "Molarity, molality, phần trăm", position: 3 },
                { title: "Bài tập thực hành", description: "Giải các bài toán hóa học", position: 4 }
              ]
            },
            {
              title: "Hóa học hữu cơ - Lớp 11",
              description: "Hiđrocacbon và các hợp chất hữu cơ",
              position: 3,
              lessons: [
                { title: "Hiđrocacbon no", description: "Ankan và cycloankan", position: 1 },
                { title: "Hiđrocacbon không no", description: "Anken, ankin", position: 2 },
                { title: "Hiđrocacbon thơm", description: "Benzen và dẫn xuất", position: 3 },
                { title: "Dẫn xuất halogen", description: "Hợp chất halogen hữu cơ", position: 4 }
              ]
            }
          ]
        } else if (course.title.includes('Vật lý')) {
          chaptersData = [
            {
              title: "Cơ học - Lớp 10",
              description: "Chuyển động, lực và năng lượng",
              position: 1,
              lessons: [
                { title: "Chuyển động thẳng", description: "Vận tốc, gia tốc, phương trình", position: 1 },
                { title: "Chuyển động tròn", description: "Tốc độ góc, lực hướng tâm", position: 2 },
                { title: "Các định luật Newton", description: "Định luật I, II, III Newton", position: 3 },
                { title: "Năng lượng", description: "Động năng, thế năng, bảo toàn", position: 4 }
              ]
            },
            {
              title: "Điện học - Lớp 11",
              description: "Điện tích, điện trường và dòng điện",
              position: 2,
              lessons: [
                { title: "Điện tích và điện trường", description: "Định luật Coulomb, điện trường", position: 1 },
                { title: "Dòng điện không đổi", description: "Cường độ dòng điện, hiệu điện thế", position: 2 },
                { title: "Định luật Ohm", description: "Điện trở, công suất điện", position: 3 },
                { title: "Mạch điện", description: "Mạch nối tiếp, song song", position: 4 }
              ]
            },
            {
              title: "Quang học - Lớp 12",
              description: "Ánh sáng, gương và thấu kính",
              position: 3,
              lessons: [
                { title: "Phản xạ ánh sáng", description: "Gương phẳng, gương cầu", position: 1 },
                { title: "Khúc xạ ánh sáng", description: "Định luật Snell, tổng phản xạ", position: 2 },
                { title: "Thấu kính", description: "Thấu kính hội tụ, phân kỳ", position: 3 },
                { title: "Mắt và dụng cụ quang", description: "Mắt, kính lúp, kính hiển vi", position: 4 }
              ]
            }
          ]
        } else if (course.title.includes('Sinh học')) {
          chaptersData = [
            {
              title: "Sinh học tế bào - Lớp 10",
              description: "Cấu trúc và chức năng của tế bào",
              position: 1,
              lessons: [
                { title: "Cấu trúc tế bào", description: "Tế bào nhân sơ, nhân thực", position: 1 },
                { title: "Màng tế bào", description: "Cấu trúc và vận chuyển qua màng", position: 2 },
                { title: "Bào quan", description: "Ty thể, lục lạp, ribosome", position: 3 },
                { title: "Chu trình tế bào", description: "Phân chia tế bào", position: 4 }
              ]
            },
            {
              title: "Di truyền học - Lớp 11",
              description: "ADN, gen và di truyền",
              position: 2,
              lessons: [
                { title: "Cấu trúc ADN", description: "Cấu trúc xoắn kép, gen", position: 1 },
                { title: "Sao chép ADN", description: "Quá trình nhân đôi ADN", position: 2 },
                { title: "Phiên mã và dịch mã", description: "Từ ADN đến protein", position: 3 },
                { title: "Đột biến gen", description: "Các loại đột biến", position: 4 }
              ]
            },
            {
              title: "Tiến hóa và sinh thái - Lớp 12",
              description: "Sự tiến hóa và hệ sinh thái",
              position: 3,
              lessons: [
                { title: "Thuyết tiến hóa", description: "Darwin, chọn lọc tự nhiên", position: 1 },
                { title: "Hệ sinh thái", description: "Quần thể, quần xã, hệ sinh thái", position: 2 },
                { title: "Chu trình sinh địa hóa", description: "Chu trình carbon, nitrogen", position: 3 },
                { title: "Bảo tồn đa dạng sinh học", description: "Bảo vệ môi trường", position: 4 }
              ]
            }
          ]
        }

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

          for (const lessonData of lessons) {
            await prisma.chapter.create({
              data: {
                title: lessonData.title,
                description: lessonData.description,
                position: lessonData.position,
                isPublished: true,
                courseId: course.id
              }
            })
          }
        }

        console.log(`✅ Completed ${course.title} with ${chaptersData.length} chapters`)
      }
    }

    console.log('🎉 All STEM courses completed successfully!')

  } catch (error) {
    console.error('❌ Error completing STEM courses:', error)
  } finally {
    await prisma.$disconnect()
  }
}

completeSTEMCourses()

