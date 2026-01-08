import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Danh sách học sinh từ bảng
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
  // Remove Vietnamese diacritics and convert to lowercase
  const nameWithoutDiacritics = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
  
  // Split name into parts
  const nameParts = nameWithoutDiacritics.split(' ').filter(part => part.length > 0)
  
  // Get last name and first name
  const lastName = nameParts[nameParts.length - 1] || 'student'
  const firstName = nameParts[0] || 'student'
  
  // Create email: firstname.lastname.idnumber@student.aeroedu.local
  const email = `${firstName}.${lastName}.${idNumber.slice(-4)}@student.aeroedu.local`
  
  return email
}

// Generate default password (can be changed later)
function generatePassword(idNumber: string, dateOfBirth: string): string {
  // Use last 6 digits of ID + last 2 digits of year
  const year = dateOfBirth.split('/')[2]
  return `${idNumber.slice(-6)}${year.slice(-2)}`
}

async function importStudents() {
  console.log('🚀 Bắt đầu import danh sách học sinh...')
  console.log(`📊 Tổng số học sinh: ${students.length}`)
  
  let successCount = 0
  let errorCount = 0
  let skippedCount = 0
  
  for (const student of students) {
    try {
      // Generate email
      const email = generateEmail(student.fullName, student.idNumber)
      
      // Check if user already exists by email or by checking metadata
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })
      
      if (existingUser) {
        console.log(`⚠️  Học sinh đã tồn tại: ${student.fullName} (${email})`)
        skippedCount++
        continue
      }
      
      // Check if ID number already exists
      const existingUserById = await prisma.user.findFirst({
        where: {
          role: 'STUDENT',
          idNumber: student.idNumber,
        }
      })
      
      if (existingUserById) {
        console.log(`⚠️  Mã định danh đã tồn tại: ${student.idNumber} (${student.fullName})`)
        skippedCount++
        continue
      }
      
      // Hash password
      const defaultPassword = generatePassword(student.idNumber, student.dateOfBirth)
      const hashedPassword = await hash(defaultPassword, 12)
      
      // Parse date of birth
      const dateOfBirth = parseDate(student.dateOfBirth)
      
      // Generate unique ID
      const userId = crypto.randomUUID()
      
      // Create user with student information
      const newUser = await prisma.user.create({
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
      
      console.log(`✅ Đã tạo học sinh: ${student.fullName}`)
      console.log(`   - Email: ${email}`)
      console.log(`   - Mã định danh: ${student.idNumber}`)
      console.log(`   - Ngày sinh: ${student.dateOfBirth}`)
      console.log(`   - Giới tính: ${student.gender}`)
      console.log(`   - Password mặc định: ${defaultPassword}`)
      console.log(`   - ID: ${newUser.id}`)
      console.log('')
      
      successCount++
      
    } catch (error: any) {
      console.error(`❌ Lỗi khi tạo học sinh ${student.fullName}:`, error.message)
      errorCount++
    }
  }
  
  console.log('\n📈 Tóm tắt:')
  console.log(`✅ Đã tạo thành công: ${successCount} học sinh`)
  console.log(`⚠️  Đã bỏ qua (đã tồn tại): ${skippedCount} học sinh`)
  console.log(`❌ Lỗi: ${errorCount} học sinh`)
  console.log(`📊 Tổng số đã xử lý: ${students.length} học sinh`)
  
  if (successCount > 0) {
    console.log('\n🎉 Import học sinh thành công!')
    console.log('\n📝 Lưu ý:')
    console.log('- Email được tạo tự động từ tên và mã định danh')
    console.log('- Password mặc định: 6 số cuối mã định danh + 2 số cuối năm sinh')
    console.log('- Học sinh nên đổi password khi đăng nhập lần đầu')
    console.log('- Thông tin bổ sung (Mã định danh, Ngày sinh, Giới tính) đã được lưu vào database')
  }
  
  await prisma.$disconnect()
}

// Run the import
importStudents()
  .catch((error) => {
    console.error('❌ Lỗi khi import:', error)
    process.exit(1)
  })
