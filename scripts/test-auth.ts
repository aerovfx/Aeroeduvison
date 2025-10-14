#!/usr/bin/env tsx

/**
 * Script để test authentication với các tài khoản có sẵn
 * Chạy: tsx scripts/test-auth.ts
 */

import { PrismaClient } from '@prisma/client'
import { compare } from 'bcryptjs'

const prisma = new PrismaClient()

async function testAuth() {
  try {
    console.log('🔐 Test Authentication với tài khoản có sẵn\n')
    
    // Lấy tất cả users từ database
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
        createdAt: true
      }
    })
    
    console.log(`📊 Tìm thấy ${users.length} users trong database:`)
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.role}`)
    })
    
    console.log('\n🔑 Test đăng nhập với tài khoản mẫu:')
    
    // Test với các tài khoản mẫu
    const testAccounts = [
      { email: 'admin@example.com', password: 'admin123' },
      { email: 'teacher@example.com', password: 'teacher123' },
      { email: 'student@example.com', password: 'student123' }
    ]
    
    for (const account of testAccounts) {
      console.log(`\n👤 Testing: ${account.email}`)
      
      const user = await prisma.user.findUnique({
        where: { email: account.email }
      })
      
      if (!user) {
        console.log(`❌ User không tồn tại: ${account.email}`)
        continue
      }
      
      if (!user.password) {
        console.log(`❌ User không có password: ${account.email}`)
        continue
      }
      
      const isPasswordValid = await compare(account.password, user.password)
      
      if (isPasswordValid) {
        console.log(`✅ Đăng nhập thành công: ${user.name} (${user.role})`)
      } else {
        console.log(`❌ Password sai: ${account.email}`)
      }
    }
    
    console.log('\n🌐 URLs để test:')
    console.log('   - Sign In: http://localhost:3000/sign-in')
    console.log('   - Sign Up: http://localhost:3000/sign-up')
    console.log('   - Test Auth: http://localhost:3000/test-auth')
    console.log('   - Dashboard: http://localhost:3000/dashboard')
    
    console.log('\n📝 Tài khoản test:')
    console.log('   - Admin: admin@example.com / admin123')
    console.log('   - Teacher: teacher@example.com / teacher123')
    console.log('   - Student: student@example.com / student123')
    
    console.log('\n⚠️ Lưu ý:')
    console.log('   - Google OAuth chưa được cấu hình (cần GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET)')
    console.log('   - Supabase chưa được cấu hình (cần SUPABASE_URL và keys)')
    console.log('   - Hiện tại chỉ có thể đăng nhập bằng email/password')
    
  } catch (error) {
    console.error('💥 Lỗi test auth:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Chạy test
testAuth()




