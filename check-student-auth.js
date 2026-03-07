const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function checkAndCreateStudent() {
  try {
    console.log('🔍 Checking for student users...');
    
    // Check if any students exist
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' }
    });
    
    console.log(`📊 Found ${students.length} student users:`);
    students.forEach(student => {
      console.log(`  - ${student.email} (${student.name})`);
    });
    
    if (students.length === 0) {
      console.log('❌ No student users found. Creating default student...');
      
      const hashedPassword = await hash('student123', 12);
      
      const newStudent = await prisma.user.create({
        data: {
          email: 'student@example.com',
          name: 'Student User',
          password: hashedPassword,
          role: 'STUDENT'
        }
      });
      
      console.log('✅ Created default student user:');
      console.log(`  Email: student@example.com`);
      console.log(`  Password: student123`);
      console.log(`  ID: ${newStudent.id}`);
    } else {
      console.log('✅ Student users exist. Testing login...');
      
      // Test login with first student
      const testStudent = students[0];
      console.log(`🧪 Testing login with: ${testStudent.email}`);
      
      if (!testStudent.password) {
        console.log('❌ Student has no password. Setting password...');
        const hashedPassword = await hash('student123', 12);
        
        await prisma.user.update({
          where: { id: testStudent.id },
          data: { password: hashedPassword }
        });
        
        console.log('✅ Password set for student');
        console.log(`  Email: ${testStudent.email}`);
        console.log(`  Password: student123`);
      }
    }
    
    // Also check for other roles
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' }
    });
    
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });
    
    console.log(`\n📊 User Summary:`);
    console.log(`  Students: ${students.length}`);
    console.log(`  Teachers: ${teachers.length}`);
    console.log(`  Admins: ${admins.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateStudent();




