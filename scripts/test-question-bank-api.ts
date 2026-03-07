/**
 * Test Script for Question Bank API
 * 
 * Tests:
 * 1. Create a question
 * 2. List questions
 * 3. Get question detail
 * 4. Delete question
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testQuestionBankAPI() {
  console.log('🧪 Testing Question Bank API...\n');

  try {
    // Test 1: Check if Question model exists
    console.log('1️⃣ Checking Question model...');
    if (!prisma.question) {
      console.error('❌ Question model not found. Please run: npx prisma generate');
      return;
    }
    console.log('✅ Question model exists\n');

    // Test 2: Create a test question
    console.log('2️⃣ Creating test question...');
    const testQuestion = {
      topic: 'Phương trình bậc nhất',
      subject: 'Toán học',
      grade: 'Khối 10',
      questionType: 'MCQ',
      difficulty: 'MEDIUM',
      content: 'Giải phương trình: 2x + 5 = 13',
      options: ['x = 4', 'x = 5', 'x = 6', 'x = 7'],
      correctAnswer: '0', // Index 0
      explanation: 'Ta có: 2x + 5 = 13 => 2x = 8 => x = 4',
      learningObjectives: ['Hiểu cách giải phương trình bậc nhất', 'Áp dụng quy tắc chuyển vế'],
      keywords: ['phương trình', 'bậc nhất', 'đại số'],
      tags: ['phương trình', 'bậc nhất', 'đại số'],
      status: 'Nháp',
      aiGenerated: false,
      humanReviewed: false,
      createdBy: 'test-user-id', // Replace with actual user ID
    };

    try {
      const created = await prisma.question.create({
        data: testQuestion,
      });
      console.log('✅ Question created successfully!');
      console.log(`   ID: ${created.id}`);
      console.log(`   Content: ${created.content.substring(0, 50)}...\n`);

      // Test 3: List questions
      console.log('3️⃣ Listing questions...');
      const questions = await prisma.question.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
      console.log(`✅ Found ${questions.length} questions\n`);

      // Test 4: Get question detail
      console.log('4️⃣ Getting question detail...');
      const questionDetail = await prisma.question.findUnique({
        where: { id: created.id },
      });
      if (questionDetail) {
        console.log('✅ Question detail retrieved');
        console.log(`   Subject: ${questionDetail.subject}`);
        console.log(`   Grade: ${questionDetail.grade}`);
        console.log(`   Type: ${questionDetail.questionType}`);
        console.log(`   Difficulty: ${questionDetail.difficulty}\n`);
      }

      // Test 5: Search questions
      console.log('5️⃣ Searching questions...');
      const searchResults = await prisma.question.findMany({
        where: {
          OR: [
            { content: { contains: 'phương trình', mode: 'insensitive' } },
            { subject: { contains: 'Toán', mode: 'insensitive' } },
          ],
        },
        take: 5,
      });
      console.log(`✅ Found ${searchResults.length} matching questions\n`);

      // Test 6: Update question
      console.log('6️⃣ Updating question...');
      const updated = await prisma.question.update({
        where: { id: created.id },
        data: {
          status: 'Đã duyệt',
          humanReviewed: true,
        },
      });
      console.log(`✅ Question updated. Status: ${updated.status}\n`);

      // Test 7: Get statistics
      console.log('7️⃣ Getting statistics...');
      const stats = {
        total: await prisma.question.count(),
        bySubject: await prisma.question.groupBy({
          by: ['subject'],
          _count: true,
        }),
        byDifficulty: await prisma.question.groupBy({
          by: ['difficulty'],
          _count: true,
        }),
        byType: await prisma.question.groupBy({
          by: ['questionType'],
          _count: true,
        }),
      };
      console.log('✅ Statistics:');
      console.log(`   Total questions: ${stats.total}`);
      console.log(`   By subject: ${stats.bySubject.length} subjects`);
      console.log(`   By difficulty: ${stats.byDifficulty.length} levels`);
      console.log(`   By type: ${stats.byType.length} types\n`);

      // Test 8: Delete test question (optional)
      console.log('8️⃣ Cleaning up test question...');
      await prisma.question.delete({
        where: { id: created.id },
      });
      console.log('✅ Test question deleted\n');

      console.log('🎉 All tests passed!');
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      if (error.code === 'P2002') {
        console.log('   (Duplicate entry - question may already exist)');
      } else if (error.code === 'P2025') {
        console.log('   (Record not found)');
      }
    }
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    if (error.message?.includes('Cannot read properties of undefined')) {
      console.log('\n💡 Solution: Run "npx prisma generate" first');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testQuestionBankAPI().catch(console.error);
