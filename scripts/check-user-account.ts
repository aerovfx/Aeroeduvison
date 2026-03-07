/**
 * Script to check user account in database
 */

import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';

const prisma = new PrismaClient();

async function checkUserAccount(email: string, password: string) {
  console.log(`\n🔍 Checking account: ${email}\n`);

  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        schoolId: true,
        xp: true,
        createdAt: true,
        updatedAt: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        lastLoginAt: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      console.log('❌ User not found in database\n');
      return;
    }

    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   School ID: ${user.schoolId}`);
    console.log(`   XP: ${user.xp}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log(`   Updated: ${user.updatedAt}`);
    console.log(`   Failed Logins: ${user.failedLoginAttempts}`);
    console.log(`   Locked Until: ${user.lockedUntil || 'Not locked'}`);
    console.log(`   Last Login: ${user.lastLoginAt || 'Never'}`);
    console.log(`   2FA Enabled: ${user.twoFactorEnabled}`);

    // Check password
    if (user.password) {
      const isValidPassword = await compare(password, user.password);
      console.log(`\n🔑 Password check: ${isValidPassword ? '✅ VALID' : '❌ INVALID'}`);

      if (!isValidPassword) {
        console.log(`   Provided password: "${password}"`);
        console.log(`   Hash in DB: ${user.password.substring(0, 20)}...`);
      }
    } else {
      console.log('\n⚠️  No password set for this user');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      console.log(`\n🔒 Account is LOCKED until: ${user.lockedUntil}`);
    } else {
      console.log('\n🔓 Account is NOT locked');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check the student account
const email = process.argv[2] || 'student@example.com';
const password = process.argv[3] || 'student123';

checkUserAccount(email, password);
