import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetStudentAccount() {
  try {
    console.log('🔄 Resetting student account...')
    
    // Find the student user
    const student = await prisma.user.findUnique({
      where: { email: 'student@example.com' }
    })
    
    if (!student) {
      console.log('❌ Student account not found!')
      return
    }
    
    console.log(`📧 Found student: ${student.name} (${student.email})`)
    
    // Delete user progress
    const deletedProgress = await prisma.userProgress.deleteMany({
      where: { userId: student.id }
    })
    console.log(`🗑️ Deleted ${deletedProgress.count} user progress records`)
    
    // Delete purchases
    const deletedPurchases = await prisma.purchase.deleteMany({
      where: { userId: student.id }
    })
    console.log(`🗑️ Deleted ${deletedPurchases.count} purchase records`)
    
    // Delete sessions
    const deletedSessions = await prisma.session.deleteMany({
      where: { userId: student.id }
    })
    console.log(`🗑️ Deleted ${deletedSessions.count} session records`)
    
    // Delete accounts
    const deletedAccounts = await prisma.account.deleteMany({
      where: { userId: student.id }
    })
    console.log(`🗑️ Deleted ${deletedAccounts.count} account records`)
    
    // Reset user data (keep the user but reset timestamps)
    await prisma.user.update({
      where: { id: student.id },
      data: {
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log('✅ Student account reset successfully!')
    console.log('📋 Login credentials:')
    console.log('   Email: student@example.com')
    console.log('   Password: student123')
    
  } catch (error) {
    console.error('❌ Error resetting student account:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetStudentAccount()















