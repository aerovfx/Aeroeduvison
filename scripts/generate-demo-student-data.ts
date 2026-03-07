import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Generate demo data for imported students
 * This script adds demo metrics (scores, XP, attendance, etc.) to real students
 */
async function generateDemoStudentData() {
  console.log('🚀 Bắt đầu tạo dữ liệu demo cho học sinh...')
  
  try {
    // Get all students
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    console.log(`📊 Tìm thấy ${students.length} học sinh`)

    if (students.length === 0) {
      console.log('⚠️  Chưa có học sinh nào. Vui lòng chạy: npm run db:import-students')
      return
    }

    // Generate demo data for each student
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < students.length; i++) {
      const student = students[i]
      
      try {
        // Generate varied demo data based on index to create realistic distribution
        const index = i % 45 // Cycle through patterns
        
        // Score distribution: Some high, some medium, some low
        const scorePatterns = [
          { averageScore: 95, improvement: 12, xp: 1200, attendance: 95, exams: 8, passed: 8 },
          { averageScore: 92, improvement: 8, xp: 1100, attendance: 92, exams: 7, passed: 7 },
          { averageScore: 89, improvement: 15, xp: 1000, attendance: 88, exams: 6, passed: 6 },
          { averageScore: 85, improvement: 5, xp: 950, attendance: 85, exams: 6, passed: 5 },
          { averageScore: 82, improvement: 3, xp: 900, attendance: 82, exams: 5, passed: 5 },
          { averageScore: 78, improvement: 2, xp: 850, attendance: 78, exams: 5, passed: 4 },
          { averageScore: 75, improvement: 1, xp: 800, attendance: 75, exams: 4, passed: 4 },
          { averageScore: 72, improvement: 0, xp: 750, attendance: 72, exams: 4, passed: 3 },
          { averageScore: 68, improvement: -2, xp: 700, attendance: 68, exams: 3, passed: 2 },
          { averageScore: 65, improvement: -3, xp: 650, attendance: 65, exams: 3, passed: 2 },
        ]
        
        const pattern = scorePatterns[index % scorePatterns.length]
        
        // Add some randomness
        const randomVariation = Math.random() * 10 - 5 // -5 to +5
        const averageScore = Math.max(0, Math.min(100, pattern.averageScore + randomVariation))
        const attendanceRate = Math.max(0, Math.min(100, pattern.attendance + randomVariation))
        const totalXP = pattern.xp + Math.floor(Math.random() * 200)
        
        // Update User XP regardless
        await prisma.user.update({
          where: { id: student.id },
          data: {
            xp: totalXP,
          },
        })

        // Check if student is in any class
        const classStudents = await prisma.classStudent.findMany({
          where: {
            studentId: student.id,
          },
        })

        // Update ClassStudent records with demo data if they exist
        for (const classStudent of classStudents) {
          await prisma.classStudent.update({
            where: { id: classStudent.id },
            data: {
              averageScore: Math.round(averageScore * 10) / 10,
              attendanceRate: Math.round(attendanceRate * 10) / 10,
              totalXP: totalXP,
              completedExams: pattern.exams,
              passedExams: pattern.passed,
              status: 'active',
            },
          })
        }

        // Note: If student is not in any class, they will still have XP in User
        // When they are added to a class, ClassStudent will be created with default values
        // Teacher can then update the metrics through the UI

        successCount++
        
        if ((i + 1) % 10 === 0) {
          console.log(`✅ Đã xử lý ${i + 1}/${students.length} học sinh...`)
        }
      } catch (error: any) {
        console.error(`❌ Lỗi khi xử lý học sinh ${student.name}:`, error.message)
        errorCount++
      }
    }

    console.log('\n📈 Tóm tắt:')
    console.log(`✅ Đã tạo dữ liệu demo cho: ${successCount} học sinh`)
    console.log(`❌ Lỗi: ${errorCount} học sinh`)
    console.log(`📊 Tổng số đã xử lý: ${students.length} học sinh`)
    
    console.log('\n💡 Lưu ý:')
    console.log('- Dữ liệu demo đã được tạo với phân bố điểm số đa dạng')
    console.log('- Học sinh trong lớp sẽ có dữ liệu trong ClassStudent')
    console.log('- Học sinh chưa trong lớp sẽ có XP trong User')
    console.log('- Bạn có thể sửa dữ liệu sau trong database hoặc qua UI')
    
  } catch (error: any) {
    console.error('❌ Lỗi khi tạo dữ liệu demo:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
generateDemoStudentData()
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  })
