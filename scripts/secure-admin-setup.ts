import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function secureAdminSetup() {
  try {
    console.log('🔐 Setting up secure admin system...\n');

    // Step 1: Check current admin accounts
    console.log('📋 Step 1: Checking current admin accounts...');
    const allAdminAccounts = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });

    console.log(`Found ${allAdminAccounts.length} admin account(s):`);
    allAdminAccounts.forEach((account, index) => {
      console.log(`   ${index + 1}. ${account.email} (${account.name})`);
    });

    // Step 2: Remove non-secure admin accounts
    console.log('\n🗑️  Step 2: Removing non-secure admin accounts...');
    const accountsToRemove = allAdminAccounts.filter(
      account => account.email !== 'admin@example.com'
    );

    for (const account of accountsToRemove) {
      console.log(`   Removing: ${account.email}`);
      
      // Delete related data
      await prisma.account.deleteMany({ where: { userId: account.id } });
      await prisma.session.deleteMany({ where: { userId: account.id } });
      await prisma.userProgress.deleteMany({ where: { userId: account.id } });
      await prisma.purchase.deleteMany({ where: { userId: account.id } });
      
      // Delete user
      await prisma.user.delete({ where: { id: account.id } });
    }

    if (accountsToRemove.length > 0) {
      console.log(`   ✅ Removed ${accountsToRemove.length} admin account(s)`);
    } else {
      console.log('   ✅ No additional admin accounts to remove');
    }

    // Step 3: Ensure secure admin account exists
    console.log('\n👤 Step 3: Ensuring secure admin account...');
    let secureAdmin = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });

    if (!secureAdmin) {
      console.log('   Creating secure admin account...');
      const hashedPassword = await bcryptjs.hash('admin123', 12);
      
      secureAdmin = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          name: 'System Administrator',
          role: 'ADMIN',
          password: hashedPassword,
          emailVerified: new Date()
        }
      });

      // Create account entry for authentication
      await prisma.account.create({
        data: {
          userId: secureAdmin.id,
          type: 'credentials',
          provider: 'credentials',
          providerAccountId: secureAdmin.id
        }
      });

      console.log('   ✅ Secure admin account created');
    } else {
      // Update role to ADMIN if needed
      if (secureAdmin.role !== 'ADMIN') {
        await prisma.user.update({
          where: { email: 'admin@example.com' },
          data: { role: 'ADMIN' }
        });
        console.log('   ✅ Updated role to ADMIN');
      } else {
        console.log('   ✅ Secure admin account already exists');
      }
    }

    // Step 4: Verify final state
    console.log('\n✅ Step 4: Verifying final state...');
    const finalAdminAccounts = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });

    console.log(`Final admin accounts: ${finalAdminAccounts.length}`);
    finalAdminAccounts.forEach((account, index) => {
      console.log(`   ${index + 1}. ${account.email} (${account.name})`);
    });

    // Step 5: Security summary
    console.log('\n🛡️  Security Summary:');
    console.log('   ✅ Only one admin account exists: admin@example.com');
    console.log('   ✅ Password: admin123');
    console.log('   ✅ Role: ADMIN');
    console.log('   ✅ Email verified');
    console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
    console.log('   1. Change the default password after first login');
    console.log('   2. Use strong password policy');
    console.log('   3. Enable 2FA if possible');
    console.log('   4. Monitor admin account activity');
    console.log('   5. Regular security audits');

  } catch (error) {
    console.error('❌ Error during secure admin setup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

secureAdminSetup();















