/**
 * Clear Test User Script
 * Xóa user test để có thể test lại sign-up
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const email = process.argv[2]

async function clearUser() {
  if (!email) {
    console.log('❌ Vui lòng cung cấp email')
    console.log('Usage: npm run clear:user <email>')
    console.log('Example: npm run clear:user huongsiri@gmail.com')
    process.exit(1)
  }

  try {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user) {
      console.log(`ℹ️  User not found: ${normalizedEmail}`)
      process.exit(0)
    }

    // Delete user
    await prisma.user.delete({
      where: { email: normalizedEmail }
    })

    console.log(`✅ Deleted user: ${normalizedEmail}`)
    console.log(`   User ID: ${user.id}`)
    console.log(`   Name: ${user.name}`)
    console.log(`   Role: ${user.role}`)
    console.log('\n✅ You can now sign up with this email again!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearUser()


