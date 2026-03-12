/**
 * Database Verification Script
 * Verify seed data exists and is queryable
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyData() {
  console.log('\n📊 Database Verification\n');

  try {
    // Check KG concepts
    const conceptCount = await prisma.kgConcept.count();
    const concepts = await prisma.kgConcept.findMany({ take: 3 });

    console.log(`📚 Knowledge Graph Concepts:`);
    console.log(`   Total: ${conceptCount}`);
    if (concepts.length > 0) {
      concepts.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.name} (${c.grade}年 - ${c.difficulty})`);
      });
    }
    console.log('');

    // Check KG relationships
    const relationshipCount = await prisma.kgRelationship.count();
    const relationships = await prisma.kgRelationship.findMany({ take: 2 });

    console.log(`🔗 Knowledge Graph Relationships:`);
    console.log(`   Total: ${relationshipCount}`);
    if (relationships.length > 0) {
      for (const rel of relationships) {
        const source = await prisma.kgConcept.findUnique({
          where: { id: rel.sourceId }
        });
        const target = await prisma.kgConcept.findUnique({
          where: { id: rel.targetId }
        });
        console.log(
          `   • ${source?.name} → ${target?.name} (${rel.type})`
        );
      }
    }
    console.log('');

    // Check grading rubrics
    const rubricCount = await prisma.gradingRubric.count();
    const rubrics = await prisma.gradingRubric.findMany({ take: 2 });

    console.log(`📋 Grading Rubrics:`);
    console.log(`   Total: ${rubricCount}`);
    if (rubrics.length > 0) {
      for (const rubric of rubrics) {
        const criteriaCount = await prisma.rubricCriterion.count({
          where: { rubricId: rubric.id }
        });
        console.log(
          `   • ${rubric.name} (${rubric.grade}年, ${rubric.subject}, ${criteriaCount} criteria)`
        );
      }
    }
    console.log('');

    // Check grading criteria
    const criteriaCount = await prisma.rubricCriterion.count();
    console.log(`📊 Grading Criteria:`);
    console.log(`   Total: ${criteriaCount}`);
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════════════');
    console.log('✅ Database Verification Complete');
    console.log('═══════════════════════════════════════════════');
    console.log(`   ✅ KG Concepts: ${conceptCount}`);
    console.log(`   ✅ KG Relationships: ${relationshipCount}`);
    console.log(`   ✅ Grading Rubrics: ${rubricCount}`);
    console.log(`   ✅ Grading Criteria: ${criteriaCount}`);
    console.log('═══════════════════════════════════════════════\n');

    if (conceptCount === 0) {
      console.log(
        '⚠️  No concepts found. Run: node scripts/seed-data.js\n'
      );
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyData();
