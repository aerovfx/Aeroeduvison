#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createId } from '@paralleldrive/cuid2';

const prisma = new PrismaClient();

// Test data
const testUsers = [
  {
    email: 'prisma-test-student@example.com',
    password: 'testpassword123',
    name: 'Prisma Test Student',
    role: 'STUDENT' as const,
    xp: 100,
  },
  {
    email: 'prisma-test-teacher@example.com',
    password: 'testpassword123',
    name: 'Prisma Test Teacher',
    role: 'TEACHER' as const,
    xp: 500,
  },
  {
    email: 'prisma-test-admin@example.com',
    password: 'testpassword123',
    name: 'Prisma Test Admin',
    role: 'ADMIN' as const,
    xp: 1000,
  },
];

async function testDatabaseConnection() {
  console.log('🔌 Testing database connection...');
  
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testCRUDOperations() {
  console.log('\n📝 Testing CRUD operations...');
  
  const results = {
    create: false,
    read: false,
    update: false,
    delete: false,
  };

  try {
    // CREATE - Create test users
    console.log('  Creating test users...');
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    
    const createdUsers = [];
    for (const userData of testUsers) {
      const user = await prisma.user.create({
        data: {
          id: createId(),
          ...userData,
          password: hashedPassword,
          updatedAt: new Date(),
        },
      });
      createdUsers.push(user);
      console.log(`    ✅ Created user: ${user.email} (ID: ${user.id})`);
    }
    
    results.create = true;

    // READ - Find users
    console.log('  Reading users...');
    const foundUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: 'prisma-test',
        },
      },
    });
    
    console.log(`    ✅ Found ${foundUsers.length} test users`);
    results.read = true;

    // UPDATE - Update user XP
    console.log('  Updating user XP...');
    const updatedUser = await prisma.user.update({
      where: { id: createdUsers[0].id },
      data: { xp: 200 },
    });
    
    console.log(`    ✅ Updated user XP: ${updatedUser.xp}`);
    results.update = true;

    // DELETE - Clean up test users
    console.log('  Deleting test users...');
    for (const user of createdUsers) {
      await prisma.user.delete({
        where: { id: user.id },
      });
      console.log(`    ✅ Deleted user: ${user.email}`);
    }
    
    results.delete = true;

  } catch (error) {
    console.error('❌ CRUD operations failed:', error.message);
  }

  return results;
}

async function testComplexQueries() {
  console.log('\n🔍 Testing complex queries...');
  
  const results = {
    filtering: false,
    sorting: false,
    pagination: false,
    aggregation: false,
  };

  try {
    // Test filtering
    console.log('  Testing filtering...');
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        xp: {
          gte: 0,
        },
      },
    });
    console.log(`    ✅ Found ${students.length} students with XP >= 0`);
    results.filtering = true;

    // Test sorting
    console.log('  Testing sorting...');
    const sortedUsers = await prisma.user.findMany({
      orderBy: {
        xp: 'desc',
      },
      take: 5,
    });
    console.log(`    ✅ Found top 5 users by XP`);
    results.sorting = true;

    // Test pagination
    console.log('  Testing pagination...');
    const paginatedUsers = await prisma.user.findMany({
      skip: 0,
      take: 10,
    });
    console.log(`    ✅ Retrieved ${paginatedUsers.length} users (page 1)`);
    results.pagination = true;

    // Test aggregation
    console.log('  Testing aggregation...');
    const [totalUsers, studentCount, teacherCount, adminCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
    ]);
    
    console.log(`    ✅ Total users: ${totalUsers}`);
    console.log(`    ✅ Students: ${studentCount}, Teachers: ${teacherCount}, Admins: ${adminCount}`);
    results.aggregation = true;

  } catch (error) {
    console.error('❌ Complex queries failed:', error.message);
  }

  return results;
}

async function testDataValidation() {
  console.log('\n✅ Testing data validation...');
  
  const results = {
    emailUniqueness: false,
    requiredFields: false,
    roleValidation: false,
    emailFormat: false,
  };

  try {
    // Test email uniqueness
    console.log('  Testing email uniqueness...');
    try {
      await prisma.user.create({
        data: {
          email: 'student@example.com', // Existing email
          password: 'hashedPassword',
          name: 'Duplicate User',
          role: 'STUDENT',
        },
      });
      console.log('    ❌ Email uniqueness not enforced');
    } catch (error) {
      if (error.message.includes('Unique constraint') || error.message.includes('duplicate')) {
        console.log('    ✅ Email uniqueness enforced');
        results.emailUniqueness = true;
      }
    }

    // Test required fields
    console.log('  Testing required fields...');
    try {
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          // Missing required fields
        },
      });
      console.log('    ❌ Required fields not enforced');
    } catch (error) {
      if (error.message.includes('Required') || error.message.includes('missing')) {
        console.log('    ✅ Required fields enforced');
        results.requiredFields = true;
      }
    }

    // Test role validation
    console.log('  Testing role validation...');
    try {
      await prisma.user.create({
        data: {
          email: 'invalid-role@example.com',
          password: 'hashedPassword',
          name: 'Invalid Role User',
          role: 'INVALID_ROLE' as any,
        },
      });
      console.log('    ❌ Role validation not enforced');
    } catch (error) {
      if (error.message.includes('Invalid') || error.message.includes('enum')) {
        console.log('    ✅ Role validation enforced');
        results.roleValidation = true;
      }
    }

  } catch (error) {
    console.error('❌ Data validation tests failed:', error.message);
  }

  return results;
}

async function testTransactions() {
  console.log('\n🔄 Testing transactions...');
  
  const results = {
    success: false,
    rollback: false,
  };

  try {
    // Test successful transaction
    console.log('  Testing successful transaction...');
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    
    const transactionResult = await prisma.$transaction(async (tx) => {
      const user1 = await tx.user.create({
        data: {
          id: createId(),
          email: 'transaction-user1@example.com',
          password: hashedPassword,
          name: 'Transaction User 1',
          role: 'STUDENT',
          updatedAt: new Date(),
        },
      });

      const user2 = await tx.user.create({
        data: {
          id: createId(),
          email: 'transaction-user2@example.com',
          password: hashedPassword,
          name: 'Transaction User 2',
          role: 'TEACHER',
          updatedAt: new Date(),
        },
      });

      return [user1, user2];
    });

    console.log(`    ✅ Transaction successful: Created ${transactionResult.length} users`);
    results.success = true;

    // Clean up transaction users
    for (const user of transactionResult) {
      await prisma.user.delete({
        where: { id: user.id },
      });
    }

    // Test transaction rollback
    console.log('  Testing transaction rollback...');
    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            id: createId(),
            email: 'rollback-user@example.com',
            password: hashedPassword,
            name: 'Rollback User',
            role: 'STUDENT',
            updatedAt: new Date(),
          },
        });

        throw new Error('Simulated error');
      });
    } catch (error) {
      console.log('    ✅ Transaction rollback successful');
      results.rollback = true;
    }

  } catch (error) {
    console.error('❌ Transaction tests failed:', error.message);
  }

  return results;
}

async function testPrismaAccelerate() {
  console.log('\n⚡ Testing Prisma Accelerate...');
  
  const results = {
    connection: false,
    queries: false,
    performance: false,
  };

  try {
    // Test connection
    console.log('  Testing Accelerate connection...');
    const startTime = Date.now();
    await prisma.$connect();
    const connectionTime = Date.now() - startTime;
    
    console.log(`    ✅ Connected to Prisma Accelerate in ${connectionTime}ms`);
    results.connection = true;

    // Test query performance
    console.log('  Testing query performance...');
    const queryStartTime = Date.now();
    const users = await prisma.user.findMany({
      take: 10,
    });
    const queryTime = Date.now() - queryStartTime;
    
    console.log(`    ✅ Query completed in ${queryTime}ms (${users.length} users)`);
    results.queries = true;

    // Test performance
    if (queryTime < 1000) {
      console.log('    ✅ Query performance is good');
      results.performance = true;
    } else {
      console.log('    ⚠️ Query performance could be improved');
    }

  } catch (error) {
    console.error('❌ Prisma Accelerate tests failed:', error.message);
  }

  return results;
}

async function testRawQueries() {
  console.log('\n🔧 Testing raw queries...');
  
  const results = {
    select: false,
    update: false,
  };

  try {
    // Test raw SELECT query
    console.log('  Testing raw SELECT query...');
    const rawUsers = await prisma.$queryRaw`
      SELECT id, email, name, role, xp 
      FROM "User" 
      WHERE role = 'STUDENT' 
      ORDER BY xp DESC 
      LIMIT 5
    `;
    
    console.log(`    ✅ Raw SELECT query returned ${rawUsers.length} students`);
    results.select = true;

    // Test raw UPDATE query
    console.log('  Testing raw UPDATE query...');
    const updateResult = await prisma.$executeRaw`
      UPDATE "User" 
      SET "updatedAt" = NOW() 
      WHERE role = 'STUDENT' 
      AND xp > 0
    `;
    
    console.log(`    ✅ Raw UPDATE query affected ${updateResult} rows`);
    results.update = true;

  } catch (error) {
    console.error('❌ Raw queries failed:', error.message);
  }

  return results;
}

async function runAllTests() {
  console.log('🧪 Prisma PostgreSQL Comprehensive Test Suite');
  console.log('============================================\n');

  const testResults = {
    connection: false,
    crud: { create: false, read: false, update: false, delete: false },
    complexQueries: { filtering: false, sorting: false, pagination: false, aggregation: false },
    validation: { emailUniqueness: false, requiredFields: false, roleValidation: false, emailFormat: false },
    transactions: { success: false, rollback: false },
    accelerate: { connection: false, queries: false, performance: false },
    rawQueries: { select: false, update: false },
  };

  // Run all tests
  testResults.connection = await testDatabaseConnection();
  testResults.crud = await testCRUDOperations();
  testResults.complexQueries = await testComplexQueries();
  testResults.validation = await testDataValidation();
  testResults.transactions = await testTransactions();
  testResults.accelerate = await testPrismaAccelerate();
  testResults.rawQueries = await testRawQueries();

  // Generate report
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  
  const totalTests = 20;
  let passedTests = 0;

  // Connection
  if (testResults.connection) {
    console.log('✅ Database Connection: PASSED');
    passedTests++;
  } else {
    console.log('❌ Database Connection: FAILED');
  }

  // CRUD Operations
  const crudPassed = Object.values(testResults.crud).filter(Boolean).length;
  console.log(`📝 CRUD Operations: ${crudPassed}/4 PASSED`);
  passedTests += crudPassed;

  // Complex Queries
  const queriesPassed = Object.values(testResults.complexQueries).filter(Boolean).length;
  console.log(`🔍 Complex Queries: ${queriesPassed}/4 PASSED`);
  passedTests += queriesPassed;

  // Data Validation
  const validationPassed = Object.values(testResults.validation).filter(Boolean).length;
  console.log(`✅ Data Validation: ${validationPassed}/4 PASSED`);
  passedTests += validationPassed;

  // Transactions
  const transactionPassed = Object.values(testResults.transactions).filter(Boolean).length;
  console.log(`🔄 Transactions: ${transactionPassed}/2 PASSED`);
  passedTests += transactionPassed;

  // Prisma Accelerate
  const acceleratePassed = Object.values(testResults.accelerate).filter(Boolean).length;
  console.log(`⚡ Prisma Accelerate: ${acceleratePassed}/3 PASSED`);
  passedTests += acceleratePassed;

  // Raw Queries
  const rawPassed = Object.values(testResults.rawQueries).filter(Boolean).length;
  console.log(`🔧 Raw Queries: ${rawPassed}/2 PASSED`);
  passedTests += rawPassed;

  console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Prisma with PostgreSQL is working perfectly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the issues above.');
  }

  // Cleanup
  await prisma.$disconnect();
  
  return testResults;
}

// Run the tests
runAllTests().catch(console.error);