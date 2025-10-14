const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:password@localhost:5432/lmsmath_dev"
    }
  }
});

async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test user query
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });
    
    console.log(`📊 Found ${users.length} users in database:`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.name}) - ${user.role}`);
    });
    
    // Test specific student
    const student = await prisma.user.findUnique({
      where: { email: 'student@example.com' }
    });
    
    if (student) {
      console.log('✅ Student user found:');
      console.log(`  Email: ${student.email}`);
      console.log(`  Name: ${student.name}`);
      console.log(`  Role: ${student.role}`);
      console.log(`  Has Password: ${student.password ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ Student user not found');
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();




