import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function createSecureAdmin() {
  try {
    console.log('🔐 Creating secure admin account...\n');

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: {
        email: 'admin@example.com'
      }
    });

    if (existingAdmin) {
      console.log('⚠️  Admin account already exists!');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Created: ${existingAdmin.createdAt}`);
      
      // Update role to ADMIN if not already
      if (existingAdmin.role !== 'ADMIN') {
        await prisma.user.update({
          where: { email: 'admin@example.com' },
          data: { role: 'ADMIN' }
        });
        console.log('✅ Updated role to ADMIN');
      }
      
      return;
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash('admin123', 12);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'System Administrator',
        role: 'ADMIN',
        password: hashedPassword,
        emailVerified: new Date()
      }
    });

    console.log('✅ Admin account created successfully!');
    console.log(`   User ID: ${adminUser.id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Name: ${adminUser.name}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Created: ${adminUser.createdAt}`);

    // Create account entry for authentication
    const adminAccount = await prisma.account.create({
      data: {
        userId: adminUser.id,
        type: 'credentials',
        provider: 'credentials',
        providerAccountId: adminUser.id,
        access_token: null,
        expires_at: null,
        id_token: null,
        refresh_token: null,
        scope: null,
        session_state: null,
        token_type: null
      }
    });

    console.log(`   Account ID: ${adminAccount.id}`);
    console.log('\n🎉 Secure admin account setup complete!');
    console.log('📧 Email: admin@example.com');
    console.log('🔑 Password: admin123');
    console.log('\n⚠️  Remember to change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin account:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSecureAdmin();
