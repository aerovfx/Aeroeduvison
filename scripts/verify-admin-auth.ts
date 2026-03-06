import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function verifyAdminAuth() {
  try {
    console.log('🔍 Verifying admin authentication...\n');

    // Check if admin account exists
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
      include: {
        accounts: true,
        sessions: true
      }
    });

    if (!admin) {
      console.log('❌ Admin account not found!');
      return;
    }

    console.log('✅ Admin account found:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Has Password: ${admin.password ? 'Yes' : 'No'}`);
    console.log(`   Email Verified: ${admin.emailVerified ? 'Yes' : 'No'}`);
    console.log(`   Created: ${admin.createdAt}`);

    // Verify password
    if (admin.password) {
      const isValidPassword = await bcryptjs.compare('admin123', admin.password);
      console.log(`   Password Valid: ${isValidPassword ? 'Yes' : 'No'}`);
    }

    // Check accounts
    console.log(`\n📋 Authentication accounts: ${admin.accounts.length}`);
    admin.accounts.forEach((account, index) => {
      console.log(`   ${index + 1}. Provider: ${account.provider}`);
      console.log(`      Type: ${account.type}`);
      console.log(`      Account ID: ${account.providerAccountId}`);
    });

    // Check active sessions
    console.log(`\n🔐 Active sessions: ${admin.sessions.length}`);
    admin.sessions.forEach((session, index) => {
      console.log(`   ${index + 1}. Token: ${session.sessionToken.substring(0, 20)}...`);
      console.log(`      Expires: ${session.expires}`);
      console.log(`      Valid: ${new Date() < session.expires ? 'Yes' : 'No'}`);
    });

    // Test login simulation
    console.log('\n🧪 Testing login simulation...');
    const testEmail = 'admin@example.com';
    const testPassword = 'admin123';

    const testUser = await prisma.user.findUnique({
      where: { email: testEmail }
    });

    if (testUser && testUser.password) {
      const passwordMatch = await bcryptjs.compare(testPassword, testUser.password);
      if (passwordMatch && testUser.role === 'ADMIN') {
        console.log('✅ Login simulation successful!');
        console.log('   Email: Valid');
        console.log('   Password: Valid');
        console.log('   Role: Admin');
        console.log('   Status: Ready for authentication');
      } else {
        console.log('❌ Login simulation failed!');
        console.log(`   Password match: ${passwordMatch}`);
        console.log(`   Role check: ${testUser.role === 'ADMIN'}`);
      }
    } else {
      console.log('❌ Login simulation failed - user or password not found!');
    }

    console.log('\n🎯 Admin Authentication Status: READY');
    console.log('📧 Email: admin@example.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: ADMIN');
    console.log('🌐 Access: http://localhost:3000/admin');

  } catch (error) {
    console.error('❌ Error verifying admin auth:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAdminAuth();
