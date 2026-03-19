
import { calculateTotalScore, AnswerKey, StudentSubmission } from '../lib/grading/grading-logic';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

const mockKey: AnswerKey = {
  partI: {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
    10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0, 17: 0, 18: 0
  },
  partII: {
    1: { a: true, b: true, c: true, d: true },
    2: { a: true, b: true, c: true, d: true },
    3: { a: true, b: true, c: true, d: true },
    4: { a: true, b: true, c: true, d: true }
  },
  partIII: {
    1: "10", 2: "20", 3: "30", 4: "40", 5: "50", 6: "60"
  }
};

function testPerfectScore() {
  const submission: StudentSubmission = {
    partI: { ...mockKey.partI },
    partII: { ...mockKey.partII },
    partIII: { ...mockKey.partIII },
    essayScore: 0
  };

  const result = calculateTotalScore(submission, mockKey);
  // Part I: 18 * 0.25 = 4.5
  // Part II: 4 * 1.0 = 4.0
  // Part III: 6 * 0.25 = 1.5
  // Total: 10.0
  assert(result.partI === 4.5, "Part I perfect score should be 4.5");
  assert(result.partII === 4.0, "Part II perfect score should be 4.0");
  assert(result.partIII === 1.5, "Part III perfect score should be 1.5");
  assert(result.total === 10, "Total perfect score should be 10.0");
}

function testPartIIScoring() {
  // 1 correct: 0.1
  // 2 correct: 0.25
  // 3 correct: 0.5
  // 4 correct: 1.0
  const submission: StudentSubmission = {
    partI: {},
    partII: {
      1: { a: true, b: false, c: false, d: false }, // 1 correct -> 0.1
      2: { a: true, b: true, c: false, d: false },  // 2 correct -> 0.25
      3: { a: true, b: true, c: true, d: false },   // 3 correct -> 0.5
      4: { a: true, b: true, c: true, d: true }     // 4 correct -> 1.0
    },
    partIII: {},
    essayScore: 0
  };

  const result = calculateTotalScore(submission, mockKey);
  const expectedP2 = 0.1 + 0.25 + 0.5 + 1.0; // 1.85
  assert(result.partII === 1.85, `Part II partial scoring should be 1.85, got ${result.partII}`);
}

function testEssayAndCap() {
  const submission: StudentSubmission = {
    partI: { ...mockKey.partI },
    partII: { ...mockKey.partII },
    partIII: { ...mockKey.partIII },
    essayScore: 2.0
  };

  const result = calculateTotalScore(submission, mockKey);
  assert(result.total === 10, "Total score should be capped at 10.0 even with essay");
}

console.log("🚀 Starting Grading Logic Tests...");
try {
  testPerfectScore();
  testPartIIScoring();
  testEssayAndCap();
  console.log("✨ All tests passed!");
} catch (error) {
  console.error("❌ Test failed!");
  console.error((error as Error).message);
  process.exit(1);
}
