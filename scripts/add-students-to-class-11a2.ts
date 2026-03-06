import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Danh sách học sinh từ hình ảnh (47 học sinh)
interface StudentData {
  idNumber: string // Mã định danh Bộ
  fullName: string // Họ và tên
  dateOfBirth: string // Ngày sinh (DD/MM/YYYY)
  gender: string // Giới tính (Nam/Nữ)
}

const students: StudentData[] = [
  { idNumber: "7759155949", fullName: "Hồ Khả Ái", dateOfBirth: "13/07/2009", gender: "Nữ" },
  { idNumber: "7908514637", fullName: "Nguyễn Anh", dateOfBirth: "04/08/2009", gender: "Nam" },
  { idNumber: "3639247971", fullName: "Vũ Hoàng Anh", dateOfBirth: "16/09/2009", gender: "Nam" },
  { idNumber: "7760885466", fullName: "Võ Ngọc Trân Châu", dateOfBirth: "04/09/2009", gender: "Nữ" },
  { idNumber: "7714441598", fullName: "Phan Tấn Dũng", dateOfBirth: "13/10/2009", gender: "Nam" },
  { idNumber: "6863051465", fullName: "Ngô Trọng Giáp", dateOfBirth: "02/10/2009", gender: "Nam" },
  { idNumber: "7709475386", fullName: "Nguyễn Sư Hải", dateOfBirth: "23/04/2009", gender: "Nam" },
  { idNumber: "7732071990", fullName: "Huỳnh Văn Hiếu", dateOfBirth: "19/08/2009", gender: "Nam" },
  { idNumber: "7759156068", fullName: "Lê Võ Khánh Hòa", dateOfBirth: "18/01/2009", gender: "Nam" },
  { idNumber: "7748721284", fullName: "Trần Chánh Hùng", dateOfBirth: "09/06/2009", gender: "Nam" },
  { idNumber: "7708474753", fullName: "Lê Đức Ngọc Huy", dateOfBirth: "10/08/2008", gender: "Nam" },
  { idNumber: "7513743135", fullName: "Lê Văn Gia Huy", dateOfBirth: "10/03/2009", gender: "Nam" },
  { idNumber: "7708472429", fullName: "Phạm Nguyễn Quốc Khải", dateOfBirth: "24/01/2009", gender: "Nam" },
  { idNumber: "7759294999", fullName: "Huỳnh Tấn Kiệt", dateOfBirth: "14/11/2009", gender: "Nam" },
  { idNumber: "7786982961", fullName: "Hồ Thị Mỹ Linh", dateOfBirth: "17/02/2009", gender: "Nữ" },
  { idNumber: "7708472439", fullName: "Phạm Gia Linh", dateOfBirth: "20/02/2009", gender: "Nữ" },
  { idNumber: "7727941157", fullName: "Nguyễn Hữu Luân", dateOfBirth: "08/01/2009", gender: "Nam" },
  { idNumber: "7727941249", fullName: "Nguyễn Công Tuấn Minh", dateOfBirth: "02/07/2009", gender: "Nam" },
  { idNumber: "7759294952", fullName: "Phan Nguyễn Bảo Ngân", dateOfBirth: "28/07/2009", gender: "Nữ" },
  { idNumber: "7774606868", fullName: "Nguyễn Hữu Nghĩa", dateOfBirth: "25/06/2009", gender: "Nam" },
  { idNumber: "7708472832", fullName: "Đào Như Ngọc", dateOfBirth: "06/11/2009", gender: "Nữ" },
  { idNumber: "7760885467", fullName: "Phạm Khánh Ngọc", dateOfBirth: "02/08/2009", gender: "Nữ" },
  { idNumber: "7511066554", fullName: "Đỗ Bùi Thảo Nguyên", dateOfBirth: "01/07/2009", gender: "Nữ" },
  { idNumber: "7708472181", fullName: "Nguyễn Trần Ngọc Nhi", dateOfBirth: "26/09/2009", gender: "Nữ" },
  { idNumber: "7759295004", fullName: "Nguyễn Thị Kiều Oanh", dateOfBirth: "08/04/2009", gender: "Nữ" },
  { idNumber: "7727941279", fullName: "Tô Hồng Phúc", dateOfBirth: "23/09/2009", gender: "Nam" },
  { idNumber: "7738226160", fullName: "Chu Thị Minh Phương", dateOfBirth: "10/08/2008", gender: "Nữ" },
  { idNumber: "7759156123", fullName: "Trần Ngọc Đan Phương", dateOfBirth: "24/03/2009", gender: "Nữ" },
  { idNumber: "7765396731", fullName: "Vi Quang Phương", dateOfBirth: "07/10/2009", gender: "Nam" },
  { idNumber: "7748721302", fullName: "Phạm Minh Quân", dateOfBirth: "17/01/2009", gender: "Nam" },
  { idNumber: "7710552063", fullName: "Nguyễn Trọng Tài", dateOfBirth: "23/09/2009", gender: "Nam" },
  { idNumber: "7708472479", fullName: "Lý Nhật Tân", dateOfBirth: "28/08/2009", gender: "Nam" },
  { idNumber: "7709535685", fullName: "Dương Thị Kim Thanh", dateOfBirth: "15/04/2009", gender: "Nữ" },
  { idNumber: "7756914812", fullName: "Nguyễn Phương Thanh", dateOfBirth: "23/08/2009", gender: "Nữ" },
  { idNumber: "7727941190", fullName: "Nguyễn Đình Thiện", dateOfBirth: "22/02/2009", gender: "Nam" },
  { idNumber: "7708472212", fullName: "Nguyễn Khang Thịnh", dateOfBirth: "24/10/2009", gender: "Nam" },
  { idNumber: "7748721572", fullName: "Trần Minh Thông", dateOfBirth: "09/05/2009", gender: "Nam" },
  { idNumber: "7710233889", fullName: "Nguyễn Thị Thanh Thuý", dateOfBirth: "25/11/2009", gender: "Nữ" },
  { idNumber: "7756914729", fullName: "Phạm Thị Thanh Thúy", dateOfBirth: "31/07/2009", gender: "Nữ" },
  { idNumber: "7728007181", fullName: "Phan Ngọc Ngân Thư", dateOfBirth: "10/08/2009", gender: "Nữ" },
  { idNumber: "7759656461", fullName: "Phan Mai Cẩm Thy", dateOfBirth: "19/02/2009", gender: "Nữ" },
  { idNumber: "7776602106", fullName: "Trần Viết Minh Toàn", dateOfBirth: "25/11/2009", gender: "Nam" },
  { idNumber: "7759156055", fullName: "Trần Bảo Trân", dateOfBirth: "28/04/2009", gender: "Nữ" },
  { idNumber: "7708465172", fullName: "Nguyễn Đức Tùng", dateOfBirth: "12/01/2009", gender: "Nam" },
  { idNumber: "7759155974", fullName: "Đoàn Tú Uyên", dateOfBirth: "16/10/2009", gender: "Nữ" },
  { idNumber: "7748721602", fullName: "Phạm Trường Vũ", dateOfBirth: "16/08/2009", gender: "Nam" },
  { idNumber: "7708472217", fullName: "Giêng Văn Thuận", dateOfBirth: "05/11/2009", gender: "Nam" },
]

// Parse date from DD/MM/YYYY to Date object
function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number)
  return new Date(year, month - 1, day)
}

// Generate email from name and id number
function generateEmail(fullName: string, idNumber: string): string {
  const nameWithoutDiacritics = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
  
  const nameParts = nameWithoutDiacritics.split(' ').filter(part => part.length > 0)
  const lastName = nameParts[nameParts.length - 1] || 'student'
  const firstName = nameParts[0] || 'student'
  
  const email = `${firstName}.${lastName}.${idNumber.slice(-4)}@student.aeroedu.local`
  return email
}

// Generate default password
function generatePassword(idNumber: string, dateOfBirth: string): string {
  const year = dateOfBirth.split('/')[2]
  return `${idNumber.slice(-6)}${year.slice(-2)}`
}

async function addStudentsToClass11A2() {
  console.log('🚀 Bắt đầu thêm học sinh vào lớp 11A2...')
  console.log(`📊 Tổng số học sinh: ${students.length}`)
  
  try {
    // Bước 1: Tìm hoặc tạo lớp 11A2
    console.log('\n📚 Bước 1: Tìm hoặc tạo lớp 11A2...')
    
    // Tìm giáo viên đầu tiên (hoặc tạo một giáo viên mặc định)
    let teacher = await prisma.user.findFirst({
      where: { role: 'TEACHER' }
    })
    
    if (!teacher) {
      console.log('⚠️  Chưa có giáo viên nào. Tạo giáo viên mặc định...')
      // Tạo giáo viên mặc định
      teacher = await prisma.user.create({
        data: {
          name: 'Giáo viên Mặc định',
          email: 'teacher@aeroedu.local',
          password: await hash('teacher123', 12),
          role: 'TEACHER',
          schoolId: 'default-school',
          emailVerified: new Date(),
        }
      })
      console.log(`✅ Đã tạo giáo viên: ${teacher.name} (${teacher.email})`)
    }
    
    // Tìm hoặc tạo lớp 11A2
    let class11A2 = await prisma.class.findFirst({
      where: {
        name: { contains: '11A2', mode: 'insensitive' },
        grade: { contains: '11', mode: 'insensitive' }
      }
    })
    
    if (!class11A2) {
      console.log('📝 Tạo lớp 11A2 mới...')
      const currentYear = new Date().getFullYear()
      const schoolYear = `${currentYear}-${currentYear + 1}`
      
      class11A2 = await prisma.class.create({
        data: {
          name: 'Lớp 11A2',
          grade: 'Khối 11',
          schoolYear: schoolYear,
          description: 'Lớp 11A2 - Năm học ' + schoolYear,
          teacherId: teacher.id,
        }
      })
      console.log(`✅ Đã tạo lớp: ${class11A2.name}`)
    } else {
      console.log(`✅ Tìm thấy lớp: ${class11A2.name} (ID: ${class11A2.id})`)
    }
    
    // Bước 2: Import hoặc tìm học sinh
    console.log('\n👥 Bước 2: Import/tìm học sinh...')
    
    const studentIds: string[] = []
    let importedCount = 0
    let foundCount = 0
    
    for (const student of students) {
      try {
        // Tìm học sinh theo mã định danh
        let existingStudent = await prisma.user.findFirst({
          where: {
            role: 'STUDENT',
            idNumber: student.idNumber,
          }
        })
        
        if (!existingStudent) {
          // Tìm theo email
          const email = generateEmail(student.fullName, student.idNumber)
          existingStudent = await prisma.user.findUnique({
            where: { email }
          })
        }
        
        if (existingStudent) {
          console.log(`✓ Tìm thấy: ${student.fullName} (${existingStudent.email})`)
          studentIds.push(existingStudent.id)
          foundCount++
        } else {
          // Tạo học sinh mới
          const email = generateEmail(student.fullName, student.idNumber)
          const defaultPassword = generatePassword(student.idNumber, student.dateOfBirth)
          const hashedPassword = await hash(defaultPassword, 12)
          const dateOfBirth = parseDate(student.dateOfBirth)
          
          // Generate unique ID
          const userId = crypto.randomUUID()
          
          const newStudent = await prisma.user.create({
            data: {
              id: userId,
              name: student.fullName,
              email: email,
              password: hashedPassword,
              role: 'STUDENT',
              schoolId: 'default-school',
              xp: 0,
              idNumber: student.idNumber,
              dateOfBirth: dateOfBirth,
              gender: student.gender,
              emailVerified: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          })
          
          console.log(`✅ Đã tạo: ${student.fullName} (${email})`)
          studentIds.push(newStudent.id)
          importedCount++
        }
      } catch (error: any) {
        console.error(`❌ Lỗi khi xử lý ${student.fullName}:`, error.message)
      }
    }
    
    // Bước 3: Thêm học sinh vào lớp
    console.log(`\n📝 Bước 3: Thêm ${studentIds.length} học sinh vào lớp 11A2...`)
    
    // Lấy danh sách học sinh hiện có trong lớp
    const existingClassStudents = await prisma.classStudent.findMany({
      where: { classId: class11A2.id },
      select: { studentId: true }
    })
    
    const existingStudentIds = new Set(existingClassStudents.map(cs => cs.studentId))
    
    // Lọc ra những học sinh chưa có trong lớp
    const newStudentIds = studentIds.filter(id => !existingStudentIds.has(id))
    
    if (newStudentIds.length === 0) {
      console.log('⚠️  Tất cả học sinh đã có trong lớp rồi!')
    } else {
      // Lấy số thứ tự hiện tại
      const currentCount = existingClassStudents.length
      
      // Thêm học sinh vào lớp
      const classStudents = await prisma.classStudent.createMany({
        data: newStudentIds.map((studentId, index) => ({
          classId: class11A2.id,
          studentId: studentId,
          studentNumber: currentCount + index + 1,
          status: 'active',
        })),
        skipDuplicates: true,
      })
      
      console.log(`✅ Đã thêm ${classStudents.count} học sinh mới vào lớp`)
    }
    
    // Tóm tắt
    console.log('\n📈 Tóm tắt:')
    console.log(`✅ Đã tìm thấy: ${foundCount} học sinh`)
    console.log(`✅ Đã tạo mới: ${importedCount} học sinh`)
    console.log(`✅ Tổng số học sinh trong lớp: ${studentIds.length} học sinh`)
    console.log(`📚 Lớp: ${class11A2.name} (ID: ${class11A2.id})`)
    
    // Đếm lại số học sinh trong lớp
    const finalCount = await prisma.classStudent.count({
      where: { classId: class11A2.id }
    })
    console.log(`📊 Tổng số học sinh trong lớp sau khi thêm: ${finalCount} học sinh`)
    
  } catch (error: any) {
    console.error('❌ Lỗi:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
addStudentsToClass11A2()
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  })
