import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupAdminAccounts() {
  try {
    console.log('🧹 Cleaning up admin accounts...\n');

    // Find all admin accounts except admin@example.com
    const adminAccounts = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        email: {
          not: 'admin@example.com'
        }
      }
    });

    console.log(`Found ${adminAccounts.length} admin account(s) to remove:\n`);

    if (adminAccounts.length === 0) {
      console.log('✅ No additional admin accounts found. System is secure!');
      return;
    }

    // List accounts to be removed
    adminAccounts.forEach((account, index) => {
      console.log(`${index + 1}. ID: ${account.id}`);
      console.log(`   Email: ${account.email}`);
      console.log(`   Name: ${account.name}`);
      console.log(`   Created: ${account.createdAt}`);
      console.log('---');
    });

    // Remove admin accounts and related data
    for (const adminAccount of adminAccounts) {
      console.log(`🗑️  Removing admin account: ${adminAccount.email}`);
      
      // Delete related data first
      await prisma.account.deleteMany({
        where: { userId: adminAccount.id }
      });

      await prisma.session.deleteMany({
        where: { userId: adminAccount.id }
      });

      await prisma.userProgress.deleteMany({
        where: { userId: adminAccount.id }
      });

      await prisma.purchase.deleteMany({
        where: { userId: adminAccount.id }
      });

      // Delete the user
      await prisma.user.delete({
        where: { id: adminAccount.id }
      });

      console.log(`✅ Removed admin account: ${adminAccount.email}`);
    }

    console.log(`\n🎉 Cleanup complete! Removed ${adminAccounts.length} admin account(s).`);
    
    // Verify the secure admin account
    const secureAdmin = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });

    if (secureAdmin) {
      console.log('\n✅ Secure admin account verified:');
      console.log(`   Email: ${secureAdmin.email}`);
      console.log(`   Role: ${secureAdmin.role}`);
      console.log(`   Created: ${secureAdmin.createdAt}`);
    } else {
      console.log('\n❌ Warning: Secure admin account not found!');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAdminAccounts();















