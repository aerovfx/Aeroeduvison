import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAdminEmail() {
  try {
    console.log('🔍 Verifying admin email...');

    const adminUser = await prisma.user.findUnique({
      where: {
        email: 'admin@example.com'
      }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found:', {
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
      emailVerified: adminUser.emailVerified
    });

    // Update email verification
    const updatedUser = await prisma.user.update({
      where: {
        email: 'admin@example.com'
      },
      data: {
        emailVerified: new Date()
      }
    });

    console.log('✅ Email verified successfully!');
    console.log('📧 Updated user:', {
      email: updatedUser.email,
      emailVerified: updatedUser.emailVerified
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAdminEmail();















