import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdminAccounts() {
  try {
    console.log('🔍 Checking admin accounts...\n');

    // Find all admin accounts
    const adminAccounts = await prisma.account.findMany({
      where: {
        user: {
          role: 'ADMIN'
        }
      },
      include: {
        user: true
      }
    });

    console.log(`Found ${adminAccounts.length} admin account(s):\n`);

    adminAccounts.forEach((account, index) => {
      console.log(`${index + 1}. User ID: ${account.userId}`);
      console.log(`   Email: ${account.user.email}`);
      console.log(`   Name: ${account.user.name}`);
      console.log(`   Created: ${account.user.createdAt}`);
      console.log(`   Provider: ${account.provider}`);
      console.log(`   Provider Account ID: ${account.providerAccountId}`);
      console.log('---');
    });

    // Also check users with admin role directly
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      }
    });

    console.log(`\nDirect admin users (${adminUsers.length}):\n`);
    adminUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('---');
    });

  } catch (error) {
    console.error('❌ Error checking admin accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminAccounts();















