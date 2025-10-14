const { PrismaClient } = require('@prisma/client');
const { PrismaAdapter } = require('@next-auth/prisma-adapter');
const { compare } = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:password@localhost:5432/lmsmath_dev"
    }
  }
});

async function testNextAuthDebug() {
  try {
    console.log('🔍 Testing NextAuth with PrismaAdapter...');
    
    // Test PrismaAdapter
    console.log('1. Testing PrismaAdapter...');
    const adapter = PrismaAdapter(prisma);
    console.log('✅ PrismaAdapter created');
    
    // Test user creation (simulate NextAuth flow)
    console.log('2. Testing user lookup...');
    const user = await prisma.user.findUnique({
      where: { email: 'student@example.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.email);
    
    // Test password verification
    console.log('3. Testing password verification...');
    const isValid = await compare('student123', user.password);
    console.log('✅ Password valid:', isValid);
    
    // Test session creation (simulate NextAuth session)
    console.log('4. Testing session simulation...');
    const sessionData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    
    console.log('✅ Session data would be:', sessionData);
    
    // Test database connection
    console.log('5. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Test query
    const userCount = await prisma.user.count();
    console.log('✅ User count:', userCount);
    
  } catch (error) {
    console.error('❌ Error in NextAuth debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNextAuthDebug();




