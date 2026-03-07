import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

async function createFreshStudent() {
  try {
    console.log('🆕 Creating fresh student account...')
    
    // Check if fresh student already exists
    const existingStudent = await prisma.user.findUnique({
      where: { email: 'freshstudent@example.com' }
    })
    
    if (existingStudent) {
      console.log('🗑️ Removing existing fresh student...')
      // Delete all related data
      await prisma.userProgress.deleteMany({
        where: { userId: existingStudent.id }
      })
      await prisma.purchase.deleteMany({
        where: { userId: existingStudent.id }
      })
      await prisma.session.deleteMany({
        where: { userId: existingStudent.id }
      })
      await prisma.account.deleteMany({
        where: { userId: existingStudent.id }
      })
      await prisma.user.delete({
        where: { id: existingStudent.id }
      })
      console.log('✅ Removed existing fresh student')
    }
    
    // Create new fresh student
    const hashedPassword = await bcryptjs.hash('fresh123', 12)
    const freshStudent = await prisma.user.create({
      data: {
        name: 'Fresh Student',
        email: 'freshstudent@example.com',
        password: hashedPassword,
        role: 'STUDENT',
      },
    })
    
    console.log('✅ Fresh student account created successfully!')
    console.log('📋 Fresh Student Login Credentials:')
    console.log('   Email: freshstudent@example.com')
    console.log('   Password: fresh123')
    console.log('   Name: Fresh Student')
    console.log('   Role: STUDENT')
    console.log('\n🎯 This account has NO completed lessons and can be used for testing!')
    
  } catch (error) {
    console.error('❌ Error creating fresh student:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createFreshStudent()
