/**
 * Import học sinh 2 lớp: 10A6 (44 HS) và 11A2 (47 HS)
 * Dữ liệu từ file: filemau_xuat_diem_c23_tt58_sua_doi.xlsx
 *
 * Chạy: npx tsx scripts/import-students-10a6-11a2.ts
 *
 * Script sẽ:
 *   1. Tìm/tạo lớp 10A6 và 11A2
 *   2. Tạo tài khoản học sinh (nếu chưa tồn tại)
 *   3. Enroll học sinh vào lớp tương ứng
 *   (idempotent — chạy lại không bị trùng)
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

interface StudentData {
  idNumber:    string  // Mã định danh Bộ GD&ĐT
  fullName:    string  // Họ và tên
  dateOfBirth: string  // DD/MM/YYYY
  gender:      string  // Nam | Nữ
}

// ── Lớp 10A6 — 44 học sinh ────────────────────────────────────
const students10A6: StudentData[] = [
  { idNumber: "7727940812", fullName: "Nguyễn Quốc Anh",               dateOfBirth: "30/07/2010", gender: "Nam" },
  { idNumber: "7727956406", fullName: "Phạm Thị Hoàng Anh",            dateOfBirth: "26/02/2010", gender: "Nữ"  },
  { idNumber: "7762553931", fullName: "Dương Gia Bảo",                 dateOfBirth: "19/07/2010", gender: "Nam" },
  { idNumber: "7728007133", fullName: "Mai Thanh Bình",                dateOfBirth: "24/11/2010", gender: "Nam" },
  { idNumber: "7762553946", fullName: "Huỳnh Kim Ngọc Châu",           dateOfBirth: "28/06/2010", gender: "Nữ"  },
  { idNumber: "7708471970", fullName: "Nguyễn Long Dũ",               dateOfBirth: "01/11/2010", gender: "Nam" },
  { idNumber: "7708513260", fullName: "Trần Minh Đạt",                dateOfBirth: "29/01/2010", gender: "Nam" },
  { idNumber: "7988683715", fullName: "Ngô Văn Đức",                  dateOfBirth: "13/07/2010", gender: "Nam" },
  { idNumber: "9369816550", fullName: "Thái Gia Hân",                 dateOfBirth: "07/10/2010", gender: "Nữ"  },
  { idNumber: "7708465157", fullName: "Hoàng Thị Bích Hậu",           dateOfBirth: "10/02/2010", gender: "Nữ"  },
  { idNumber: "7708471362", fullName: "Lê Diệu Hiền",                 dateOfBirth: "05/07/2010", gender: "Nữ"  },
  { idNumber: "7709475328", fullName: "Nguyễn Trung Hiếu",            dateOfBirth: "18/10/2010", gender: "Nam" },
  { idNumber: "7714441459", fullName: "Nguyễn Đức Hoàng",             dateOfBirth: "07/03/2010", gender: "Nam" },
  { idNumber: "7708502293", fullName: "Phan Ngô Quốc Khánh",          dateOfBirth: "29/09/2010", gender: "Nam" },
  { idNumber: "7709475290", fullName: "Phan Thanh Lam",               dateOfBirth: "01/11/2010", gender: "Nữ"  },
  { idNumber: "7762422735", fullName: "Dương Nguyễn Hoàng Long",      dateOfBirth: "21/01/2010", gender: "Nam" },
  { idNumber: "7708837905", fullName: "Lê Thị Trà My",               dateOfBirth: "10/08/2010", gender: "Nữ"  },
  { idNumber: "7709475312", fullName: "Trần Hạo Nam",                 dateOfBirth: "02/03/2010", gender: "Nam" },
  { idNumber: "7708837852", fullName: "Trần Thị Bảo Ngọc",           dateOfBirth: "01/08/2010", gender: "Nữ"  },
  { idNumber: "7709475369", fullName: "Nguyễn Thị Nguyên",            dateOfBirth: "24/11/2010", gender: "Nữ"  },
  { idNumber: "7762423566", fullName: "Dương Ái Nhi",                 dateOfBirth: "01/09/2010", gender: "Nữ"  },
  { idNumber: "7710538762", fullName: "Nguyễn Thị Ái Nhung",          dateOfBirth: "27/09/2010", gender: "Nữ"  },
  { idNumber: "7766150995", fullName: "Huỳnh Như",                    dateOfBirth: "25/07/2010", gender: "Nữ"  },
  { idNumber: "6628823314", fullName: "Nguyễn Lê Gia Như",            dateOfBirth: "24/04/2010", gender: "Nữ"  },
  { idNumber: "7762553916", fullName: "Trương Thị Huỳnh Như",         dateOfBirth: "09/04/2010", gender: "Nữ"  },
  { idNumber: "7762553922", fullName: "Trần Huỳnh Gia Phúc",          dateOfBirth: "18/01/2010", gender: "Nam" },
  { idNumber: "7727956428", fullName: "Hoàng Thị Trúc Phương",        dateOfBirth: "23/09/2010", gender: "Nữ"  },
  { idNumber: "7708502404", fullName: "Ngô Ngọc Quang",               dateOfBirth: "25/05/2010", gender: "Nam" },
  { idNumber: "7708837857", fullName: "Nguyễn Minh Quân",             dateOfBirth: "09/02/2010", gender: "Nam" },
  { idNumber: "7709475373", fullName: "Nguyễn Trọng Quân",            dateOfBirth: "22/10/2010", gender: "Nam" },
  { idNumber: "7762422714", fullName: "Tạ Thị Tú Quỳnh",              dateOfBirth: "23/09/2010", gender: "Nữ"  },
  { idNumber: "7762553924", fullName: "Nguyễn Minh Tài",              dateOfBirth: "10/02/2010", gender: "Nam" },
  { idNumber: "7727956432", fullName: "Võ Văn Thành",                 dateOfBirth: "27/01/2010", gender: "Nam" },
  { idNumber: "7588683717", fullName: "Nguyễn Cao Kim Thùy",          dateOfBirth: "26/08/2010", gender: "Nữ"  },
  { idNumber: "7709475341", fullName: "Lê Huỳnh Anh Thư",            dateOfBirth: "08/11/2010", gender: "Nữ"  },
  { idNumber: "7709475342", fullName: "Lê Thị Anh Thư",              dateOfBirth: "29/08/2010", gender: "Nữ"  },
  { idNumber: "7710538765", fullName: "Nguyễn Phạm Anh Thư",         dateOfBirth: "15/08/2010", gender: "Nữ"  },
  { idNumber: "7728007144", fullName: "Nguyễn Thị Cẩm Tiên",         dateOfBirth: "30/04/2010", gender: "Nữ"  },
  { idNumber: "7728007145", fullName: "Phạm Ngọc Bảo Trâm",          dateOfBirth: "08/06/2010", gender: "Nữ"  },
  { idNumber: "7708837894", fullName: "Từ Diệu Trâm",                dateOfBirth: "26/07/2010", gender: "Nữ"  },
  { idNumber: "7762422640", fullName: "Nguyễn Ngọc Bảo Trân",        dateOfBirth: "12/04/2010", gender: "Nữ"  },
  { idNumber: "7762553928", fullName: "Hoàng Thụy Thanh Trúc",        dateOfBirth: "04/09/2010", gender: "Nữ"  },
  { idNumber: "7762553942", fullName: "Đinh Lê Nguyễn Vũ Quốc Vương",dateOfBirth: "16/03/2010", gender: "Nam" },
  { idNumber: "3891762693", fullName: "Mai Trần Xuân Toàn",           dateOfBirth: "15/11/2010", gender: "Nam" },
]

// ── Lớp 11A2 — 47 học sinh ────────────────────────────────────
const students11A2: StudentData[] = [
  { idNumber: "7759155949", fullName: "Hồ Khả Ái",                   dateOfBirth: "13/07/2009", gender: "Nữ"  },
  { idNumber: "7908514637", fullName: "Nguyễn Anh",                  dateOfBirth: "04/08/2009", gender: "Nam" },
  { idNumber: "3639247971", fullName: "Vũ Hoàng Anh",                dateOfBirth: "16/09/2009", gender: "Nam" },
  { idNumber: "7760885466", fullName: "Võ Ngọc Trân Châu",           dateOfBirth: "04/09/2009", gender: "Nữ"  },
  { idNumber: "7714441598", fullName: "Phan Tấn Dũng",               dateOfBirth: "13/10/2009", gender: "Nam" },
  { idNumber: "6863051465", fullName: "Ngô Trọng Giáp",              dateOfBirth: "02/10/2009", gender: "Nam" },
  { idNumber: "7709475386", fullName: "Nguyễn Sư Hải",              dateOfBirth: "23/04/2009", gender: "Nam" },
  { idNumber: "7732071990", fullName: "Huỳnh Văn Hiếu",              dateOfBirth: "19/08/2009", gender: "Nam" },
  { idNumber: "7759156068", fullName: "Lê Võ Khánh Hòa",            dateOfBirth: "18/01/2009", gender: "Nam" },
  { idNumber: "7748721284", fullName: "Trần Chánh Hùng",             dateOfBirth: "09/06/2009", gender: "Nam" },
  { idNumber: "7708474753", fullName: "Lê Đức Ngọc Huy",            dateOfBirth: "10/08/2008", gender: "Nam" },
  { idNumber: "7513743135", fullName: "Lê Văn Gia Huy",             dateOfBirth: "10/03/2009", gender: "Nam" },
  { idNumber: "7708472429", fullName: "Phạm Nguyễn Quốc Khải",      dateOfBirth: "24/01/2009", gender: "Nam" },
  { idNumber: "7759294999", fullName: "Huỳnh Tấn Kiệt",             dateOfBirth: "14/11/2009", gender: "Nam" },
  { idNumber: "7786982961", fullName: "Hồ Thị Mỹ Linh",            dateOfBirth: "17/02/2009", gender: "Nữ"  },
  { idNumber: "7708472439", fullName: "Phạm Gia Linh",               dateOfBirth: "20/02/2009", gender: "Nữ"  },
  { idNumber: "7727941157", fullName: "Nguyễn Hữu Luân",             dateOfBirth: "08/01/2009", gender: "Nam" },
  { idNumber: "7727941249", fullName: "Nguyễn Công Tuấn Minh",       dateOfBirth: "02/07/2009", gender: "Nam" },
  { idNumber: "7759294952", fullName: "Phan Nguyễn Bảo Ngân",        dateOfBirth: "28/07/2009", gender: "Nữ"  },
  { idNumber: "7774606868", fullName: "Nguyễn Hữu Nghĩa",            dateOfBirth: "25/06/2009", gender: "Nam" },
  { idNumber: "7708472832", fullName: "Đào Như Ngọc",                dateOfBirth: "06/11/2009", gender: "Nữ"  },
  { idNumber: "7760885467", fullName: "Phạm Khánh Ngọc",             dateOfBirth: "02/08/2009", gender: "Nữ"  },
  { idNumber: "7511066554", fullName: "Đỗ Bùi Thảo Nguyên",         dateOfBirth: "01/07/2009", gender: "Nữ"  },
  { idNumber: "7708472181", fullName: "Nguyễn Trần Ngọc Nhi",        dateOfBirth: "26/09/2009", gender: "Nữ"  },
  { idNumber: "7759295004", fullName: "Nguyễn Thị Kiều Oanh",        dateOfBirth: "08/04/2009", gender: "Nữ"  },
  { idNumber: "7727941279", fullName: "Tô Hồng Phúc",               dateOfBirth: "23/09/2009", gender: "Nam" },
  { idNumber: "7738226160", fullName: "Chu Thị Minh Phương",         dateOfBirth: "10/08/2008", gender: "Nữ"  },
  { idNumber: "7759156123", fullName: "Trần Ngọc Đan Phương",        dateOfBirth: "24/03/2009", gender: "Nữ"  },
  { idNumber: "7765396731", fullName: "Vi Quang Phương",              dateOfBirth: "07/10/2009", gender: "Nam" },
  { idNumber: "7748721302", fullName: "Phạm Minh Quân",              dateOfBirth: "17/01/2009", gender: "Nam" },
  { idNumber: "7710552063", fullName: "Nguyễn Trọng Tài",            dateOfBirth: "23/09/2009", gender: "Nam" },
  { idNumber: "7708472479", fullName: "Lý Nhật Tân",                dateOfBirth: "28/08/2009", gender: "Nam" },
  { idNumber: "7709535685", fullName: "Dương Thị Kim Thanh",         dateOfBirth: "15/04/2009", gender: "Nữ"  },
  { idNumber: "7756914812", fullName: "Nguyễn Phương Thanh",         dateOfBirth: "23/08/2009", gender: "Nữ"  },
  { idNumber: "7727941190", fullName: "Nguyễn Đình Thiện",           dateOfBirth: "22/02/2009", gender: "Nam" },
  { idNumber: "7708472212", fullName: "Nguyễn Khang Thịnh",          dateOfBirth: "24/10/2009", gender: "Nam" },
  { idNumber: "7748721572", fullName: "Trần Minh Thông",             dateOfBirth: "09/05/2009", gender: "Nam" },
  { idNumber: "7708472217", fullName: "Giêng Văn Thuận",             dateOfBirth: "05/11/2009", gender: "Nam" },
  { idNumber: "7710233889", fullName: "Nguyễn Thị Thanh Thuý",       dateOfBirth: "25/11/2009", gender: "Nữ"  },
  { idNumber: "7756914729", fullName: "Phạm Thị Thanh Thúy",         dateOfBirth: "31/07/2009", gender: "Nữ"  },
  { idNumber: "7728007181", fullName: "Phan Ngọc Ngân Thư",          dateOfBirth: "10/08/2009", gender: "Nữ"  },
  { idNumber: "7759656461", fullName: "Phan Mai Cẩm Thy",            dateOfBirth: "19/02/2009", gender: "Nữ"  },
  { idNumber: "7776602106", fullName: "Trần Viết Minh Toàn",         dateOfBirth: "25/11/2009", gender: "Nam" },
  { idNumber: "7759156055", fullName: "Trần Bảo Trân",               dateOfBirth: "28/04/2009", gender: "Nữ"  },
  { idNumber: "7708465172", fullName: "Nguyễn Đức Tùng",             dateOfBirth: "12/01/2009", gender: "Nam" },
  { idNumber: "7759155974", fullName: "Đoàn Tú Uyên",               dateOfBirth: "16/10/2009", gender: "Nữ"  },
  { idNumber: "7748721602", fullName: "Phạm Trường Vũ",              dateOfBirth: "16/08/2009", gender: "Nam" },
]

// ── Helpers ────────────────────────────────────────────────────
function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number)
  return new Date(year, month - 1, day)
}

function generateEmail(fullName: string, idNumber: string): string {
  const normalized = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/gi, (c) => (c === 'đ' ? 'd' : 'D'))
    .toLowerCase()
  const parts = normalized.split(' ').filter(Boolean)
  const first = parts[0] || 'hs'
  const last  = parts[parts.length - 1] || 'hs'
  return `${first}.${last}.${idNumber.slice(-4)}@student.aeroedu.local`
}

function generatePassword(idNumber: string, dateOfBirth: string): string {
  const year = dateOfBirth.split('/')[2]
  return `${idNumber.slice(-6)}${year.slice(-2)}`
}

// ── Import một lớp ──────────────────────────────────────────────
async function importClass(
  className: string,
  grade: string,
  schoolYear: string,
  students: StudentData[],
  teacher: { id: string; name: string },
) {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  📚 LỚP ${className} — ${students.length} học sinh`)
  console.log(`${'═'.repeat(60)}`)

  // ── Bước 1: Tìm hoặc tạo lớp ────────────────────────────────
  let cls = await prisma.class.findFirst({
    where: {
      name:       { contains: className, mode: 'insensitive' },
      schoolYear: schoolYear,
    },
  })

  if (!cls) {
    cls = await prisma.class.create({
      data: {
        name:        `Lớp ${className}`,
        grade:       `Khối ${grade}`,
        schoolYear:  schoolYear,
        description: `Lớp ${className} - Năm học ${schoolYear}`,
        teacherId:   teacher.id,
      },
    })
    console.log(`✅ Đã tạo lớp: ${cls.name} (ID: ${cls.id})`)
  } else {
    console.log(`✓  Lớp đã tồn tại: ${cls.name} (ID: ${cls.id})`)
  }

  // ── Bước 2: Tạo/tìm tài khoản học sinh ──────────────────────
  console.log(`\n👥 Import tài khoản học sinh...`)
  const studentIds: string[] = []
  let created = 0, found = 0, errors = 0

  for (const s of students) {
    try {
      // Tìm theo mã định danh trước
      let user = await prisma.user.findFirst({
        where: { role: 'STUDENT', idNumber: s.idNumber },
      })

      if (!user) {
        // Fallback: tìm theo email
        const email = generateEmail(s.fullName, s.idNumber)
        user = await prisma.user.findUnique({ where: { email } }) as typeof user
      }

      if (user) {
        process.stdout.write(`  ✓ ${s.fullName}\n`)
        studentIds.push(user.id)
        found++
      } else {
        // Tạo mới
        const email    = generateEmail(s.fullName, s.idNumber)
        const password = generatePassword(s.idNumber, s.dateOfBirth)
        const hashed   = await hash(password, 12)

        const newUser = await prisma.user.create({
          data: {
            id:            crypto.randomUUID(),
            name:          s.fullName,
            email,
            password:      hashed,
            role:          'STUDENT',
            schoolId:      'default-school',
            xp:            0,
            idNumber:      s.idNumber,
            dateOfBirth:   parseDate(s.dateOfBirth),
            gender:        s.gender,
            emailVerified: new Date(),
            createdAt:     new Date(),
            updatedAt:     new Date(),
          },
        })
        process.stdout.write(`  ✅ ${s.fullName} — ${email} / pw: ${password}\n`)
        studentIds.push(newUser.id)
        created++
      }
    } catch (err: any) {
      console.error(`  ❌ ${s.fullName}: ${err.message}`)
      errors++
    }
  }

  // ── Bước 3: Enroll vào lớp ──────────────────────────────────
  const existing = await prisma.classStudent.findMany({
    where:  { classId: cls.id },
    select: { studentId: true },
  })
  const existingSet  = new Set(existing.map(e => e.studentId))
  const newStudents  = studentIds.filter(id => !existingSet.has(id))
  const baseNumber   = existing.length

  if (newStudents.length > 0) {
    const result = await prisma.classStudent.createMany({
      data: newStudents.map((studentId, idx) => ({
        classId:       cls!.id,
        studentId,
        studentNumber: baseNumber + idx + 1,
        status:        'active',
      })),
      skipDuplicates: true,
    })
    console.log(`\n✅ Đã enroll ${result.count} học sinh mới vào lớp ${className}`)
  } else {
    console.log(`\n⚠️  Tất cả học sinh đã có trong lớp ${className}`)
  }

  const total = await prisma.classStudent.count({ where: { classId: cls.id } })

  console.log(`\n📈 Kết quả lớp ${className}:`)
  console.log(`   Tạo mới  : ${created} học sinh`)
  console.log(`   Đã tồn tại: ${found} học sinh`)
  console.log(`   Lỗi      : ${errors} học sinh`)
  console.log(`   Tổng trong lớp: ${total} học sinh`)

  return { className, classId: cls.id, created, found, errors, total }
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Import học sinh 10A6 + 11A2')
  console.log(`   Năm học: 2025-2026`)
  console.log(`   Thời gian: ${new Date().toLocaleString('vi-VN')}`)

  // Tìm/tạo giáo viên mặc định
  let teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } })
  if (!teacher) {
    console.log('\n⚠️  Chưa có giáo viên. Tạo giáo viên mặc định...')
    teacher = await prisma.user.create({
      data: {
        name:          'Giáo viên Mặc định',
        email:         'teacher@aeroedu.local',
        password:      await hash('teacher123', 12),
        role:          'TEACHER',
        schoolId:      'default-school',
        emailVerified: new Date(),
      },
    })
    console.log(`✅ Đã tạo giáo viên: ${teacher.name}`)
  } else {
    console.log(`✓ Giáo viên: ${teacher.name} (${teacher.email})`)
  }

  const SCHOOL_YEAR = '2025-2026'

  const r10A6 = await importClass('10A6', '10', SCHOOL_YEAR, students10A6, teacher)
  const r11A2 = await importClass('11A2', '11', SCHOOL_YEAR, students11A2, teacher)

  // ── Tóm tắt tổng ──────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  ✅ HOÀN THÀNH`)
  console.log(`${'═'.repeat(60)}`)
  console.log(`  Lớp 10A6 (ID: ${r10A6.classId}): ${r10A6.total} HS`)
  console.log(`  Lớp 11A2 (ID: ${r11A2.classId}): ${r11A2.total} HS`)
  console.log(`  Tổng tạo mới: ${r10A6.created + r11A2.created} tài khoản`)
  console.log(`  Tổng skip   : ${r10A6.found   + r11A2.found}   tài khoản`)
  console.log(`  Tổng lỗi    : ${r10A6.errors  + r11A2.errors}  tài khoản`)
  console.log(``)
  console.log(`  📝 Password mặc định: 6 số cuối mã định danh + 2 số cuối năm sinh`)
  console.log(`     VD: idNumber=7727940812, sinh 30/07/2010 → pw: 94081210`)
  console.log(`${'═'.repeat(60)}`)
}

main()
  .catch((err) => {
    console.error('💥 Script lỗi:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
