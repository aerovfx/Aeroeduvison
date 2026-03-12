/**
 * Knowledge Graph Seed Data
 * Initialize test concepts and relationships for demonstration
 * 
 * Run: npx ts-node lib/kg/seed.ts
 */

import { prisma } from "@/lib/prisma";
import { createConceptWithEmbedding, createRelationship, createLearningObjectives } from "@/lib/kg/embeddings";

const SAMPLE_CONCEPTS = [
  // Grade 9-10: Algebra
  {
    name: "Số Nguyên",
    description: "Khái niệm về tập hợp số nguyên (integers)",
    subject: "math",
    grade: "9",
    difficulty: "easy",
    definition: "Tập hợp các số bao gồm số nguyên dương, số 0, và số nguyên âm",
    examples: ["-5, -1, 0, 1, 5, 100"],
    keyPoints: [
      "Số nguyên không có phần thập phân",
      "Bao gồm cả số âm và số dương",
      "Trên trục số: bên trái số 0 là âm, bên phải là dương",
    ],
    relatedTopics: ["Số hữu tỷ", "Phép cộng số nguyên", "Phép trừ số nguyên"],
  },
  {
    name: "Phương Trình Bậc Nhất",
    description: "Phương trình có bậc 1 với một ẩn",
    subject: "math",
    grade: "9",
    difficulty: "medium",
    definition: "Phương trình có dạng ax + b = 0 (a ≠ 0)",
    examples: ["2x + 5 = 11", "3x - 7 = 2", "-x + 4 = 1"],
    keyPoints: [
      "Có một ẩn số",
      "Ẩn số có bậc 1",
      "Có một nghiệm duy nhất (khi a ≠ 0)",
      "Phương pháp: Chuyển vế, kết hợp hạng tử",
    ],
    relatedTopics: ["Phương trình", "Bất đẳng thức", "Hệ phương trình"],
  },
  {
    name: "Phương Trình Bậc Hai",
    description: "Phương trình có dạng ax² + bx + c = 0",
    subject: "math",
    grade: "10",
    difficulty: "hard",
    definition: "Phương trình đa thức bậc 2 với một ẩn (a ≠ 0)",
    examples: ["x² - 5x + 6 = 0", "2x² + 3x - 2 = 0"],
    keyPoints: [
      "Ẩn số có bậc cao nhất là 2",
      "Công thức Delta (Δ) = b² - 4ac",
      "Số nghiệm phụ thuộc vào dấu của Δ",
      "Công thức Vieta cho tổng và tích nghiệm",
    ],
    relatedTopics: ["Phương trình bậc nhất", "Tam thức bậc hai", "Hàm số bậc hai"],
  },
  {
    name: "Hàm Số Bậc Hai",
    description: "Hàm số có biểu thức y = ax² + bx + c",
    subject: "math",
    grade: "10",
    difficulty: "hard",
    definition: "Hàm số biểu diễn bằng đa thức bậc 2 của biến x",
    examples: ["y = x²", "y = 2x² - 3x + 1", "y = -x² + 4x - 3"],
    keyPoints: [
      "Đồ thị là một parabol",
      "Có trục đối xứng x = -b/2a",
      "Đỉnh parabol (x, y) với x = -b/2a",
      "Hướng parabol (lên hoặc xuống) phụ thuộc vào dấu a",
    ],
    relatedTopics: ["Phương trình bậc hai", "Đồ thị hàm số", "Hàm số"],
  },
  {
    name: "Căn Bậc Hai",
    description: "Phép toán ngược của bình phương",
    subject: "math",
    grade: "9",
    difficulty: "medium",
    definition: "√a là số x sao cho x² = a (a ≥ 0)",
    examples: ["√9 = 3", "√16 = 4", "√2 ≈ 1.414"],
    keyPoints: [
      "Căn bậc hai của số dương luôn dương",
      "Căn bậc hai của 0 là 0",
      "Một số chính phương có căn bậc hai là số nguyên",
    ],
    relatedTopics: ["Lũy thừa", "Những phương trình chứa căn", "Số vô tỷ"],
  },
  {
    name: "Logarit",
    description: "Phép toán ngược của phép lũy thừa",
    subject: "math",
    grade: "11",
    difficulty: "hard",
    definition: "log_a(x) = y ⟺ a^y = x (a > 0, a ≠ 1, x > 0)",
    examples: ["log₂(8) = 3 vì 2³ = 8", "log₁₀(100) = 2"],
    keyPoints: [
      "Logarit là phép tính ngược lũy thừa",
      "Cơ số a phải dương và khác 1",
      "x (đối số) phải dương",
      "Logarit thập phân (log₁₀): dùng trong khoa học",
      "Logarit tự nhiên (ln): dùng trong tính toán cao cấp",
    ],
    relatedTopics: [
      "Lũy thừa",
      "Hàm số logarit",
      "Phương trình lũy thừa",
      "Chỉnh hợp",
    ],
  },
];

const SAMPLE_RELATIONSHIPS = [
  // Số Nguyên → Phương Trình Bậc Nhất
  {
    source: "Số Nguyên",
    target: "Phương Trình Bậc Nhất",
    type: "prerequisite" as const,
    description: "Phải hiểu số nguyên trước khi giải phương trình bậc nhất",
    strength: 0.9,
  },
  // Phương Trình Bậc Nhất → Phương Trình Bậc Hai
  {
    source: "Phương Trình Bậc Nhất",
    target: "Phương Trình Bậc Hai",
    type: "prerequisite" as const,
    description: "Nền tảng để hiểu các phương trình bậc cao hơn",
    strength: 0.85,
  },
  // Phương Trình Bậc Hai → Hàm Số Bậc Hai
  {
    source: "Phương Trình Bậc Hai",
    target: "Hàm Số Bậc Hai",
    type: "related" as const,
    description: "Nghiệm của phương trình chính là giao điểm với trục x",
    strength: 0.9,
  },
  // Căn Bậc Hai → Phương Trình Bậc Hai
  {
    source: "Căn Bậc Hai",
    target: "Phương Trình Bậc Hai",
    type: "related" as const,
    description: "Công thức nghiệm sử dụng căn bậc hai",
    strength: 0.8,
  },
  // Lũy Thừa → Logarit
  {
    source: "Lũy Thừa",
    target: "Logarit",
    type: "prerequisite" as const,
    description: "Logarit là phép toán ngược của lũy thừa",
    strength: 0.95,
  },
];

/**
 * Seeds database with sample concepts
 */
async function seedKnowledgeGraph() {
  console.log("🌱 Seeding Knowledge Graph...");

  try {
    // Clear existing data (optional)
    // await prisma.kgConcept.deleteMany({});
    // await prisma.kgRelationship.deleteMany({});

    // Create concepts
    console.log("📚 Creating concepts...");
    const createdConcepts: Record<string, any> = {};

    for (const concept of SAMPLE_CONCEPTS) {
      try {
        const created = await createConceptWithEmbedding({
          name: concept.name,
          description: concept.description,
          subject: concept.subject,
          grade: concept.grade,
          difficulty: concept.difficulty,
          definition: concept.definition,
          examples: concept.examples.split(", "),
          keyPoints: concept.keyPoints,
          relatedTopics: concept.relatedTopics,
        });

        createdConcepts[concept.name] = created;
        console.log(`  ✓ Created: ${concept.name}`);

        // Create learning objectives
        const objectives = [
          {
            objective: `Hiểu được định nghĩa của ${concept.name}`,
            difficulty: "remember" as const,
          },
          {
            objective: `Có thể giải thích ${concept.name} bằng lời`,
            difficulty: "understand" as const,
          },
          {
            objective: `Áp dụng ${concept.name} vào bài toán thực tế`,
            difficulty: "apply" as const,
          },
        ];

        await createLearningObjectives(created.id, objectives);
      } catch (error) {
        console.error(`  ✗ Failed to create ${concept.name}:`, error);
      }
    }

    // Create relationships
    console.log("🔗 Creating relationships...");
    for (const rel of SAMPLE_RELATIONSHIPS) {
      try {
        const sourceId = createdConcepts[rel.source]?.id;
        const targetId = createdConcepts[rel.target]?.id;

        if (!sourceId || !targetId) {
          console.warn(
            `  ⚠ Skipping relationship: ${rel.source} → ${rel.target} (concept not found)`
          );
          continue;
        }

        await createRelationship({
          sourceId,
          targetId,
          type: rel.type,
          description: rel.description,
          strength: rel.strength,
        });

        console.log(
          `  ✓ Created: ${rel.source} → ${rel.target} (${rel.type})`
        );
      } catch (error) {
        console.error(`  ✗ Failed to create relationship:`, error);
      }
    }

    console.log("\n✅ Knowledge Graph seed completed!");
    console.log(`   Created ${Object.keys(createdConcepts).length} concepts`);

    // Print statistics
    const allConcepts = await prisma.kgConcept.findMany();
    const allRelationships = await prisma.kgRelationship.findMany();

    console.log(`\n📊 Statistics:`);
    console.log(`   Total concepts: ${allConcepts.length}`);
    console.log(`   Total relationships: ${allRelationships.length}`);
    console.log(`   Subjects: ${[...new Set(allConcepts.map((c) => c.subject))].join(", ")}`);
    console.log(`   Grades: ${[...new Set(allConcepts.map((c) => c.grade))].join(", ")}`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeder if directly executed
if (require.main === module) {
  seedKnowledgeGraph();
}

export { seedKnowledgeGraph };
