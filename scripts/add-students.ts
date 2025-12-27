import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Student data provided by user
const students = [
  { name: 'Alice Nguyen', email: 'alice.nguyen01@example.org', password: '0qFCsqgjkg' },
  { name: 'Bao Tran', email: 'bao.tran02@example.net', password: 'NhIlCnL7n2' },
  { name: 'Carol Le', email: 'carol.le03@example.org', password: 'HChEUdUwAF' },
  { name: 'Daniel Pham', email: 'daniel.pham04@example.com', password: 'SYj3Bp3fx8' },
  { name: 'Emma Vu', email: 'emma.vu05@example.org', password: 'LIkhxKiWH4' },
  { name: 'Frank Do', email: 'frank.do06@example.net', password: '9Wh5JwPYGu' },
  { name: 'Grace Hoang', email: 'grace.hoang07@example.org', password: 'KfJSOse4za' },
  { name: 'Henry Bui', email: 'henry.bui08@example.com', password: 'GWukm7uJan' },
  { name: 'Ivy Dang', email: 'ivy.dang09@example.org', password: 'MICmSjIawu' },
  { name: 'Jack Truong', email: 'jack.truong10@example.net', password: 'gJonEP1c9h' },
  { name: 'Kelly Huynh', email: 'kelly.huynh11@example.org', password: 'Y0FLQjtcwM' },
  { name: 'Liam Le', email: 'liam.le12@example.com', password: 'dWD8QXkz0k' },
  { name: 'Mia Phan', email: 'mia.phan13@example.net', password: '3B54tccniR' },
  { name: 'Noah Vo', email: 'noah.vo14@example.org', password: 'Gw5WP8ZbIA' },
  { name: 'Olivia Doan', email: 'olivia.doan15@example.com', password: 'iea4YI8ac5' },
  { name: 'Peter Dinh', email: 'peter.dinh16@example.net', password: '6IvQlf1Ipc' },
  { name: 'Quinn Tran', email: 'quinn.tran17@example.org', password: 'P9B2AbC6zj' },
  { name: 'Ryan Nguyen', email: 'ryan.nguyen18@example.net', password: 'iapicBZObV' },
  { name: 'Sophia Pham', email: 'sophia.pham19@example.org', password: 'yfHlPglDqV' },
  { name: 'Thomas Le', email: 'thomas.le20@example.com', password: 'SRrV4YHezz' },
  { name: 'Uyen Ho', email: 'uyen.ho21@example.org', password: 'qJRTxG0utI' },
  { name: 'Victor Bui', email: 'victor.bui22@example.net', password: 'YZ808ti8AY' },
  { name: 'Wendy Dang', email: 'wendy.dang23@example.org', password: 'EnWc6Ahm2K' },
  { name: 'Xuan Truong', email: 'xuan.truong24@example.net', password: 'pdutjAG8zB' },
  { name: 'Yen Vo', email: 'yen.vo25@example.org', password: 'x3kMEO35XD' },
  { name: 'Zack Doan', email: 'zack.doan26@example.com', password: 'GM43l4eukt' },
  { name: 'Amy Tran', email: 'amy.tran27@example.net', password: 'mRFPXlRaCn' },
  { name: 'Brian Nguyen', email: 'brian.nguyen28@example.org', password: 'o0m6DVjc8m' },
  { name: 'Chloe Pham', email: 'chloe.pham29@example.com', password: 'daVTeROnW6' },
  { name: 'David Le', email: 'david.le30@example.net', password: '8QoIcbgAqW' },
  { name: 'Ella Dinh', email: 'ella.dinh31@example.org', password: 'cDB91osfzx' },
  { name: 'Felix Ho', email: 'felix.ho32@example.net', password: 'eFQneWvifV' },
  { name: 'Gina Truong', email: 'gina.truong33@example.org', password: 'xpJ8KzIYxT' },
  { name: 'Harry Bui', email: 'harry.bui34@example.com', password: 'KIFXMm6DBL' },
  { name: 'Isabel Do', email: 'isabel.do35@example.net', password: 'hT5y8PqFQw' },
  { name: 'Jason Nguyen', email: 'jason.nguyen36@example.org', password: '4ApARKKFVq' },
  { name: 'Katie Pham', email: 'katie.pham37@example.com', password: '0e2d2JVHqj' },
  { name: 'Leo Vo', email: 'leo.vo38@example.net', password: 'MQzvpd9XtL' },
  { name: 'May Tran', email: 'may.tran39@example.org', password: 'Yl5XEXjSwr' },
  { name: 'Nick Le', email: 'nick.le40@example.com', password: 'DiLw2JpMlH' }
]

async function addStudents() {
  console.log('🚀 Starting to add student users to database...')
  console.log(`📊 Total students to add: ${students.length}`)
  
  let successCount = 0
  let errorCount = 0
  
  for (const student of students) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: student.email }
      })
      
      if (existingUser) {
        console.log(`⚠️  User already exists: ${student.name} (${student.email})`)
        continue
      }
      
      // Hash password
      const hashedPassword = await hash(student.password, 12)
      
      // Generate unique ID
      const userId = crypto.randomUUID()
      
      // Create user
      const newUser = await prisma.user.create({
        data: {
          id: userId,
          name: student.name,
          email: student.email,
          password: hashedPassword,
          role: 'STUDENT',
          schoolId: 'default-school',
          xp: 0,
          emailVerified: new Date(), // Mark as verified for testing
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      
      console.log(`✅ Created student: ${student.name} (${student.email}) - ID: ${newUser.id}`)
      successCount++
      
    } catch (error) {
      console.error(`❌ Error creating student ${student.name}:`, error)
      errorCount++
    }
  }
  
  console.log('\n📈 Summary:')
  console.log(`✅ Successfully created: ${successCount} students`)
  console.log(`❌ Errors: ${errorCount} students`)
  console.log(`📊 Total processed: ${students.length} students`)
  
  if (successCount > 0) {
    console.log('\n🎉 Students added successfully!')
    console.log('\n📋 Sample login credentials:')
    console.log(`   ${students[0].name}: ${students[0].email} / ${students[0].password}`)
    console.log(`   ${students[1].name}: ${students[1].email} / ${students[1].password}`)
    console.log(`   ${students[2].name}: ${students[2].email} / ${students[2].password}`)
    console.log('\n💡 You can now test the application with these student accounts!')
  }
}

async function main() {
  try {
    await addStudents()
  } catch (error) {
    console.error('💥 Script failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
