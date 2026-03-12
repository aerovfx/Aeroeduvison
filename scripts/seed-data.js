/**
 * Quick Database Seeding Script
 * For KG and Grading data population
 * Run: node scripts/seed-data.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedKG() {
  console.log('\n🌱 Seeding Knowledge Graph...\n');

  try {
    // Create sample concepts
    const conceptsData = [
      {
        name: 'Số Nguyên',
        description: 'Khái niệm về tập hợp số nguyên (integers)',
        subject: 'math',
        grade: '9',
        difficulty: 'easy',
        examples: ['-5, -1, 0, 1, 5, 100'],
        keyPoints: [
          'Số nguyên không có phần thập phân',
          'Bao gồm cả số âm và số dương'
        ]
      },
      {
        name: 'Phương Trình Bậc Nhất',
        description: 'Phương trình có bậc 1 với một ẩn',
        subject: 'math',
        grade: '9',
        difficulty: 'medium',
        examples: ['2x + 5 = 11', '3x - 7 = 2'],
        keyPoints: ['Có một ẩn số', 'Ẩn số có bậc 1']
      },
      {
        name: 'Phương Trình Bậc Hai',
        description: 'Phương trình có dạng ax² + bx + c = 0',
        subject: 'math',
        grade: '10',
        difficulty: 'hard',
        examples: ['x² - 5x + 6 = 0', '2x² + 3x - 2 = 0'],
        keyPoints: [
          'Ẩn số có bậc cao nhất là 2',
          'Công thức Delta (Δ) = b² - 4ac'
        ]
      },
      {
        name: 'Hàm Số Bậc Hai',
        description: 'Hàm số có biểu thức y = ax² + bx + c',
        subject: 'math',
        grade: '10',
        difficulty: 'hard',
        examples: ['y = x²', 'y = 2x² - 3x + 1'],
        keyPoints: ['Đồ thị là một parabol', 'Có trục đối xứng x = -b/2a']
      },
      {
        name: 'Căn Bậc Hai',
        description: 'Phép toán ngược của bình phương',
        subject: 'math',
        grade: '9',
        difficulty: 'medium',
        examples: ['√9 = 3', '√16 = 4', '√2 ≈ 1.414'],
        keyPoints: [
          'Căn bậc hai của số dương luôn dương',
          'Căn bậc hai của 0 là 0'
        ]
      },
      {
        name: 'Logarit',
        description: 'Phép toán ngược của phép lũy thừa',
        subject: 'math',
        grade: '11',
        difficulty: 'hard',
        examples: ['log₂(8) = 3 vì 2³ = 8', 'log₁₀(100) = 2'],
        keyPoints: [
          'Logarit là phép tính ngược lũy thừa',
          'log_a(x) = y ⟺ a^y = x'
        ]
      }
    ];

    // Create concepts
    const createdConcepts = [];
    for (const conceptData of conceptsData) {
      const existing = await prisma.kgConcept.findUnique({
        where: { name: conceptData.name }
      });

      if (!existing) {
        const concept = await prisma.kgConcept.create({
          data: {
            name: conceptData.name,
            description: conceptData.description,
            subject: conceptData.subject,
            grade: conceptData.grade,
            difficulty: conceptData.difficulty,
            examples: conceptData.examples || [],
            keyPoints: conceptData.keyPoints || [],
            relatedTopics: []
          }
        });
        createdConcepts.push(concept);
        console.log(`✅ Created concept: ${concept.name}`);
      } else {
        console.log(`⏭️  Concept already exists: ${conceptData.name}`);
        createdConcepts.push(existing);
      }
    }

    // Create relationships between concepts
    const relationships = [
      { sourceIndex: 0, targetIndex: 1, type: 'prerequisite', strength: 0.9 },
      { sourceIndex: 1, targetIndex: 2, type: 'prerequisite', strength: 0.85 },
      { sourceIndex: 2, targetIndex: 3, type: 'related', strength: 0.8 },
      { sourceIndex: 4, targetIndex: 2, type: 'related', strength: 0.75 },
      { sourceIndex: 2, targetIndex: 5, type: 'prerequisite', strength: 0.7 }
    ];

    for (const rel of relationships) {
      if (createdConcepts[rel.sourceIndex] && createdConcepts[rel.targetIndex]) {
        const existing = await prisma.kgRelationship.findUnique({
          where: {
            sourceId_targetId: {
              sourceId: createdConcepts[rel.sourceIndex].id,
              targetId: createdConcepts[rel.targetIndex].id
            }
          }
        });

        if (!existing) {
          const relationship = await prisma.kgRelationship.create({
            data: {
              sourceId: createdConcepts[rel.sourceIndex].id,
              targetId: createdConcepts[rel.targetIndex].id,
              type: rel.type,
              strength: rel.strength,
              description: `${createdConcepts[rel.sourceIndex].name} → ${createdConcepts[rel.targetIndex].name}`
            }
          });
          console.log(
            `✅ Created relationship: ${createdConcepts[rel.sourceIndex].name} → ${createdConcepts[rel.targetIndex].name}`
          );
        }
      }
    }

    console.log(
      `\n✅ Knowledge Graph seeded! Total concepts: ${createdConcepts.length}`
    );
  } catch (error) {
    console.error('❌ Error seeding KG:', error.message);
  }
}

async function seedGradingRubric() {
  console.log('\n🎓 Seeding Grading Rubric...\n');

  try {
    // Get a user to assign the rubric to
    const user = await prisma.user.findFirst();

    if (!user) {
      console.warn(
        '⚠️  No users found. Create a user first before seeding rubric.'
      );
      return;
    }

    // Create rubric
    const existingRubric = await prisma.gradingRubric.findFirst({
      where: { name: 'Math Essay - Logarithms' }
    });

    if (existingRubric) {
      console.log('⏭️  Rubric already exists: Math Essay - Logarithms');
      return;
    }

    const rubric = await prisma.gradingRubric.create({
      data: {
        name: 'Math Essay - Logarithms',
        description:
          'Rubric for grading essays on logarithmic functions and applications',
        subject: 'math',
        grade: '11',
        createdBy: user.id,
        maxScore: 100,
        minPassingScore: 60,
        criteria: {
          create: [
            {
              criterion: 'Hiểu Khái Niệm',
              description: 'Học sinh hiểu rõ khái niệm logarit',
              maxPoints: 25,
              weight: 1,
              order: 1
            },
            {
              criterion: 'Giải Thích & Ví Dụ',
              description: 'Giải thích chính xác với ví dụ cụ thể',
              maxPoints: 25,
              weight: 1,
              order: 2
            },
            {
              criterion: 'Tính Toán Chính Xác',
              description: 'Các phép tính logarit chính xác',
              maxPoints: 25,
              weight: 1,
              order: 3
            },
            {
              criterion: 'Cấu Trúc & Trình Bày',
              description: 'Bài viết có cấu trúc logic, dễ hiểu',
              maxPoints: 25,
              weight: 1,
              order: 4
            }
          ]
        }
      }
    });

    console.log(`✅ Created rubric: ${rubric.name}`);
    console.log(`   ID: ${rubric.id}`);
    console.log(`   Category: ${rubric.subject}/${rubric.grade}`);
    console.log(`   Max Score: ${rubric.maxScore}`);
    console.log(`   Criteria: 4`);
  } catch (error) {
    console.error('❌ Error seeding rubric:', error.message);
  }
}

async function main() {
  console.log('═════════════════════════════════════════');
  console.log('Database Seeding Script');
  console.log('═════════════════════════════════════════');

  try {
    await seedKG();
    await seedGradingRubric();

    console.log('\n═════════════════════════════════════════');
    console.log('✅ Seeding complete!');
    console.log('═════════════════════════════════════════\n');
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
