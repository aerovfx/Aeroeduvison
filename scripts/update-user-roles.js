const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateUserRoles() {
  try {
    // Kiểm tra tất cả users
    const users = await prisma.user.findMany()
    console.log('Current users:')
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}): ${user.role}`)
    })

    // Cập nhật role cho admin (nếu có email admin cụ thể)
    const adminEmail = 'admin@example.com' // Thay đổi email admin thực tế
    const teacherEmail = 'teacher@example.com' // Thay đổi email teacher thực tế
    
    // Tìm user admin
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    })
    
    if (adminUser && adminUser.role !== 'ADMIN') {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { role: 'ADMIN' }
      })
      console.log(`Updated ${adminUser.email} to ADMIN role`)
    }

    // Tìm user teacher
    const teacherUser = await prisma.user.findUnique({
      where: { email: teacherEmail }
    })
    
    if (teacherUser && teacherUser.role !== 'TEACHER') {
      await prisma.user.update({
        where: { id: teacherUser.id },
        data: { role: 'TEACHER' }
      })
      console.log(`Updated ${teacherUser.email} to TEACHER role`)
    }

    // Hiển thị kết quả sau khi cập nhật
    const updatedUsers = await prisma.user.findMany()
    console.log('\nUpdated users:')
    updatedUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}): ${user.role}`)
    })

  } catch (error) {
    console.error('Error updating user roles:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateUserRoles()

