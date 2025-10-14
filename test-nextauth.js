const { PrismaClient } = require('@prisma/client');
const { compare } = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:password@localhost:5432/lmsmath_dev"
    }
  }
});

async function testNextAuthFlow() {
  try {
    console.log('🧪 Testing NextAuth authentication flow...');
    
    // Test 1: Find user
    console.log('1. Finding user...');
    const user = await prisma.user.findUnique({
      where: { email: 'student@example.com' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.email);
    
    // Test 2: Check password
    console.log('2. Testing password...');
    const isPasswordValid = await compare('student123', user.password);
    console.log('✅ Password valid:', isPasswordValid);
    
    // Test 3: Test authorization function
    console.log('3. Testing authorization function...');
    
    const credentials = {
      email: 'student@example.com',
      password: 'student123'
    };
    
    if (!credentials?.email || !credentials?.password) {
      console.log('❌ Missing credentials');
      return;
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: credentials.email }
    });

    if (!dbUser) {
      console.log('❌ User not found in database');
      return;
    }

    if (!dbUser.password) {
      console.log('❌ User has no password');
      return;
    }

    const isPasswordCorrect = await compare(credentials.password, dbUser.password);

    if (!isPasswordCorrect) {
      console.log('❌ Password incorrect');
      return;
    }

    const authResult = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      image: dbUser.image,
      role: dbUser.role,
    };
    
    console.log('✅ Authorization successful:');
    console.log('  User ID:', authResult.id);
    console.log('  Email:', authResult.email);
    console.log('  Name:', authResult.name);
    console.log('  Role:', authResult.role);
    
  } catch (error) {
    console.error('❌ Error testing NextAuth:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNextAuthFlow();




