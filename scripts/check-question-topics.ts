/**
 * Check if questions have topic field populated
 * Run: npx tsx scripts/check-question-topics.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking question topics...\n');

  // Get total count
  const totalQuestions = await prisma.question.count();
  console.log(`📊 Total questions: ${totalQuestions}\n`);

  // Get sample of 20 questions
  const questions = await prisma.question.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      topic: true,
      subject: true,
      grade: true,
      questionType: true,
      content: true,
    },
  });

  console.log('📋 Sample questions (newest 20):\n');
  console.log('─'.repeat(100));

  let withTopic = 0;
  let withoutTopic = 0;

  questions.forEach((q, i) => {
    const hasTopic = q.topic && q.topic.trim() !== '';
    if (hasTopic) withTopic++;
    else withoutTopic++;

    console.log(`\n${i + 1}. ${hasTopic ? '✅' : '❌'} Topic: "${q.topic || '(empty)'}"`);
    console.log(`   Subject: ${q.subject} | Grade: ${q.grade} | Type: ${q.questionType}`);
    console.log(`   Content: ${q.content.slice(0, 80)}...`);
  });

  console.log('\n' + '─'.repeat(100));
  console.log(`\n📈 Summary:`);
  console.log(`   ✅ With topic: ${withTopic}/${questions.length}`);
  console.log(`   ❌ Without topic: ${withoutTopic}/${questions.length}`);

  // Get topic distribution
  console.log('\n📚 Topic distribution (all questions):\n');
  
  const topicStats = await prisma.question.groupBy({
    by: ['topic'],
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: 30,
  });

  topicStats.forEach((stat, i) => {
    console.log(`   ${(i + 1).toString().padStart(2)}. ${stat.topic.padEnd(40)} → ${stat._count.id} questions`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
