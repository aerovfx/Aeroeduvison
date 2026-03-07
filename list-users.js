/**
 * List all users in the database
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listUsers() {
  try {
    console.log('\n🔍 Đang tải danh sách tài khoản...\n');

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        xp: true,
        createdAt: true,
        lastLoginAt: true,
        schoolId: true,
      },
      orderBy: [
        { role: 'asc' },
        { email: 'asc' }
      ]
    });

    console.log(`📊 Tổng số tài khoản: ${users.length}\n`);

    // Group by role
    const byRole = {};
    users.forEach(user => {
      if (!byRole[user.role]) {
        byRole[user.role] = [];
      }
      byRole[user.role].push(user);
    });

    // Display by role
    for (const [role, roleUsers] of Object.entries(byRole)) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`👥 ${role}: ${roleUsers.length} tài khoản`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      roleUsers.forEach((user, idx) => {
        console.log(`${idx + 1}. ${user.name || '(Không có tên)'}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🆔 ID: ${user.id}`);
        console.log(`   ✅ Verified: ${user.emailVerified ? 'Có' : 'Chưa'}`);
        console.log(`   ⭐ XP: ${user.xp || 0}`);
        console.log(`   🏫 School ID: ${user.schoolId}`);
        if (user.lastLoginAt) {
          const lastLogin = new Date(user.lastLoginAt);
          console.log(`   🕒 Đăng nhập lần cuối: ${lastLogin.toLocaleString('vi-VN')}`);
        } else {
          console.log(`   🕒 Đăng nhập lần cuối: Chưa đăng nhập`);
        }
        console.log(`   📅 Tạo lúc: ${new Date(user.createdAt).toLocaleString('vi-VN')}`);
        console.log('');
      });
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 TÓM TẮT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    Object.entries(byRole).forEach(([role, roleUsers]) => {
      console.log(`   ${role}: ${roleUsers.length} tài khoản`);
    });

    console.log(`\n   Tổng cộng: ${users.length} tài khoản\n`);

  } catch (error) {
    console.error('❌ Lỗi khi tải danh sách:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

listUsers()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

