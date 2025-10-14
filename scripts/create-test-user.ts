/**
 * Create test user for login
 * 
 * Usage: tsx scripts/create-test-user.ts
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🔧 Creating test user...');

    // Hash password
    const hashedPassword = await hash('admin123', 12);

    // Create test user
    const user = await prisma.user.upsert({
      where: { email: 'admin@lmsmath.com' },
      update: {
        password: hashedPassword,
        role: 'ADMIN',
      },
      create: {
        email: 'admin@lmsmath.com',
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN',
        emailVerified: new Date(),
      }
    });

    console.log('✅ Test user created successfully!');
    console.log('📧 Email: admin@lmsmath.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: ADMIN');
    console.log('🆔 User ID:', user.id);

    // Create additional test users
    const testUsers = [
      {
        email: 'teacher@lmsmath.com',
        name: 'Teacher User',
        role: 'TEACHER',
        password: 'teacher123'
      },
      {
        email: 'student@lmsmath.com',
        name: 'Student User',
        role: 'STUDENT',
        password: 'student123'
      }
    ];

    for (const testUser of testUsers) {
      const hashedPwd = await hash(testUser.password, 12);
      
      await prisma.user.upsert({
        where: { email: testUser.email },
        update: {
          password: hashedPwd,
          role: testUser.role,
        },
        create: {
          email: testUser.email,
          name: testUser.name,
          password: hashedPwd,
          role: testUser.role,
          emailVerified: new Date(),
        }
      });

      console.log(`✅ ${testUser.role} user created: ${testUser.email} / ${testUser.password}`);
    }

    console.log('\n🎉 All test users created successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('Admin: admin@lmsmath.com / admin123');
    console.log('Teacher: teacher@lmsmath.com / teacher123');
    console.log('Student: student@lmsmath.com / student123');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestUser();
