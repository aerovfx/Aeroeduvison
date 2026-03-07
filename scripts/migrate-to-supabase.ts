#!/usr/bin/env tsx

/**
 * Script để migrate users từ database local lên Supabase
 * Chạy: tsx scripts/migrate-to-supabase.ts
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

// Cấu hình Supabase - cần cập nhật với thông tin thật
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'

if (!supabaseUrl || supabaseUrl.includes('your-project')) {
  console.error('❌ Vui lòng cấu hình SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateUsers() {
  try {
    console.log('🚀 Bắt đầu migrate users lên Supabase...')
    
    // Lấy tất cả users từ database local
    const users = await prisma.user.findMany({
      include: {
        accounts: true,
        sessions: true
      }
    })
    
    console.log(`📊 Tìm thấy ${users.length} users trong database local`)
    
    if (users.length === 0) {
      console.log('⚠️ Không có users nào để migrate')
      return
    }
    
    // Migrate từng user
    let successCount = 0
    let errorCount = 0
    
    for (const user of users) {
      try {
        console.log(`\n👤 Migrating user: ${user.email}`)
        
        // Tạo user trong Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password || undefined, // Chỉ set password nếu có
          email_confirm: true, // Auto confirm email
          user_metadata: {
            name: user.name,
            role: user.role,
            schoolId: user.schoolId
          }
        })
        
        if (authError) {
          console.error(`❌ Lỗi tạo auth user ${user.email}:`, authError.message)
          errorCount++
          continue
        }
        
        // Tạo user trong public.users table (nếu cần)
        const { error: dbError } = await supabase
          .from('users')
          .insert({
            id: authUser.user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            school_id: user.schoolId,
            created_at: user.createdAt.toISOString(),
            updated_at: user.updatedAt.toISOString()
          })
        
        if (dbError) {
          console.error(`❌ Lỗi tạo db user ${user.email}:`, dbError.message)
          // Xóa auth user nếu tạo db user thất bại
          await supabase.auth.admin.deleteUser(authUser.user.id)
          errorCount++
          continue
        }
        
        console.log(`✅ Đã migrate user: ${user.email} (${user.role})`)
        successCount++
        
      } catch (error) {
        console.error(`❌ Lỗi migrate user ${user.email}:`, error)
        errorCount++
      }
    }
    
    console.log(`\n🎉 Hoàn thành migration!`)
    console.log(`✅ Thành công: ${successCount} users`)
    console.log(`❌ Thất bại: ${errorCount} users`)
    
  } catch (error) {
    console.error('💥 Lỗi migration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Chạy migration
migrateUsers()




