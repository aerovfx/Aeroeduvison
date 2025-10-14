/**
 * Test script for AI Content Generator
 * 
 * Usage: npm run test:ai-generator
 * Or: tsx scripts/test-ai-generator.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

async function testAPIEndpoint() {
  console.log('\n🧪 Testing AI Content Generator API...\n');

  const testCases = [
    {
      name: 'Generate Lesson',
      payload: {
        type: 'lesson',
        subject: 'Toán học',
        grade: '9',
        topic: 'Phương trình bậc hai',
        difficulty: 'medium',
        duration: 45,
      }
    },
    {
      name: 'Generate Quiz',
      payload: {
        type: 'quiz',
        subject: 'Vật lý',
        grade: '10',
        topic: 'Định luật Newton',
        difficulty: 'easy',
        duration: 30,
      }
    },
    {
      name: 'Generate Slides',
      payload: {
        type: 'slides',
        subject: 'Hóa học',
        grade: '11',
        topic: 'Phản ứng oxi hóa khử',
        difficulty: 'medium',
        duration: 40,
      }
    },
  ];

  for (const testCase of testCases) {
    const startTime = Date.now();
    try {
      console.log(`Testing: ${testCase.name}...`);
      
      const response = await fetch('http://localhost:3000/api/ai-content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.payload),
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      if (response.ok && data.success) {
        results.push({
          test: testCase.name,
          status: 'PASS',
          message: `Generated successfully in ${duration}ms`,
          duration,
        });
        console.log(`✅ ${testCase.name}: PASS (${duration}ms)`);
        console.log(`   Title: ${data.data.title}`);
        console.log(`   Content length: ${data.data.content?.length || 0} chars`);
        if (data.data.quiz) {
          console.log(`   Quiz questions: ${data.data.quiz.questions.length}`);
        }
        if (data.data.slides) {
          console.log(`   Slides count: ${data.data.slides.length}`);
        }
      } else {
        results.push({
          test: testCase.name,
          status: 'FAIL',
          message: data.message || data.error || 'Unknown error',
          duration,
        });
        console.log(`❌ ${testCase.name}: FAIL`);
        console.log(`   Error: ${data.message || data.error}`);
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      results.push({
        test: testCase.name,
        status: 'FAIL',
        message: error.message,
        duration,
      });
      console.log(`❌ ${testCase.name}: FAIL`);
      console.log(`   Error: ${error.message}`);
    }
    console.log('');
  }
}

async function testAPIInfo() {
  console.log('\n🔍 Testing API Info Endpoint...\n');

  try {
    const response = await fetch('http://localhost:3000/api/ai-content/generate');
    const data = await response.json();

    if (response.ok && data.status === 'active') {
      results.push({
        test: 'API Info Endpoint',
        status: 'PASS',
        message: 'API is active and responding',
      });
      console.log('✅ API Info: PASS');
      console.log(`   Name: ${data.name}`);
      console.log(`   Version: ${data.version}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Features: ${data.features?.length || 0}`);
    } else {
      results.push({
        test: 'API Info Endpoint',
        status: 'FAIL',
        message: 'API not responding correctly',
      });
      console.log('❌ API Info: FAIL');
    }
  } catch (error: any) {
    results.push({
      test: 'API Info Endpoint',
      status: 'FAIL',
      message: error.message,
    });
    console.log(`❌ API Info: FAIL - ${error.message}`);
  }
}

async function testDatabaseModel() {
  console.log('\n🗄️ Testing Database Model...\n');

  try {
    // Test creating a record
    const testContent = await prisma.aIGeneratedContent.create({
      data: {
        userId: 'test-user-id',
        type: 'lesson',
        title: 'Test Lesson',
        content: JSON.stringify({ test: 'data' }),
        subject: 'Toán học',
        grade: '9',
        topic: 'Test Topic',
        curriculum: 'GDPT 2018',
        difficulty: 'medium',
        estimatedDuration: 45,
        status: 'draft',
      }
    });

    console.log('✅ Create: PASS');
    console.log(`   Created record ID: ${testContent.id}`);

    // Test reading
    const found = await prisma.aIGeneratedContent.findUnique({
      where: { id: testContent.id }
    });

    if (found) {
      console.log('✅ Read: PASS');
      results.push({
        test: 'Database Model - Create/Read',
        status: 'PASS',
        message: 'Successfully created and read record',
      });
    } else {
      throw new Error('Failed to read created record');
    }

    // Test updating
    await prisma.aIGeneratedContent.update({
      where: { id: testContent.id },
      data: { usageCount: 5, rating: 4.5 }
    });

    console.log('✅ Update: PASS');

    // Test deleting
    await prisma.aIGeneratedContent.delete({
      where: { id: testContent.id }
    });

    console.log('✅ Delete: PASS');

    results.push({
      test: 'Database Model - Full CRUD',
      status: 'PASS',
      message: 'All CRUD operations work correctly',
    });

  } catch (error: any) {
    results.push({
      test: 'Database Model',
      status: 'FAIL',
      message: error.message,
    });
    console.log(`❌ Database Model: FAIL - ${error.message}`);
  }
}

async function testValidation() {
  console.log('\n✅ Testing Input Validation...\n');

  const invalidCases = [
    {
      name: 'Missing type',
      payload: { subject: 'Math', grade: '9', topic: 'Test' }
    },
    {
      name: 'Missing subject',
      payload: { type: 'lesson', grade: '9', topic: 'Test' }
    },
    {
      name: 'Missing grade',
      payload: { type: 'lesson', subject: 'Math', topic: 'Test' }
    },
    {
      name: 'Missing topic',
      payload: { type: 'lesson', subject: 'Math', grade: '9' }
    },
  ];

  for (const testCase of invalidCases) {
    try {
      const response = await fetch('http://localhost:3000/api/ai-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.payload),
      });

      if (response.status === 400) {
        console.log(`✅ ${testCase.name}: Correctly rejected`);
        results.push({
          test: `Validation - ${testCase.name}`,
          status: 'PASS',
          message: 'Invalid input correctly rejected',
        });
      } else {
        console.log(`❌ ${testCase.name}: Should be rejected but got ${response.status}`);
        results.push({
          test: `Validation - ${testCase.name}`,
          status: 'FAIL',
          message: `Expected 400, got ${response.status}`,
        });
      }
    } catch (error: any) {
      results.push({
        test: `Validation - ${testCase.name}`,
        status: 'FAIL',
        message: error.message,
      });
      console.log(`❌ ${testCase.name}: ${error.message}`);
    }
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed/total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.test}`);
      console.log(`     ${r.message}`);
    });
    console.log('');
  }

  // Performance stats
  const apiTests = results.filter(r => r.duration);
  if (apiTests.length > 0) {
    const avgDuration = apiTests.reduce((sum, r) => sum + (r.duration || 0), 0) / apiTests.length;
    const maxDuration = Math.max(...apiTests.map(r => r.duration || 0));
    const minDuration = Math.min(...apiTests.map(r => r.duration || 0));

    console.log('⚡ Performance Stats:');
    console.log(`  Average Response Time: ${avgDuration.toFixed(0)}ms`);
    console.log(`  Fastest: ${minDuration}ms`);
    console.log(`  Slowest: ${maxDuration}ms`);
    console.log('');
  }

  console.log('='.repeat(60) + '\n');
}

async function main() {
  console.log('🤖 AI Content Generator Test Suite');
  console.log('='.repeat(60));

  try {
    // Run all tests
    await testAPIInfo();
    await testDatabaseModel();
    await testValidation();
    await testAPIEndpoint();

    // Print summary
    printSummary();

    // Exit with appropriate code
    const failed = results.filter(r => r.status === 'FAIL').length;
    process.exit(failed > 0 ? 1 : 0);

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
main();

