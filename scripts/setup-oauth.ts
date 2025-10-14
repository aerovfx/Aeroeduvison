#!/usr/bin/env tsx

/**
 * Script để kiểm tra và hướng dẫn setup OAuth
 * Chạy: tsx scripts/setup-oauth.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const envPath = join(process.cwd(), '.env.local')

function checkEnvFile() {
  console.log('🔍 Kiểm tra file .env.local...')
  
  if (!existsSync(envPath)) {
    console.log('❌ File .env.local không tồn tại!')
    console.log('📝 Tạo file .env.local từ env.example...')
    createEnvFile()
    return
  }
  
  const envContent = readFileSync(envPath, 'utf-8')
  console.log('✅ File .env.local đã tồn tại')
  
  // Kiểm tra các biến cần thiết
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET'
  ]
  
  const oauthVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
  ]
  
  const supabaseVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  console.log('\n📋 Kiểm tra biến môi trường:')
  
  // Kiểm tra biến cơ bản
  let missingBasic = []
  for (const varName of requiredVars) {
    if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=""`) && !envContent.includes(`${varName}="your-`)) {
      console.log(`✅ ${varName}: Đã cấu hình`)
    } else {
      console.log(`❌ ${varName}: Chưa cấu hình`)
      missingBasic.push(varName)
    }
  }
  
  // Kiểm tra OAuth
  console.log('\n🔐 Kiểm tra Google OAuth:')
  let missingOAuth = []
  for (const varName of oauthVars) {
    if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=""`) && !envContent.includes(`${varName}="your-`)) {
      console.log(`✅ ${varName}: Đã cấu hình`)
    } else {
      console.log(`❌ ${varName}: Chưa cấu hình`)
      missingOAuth.push(varName)
    }
  }
  
  // Kiểm tra Supabase
  console.log('\n🗄️ Kiểm tra Supabase:')
  let missingSupabase = []
  for (const varName of supabaseVars) {
    if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=""`) && !envContent.includes(`${varName}="your-`)) {
      console.log(`✅ ${varName}: Đã cấu hình`)
    } else {
      console.log(`❌ ${varName}: Chưa cấu hình`)
      missingSupabase.push(varName)
    }
  }
  
  // Tóm tắt
  console.log('\n📊 Tóm tắt:')
  if (missingBasic.length === 0 && missingOAuth.length === 0 && missingSupabase.length === 0) {
    console.log('🎉 Tất cả biến môi trường đã được cấu hình!')
  } else {
    if (missingBasic.length > 0) {
      console.log(`❌ Thiếu biến cơ bản: ${missingBasic.join(', ')}`)
    }
    if (missingOAuth.length > 0) {
      console.log(`❌ Thiếu Google OAuth: ${missingOAuth.join(', ')}`)
    }
    if (missingSupabase.length > 0) {
      console.log(`❌ Thiếu Supabase: ${missingSupabase.join(', ')}`)
    }
  }
  
  return { missingBasic, missingOAuth, missingSupabase }
}

function createEnvFile() {
  const envExample = `# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/lmsmath?schema=public"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="76tbjqFi6cJIh4TcX7Y0JruhUfGGz6DdRzZv8La8cQo="

# Google OAuth (Cần cấu hình)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Supabase (Cần cấu hình)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Google Cloud Storage Configuration (for file uploads)
GOOGLE_CLOUD_PROJECT_ID="gen-lang-client-0712182643"
GOOGLE_CLOUD_KEY_FILE="path/to/service-account-key.json"
GOOGLE_CLOUD_CREDENTIALS='{"type":"service_account",...}'
GCS_BUCKET_NAME="your-gcs-bucket-name"
NEXT_PUBLIC_GCS_BUCKET_NAME="your-gcs-bucket-name"

# Uploadthing (for file uploads)
UPLOADTHING_SECRET="your-uploadthing-secret"
UPLOADTHING_APP_ID="your-uploadthing-app-id"

# Stripe (for payments)
STRIPE_API_KEY="your-stripe-api-key"
STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret"
`
  
  writeFileSync(envPath, envExample)
  console.log('✅ Đã tạo file .env.local')
}

function showSetupInstructions() {
  console.log('\n📚 Hướng dẫn setup:')
  
  console.log('\n🔐 1. Google OAuth Setup:')
  console.log('   - Truy cập: https://console.cloud.google.com/')
  console.log('   - Tạo project mới hoặc chọn project hiện có')
  console.log('   - Bật Google+ API')
  console.log('   - Tạo OAuth 2.0 Client ID')
  console.log('   - Authorized redirect URIs: http://localhost:3000/api/auth/callback/google')
  console.log('   - Authorized JavaScript origins: http://localhost:3000')
  console.log('   - Copy Client ID và Client Secret vào .env.local')
  
  console.log('\n🗄️ 2. Supabase Setup:')
  console.log('   - Truy cập: https://supabase.com/')
  console.log('   - Tạo project mới')
  console.log('   - Vào Settings > API')
  console.log('   - Copy URL và anon key vào .env.local')
  console.log('   - Tạo service role key và copy vào .env.local')
  
  console.log('\n🚀 3. Sau khi cấu hình xong:')
  console.log('   - Restart development server: npm run dev')
  console.log('   - Test đăng nhập: http://localhost:3000/sign-in')
  console.log('   - Test auth: http://localhost:3000/test-auth')
}

async function main() {
  console.log('🔧 OAuth & Supabase Setup Checker\n')
  
  const missing = checkEnvFile()
  
  if (missing && (missing.missingOAuth.length > 0 || missing.missingSupabase.length > 0)) {
    showSetupInstructions()
  }
  
  console.log('\n✨ Hoàn thành kiểm tra!')
}

main().catch(console.error)




