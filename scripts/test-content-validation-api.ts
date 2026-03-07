/**
 * Test Script for Content Validation API
 * 
 * Tests:
 * 1. Validate a lesson
 * 2. Validate a quiz
 * 3. Validate slides
 * 4. Check curriculum compliance
 * 5. Check bias detection
 */

import { createContentValidator } from '../lib/ai/quality/content-validator';

async function testContentValidation() {
  console.log('🧪 Testing Content Validation API...\n');

  const validator = createContentValidator();

  // Test 1: Validate a lesson
  console.log('1️⃣ Validating a lesson...');
  const testLesson = {
    title: 'Phương trình bậc nhất một ẩn',
    objectives: [
      'Hiểu được khái niệm phương trình bậc nhất',
      'Biết cách giải phương trình bậc nhất',
      'Áp dụng vào giải bài toán thực tế',
    ],
    content: `# Phương trình bậc nhất một ẩn

## 1. Khái niệm

Phương trình bậc nhất một ẩn có dạng: ax + b = 0 (với a ≠ 0)

Ví dụ: 2x + 5 = 13

## 2. Cách giải

Bước 1: Chuyển số hạng tự do sang vế phải
2x = 13 - 5
2x = 8

Bước 2: Chia cả hai vế cho hệ số của x
x = 8 / 2
x = 4

## 3. Ứng dụng

Phương trình bậc nhất được ứng dụng trong nhiều bài toán thực tế như tính toán, kinh tế, vật lý.

## Tóm tắt

Phương trình bậc nhất là phương trình có dạng ax + b = 0, giải bằng cách chuyển vế và chia cho hệ số.`,
    keyPoints: [
      'Dạng tổng quát: ax + b = 0',
      'Cách giải: chuyển vế và chia',
      'Ứng dụng trong thực tế',
    ],
    exercises: [
      'Giải phương trình: 3x - 7 = 14',
      'Giải phương trình: 5x + 10 = 0',
      'Tìm x biết: 2x + 3 = 11',
    ],
    summary: 'Phương trình bậc nhất là nền tảng của đại số, giúp giải quyết nhiều bài toán thực tế.',
    duration: 45,
    difficulty: 'medium',
    grade: 'Khối 10',
    subject: 'Toán học',
  };

  try {
    const lessonValidation = await validator.validateLesson(testLesson, {
      subject: 'Toán học',
      grade: 'Khối 10',
      topic: 'Phương trình bậc nhất',
      curriculum: 'Vietnam GDPT 2018',
    });

    console.log('✅ Lesson validation completed');
    console.log(`   Overall Score: ${lessonValidation.score.overall}/100`);
    console.log(`   Can Publish: ${lessonValidation.canPublish}`);
    console.log(`   Curriculum Aligned: ${lessonValidation.curriculumCompliance.aligned}`);
    console.log(`   Bias Detected: ${lessonValidation.biasDetection.detected}`);
    console.log(`   Readability: ${lessonValidation.score.readability?.level || 'N/A'}`);
    console.log(`   Issues: ${lessonValidation.score.issues.length}`);
    console.log(`   Warnings: ${lessonValidation.warnings.length}`);
    console.log(`   Errors: ${lessonValidation.errors.length}\n`);

    if (lessonValidation.score.issues.length > 0) {
      console.log('   Issues:');
      lessonValidation.score.issues.slice(0, 3).forEach(issue => {
        console.log(`   - [${issue.severity}] ${issue.message}`);
      });
    }
  } catch (error: any) {
    console.error('❌ Error validating lesson:', error.message);
  }

  // Test 2: Validate a quiz
  console.log('\n2️⃣ Validating a quiz...');
  const testQuiz = {
    title: 'Quiz về phương trình bậc nhất',
    questions: [
      {
        question: 'Phương trình nào sau đây là phương trình bậc nhất?',
        type: 'MCQ',
        options: [
          'x² + 2x = 0',
          '2x + 5 = 13',
          '3x² - 1 = 0',
          'x³ + x = 5',
        ],
        correctAnswer: 1,
        explanation: 'Phương trình bậc nhất có dạng ax + b = 0, nên đáp án đúng là 2x + 5 = 13',
        difficulty: 'easy',
        tags: ['phương trình', 'bậc nhất'],
      },
      {
        question: 'Giải phương trình: 3x - 7 = 14',
        type: 'MCQ',
        options: ['x = 5', 'x = 6', 'x = 7', 'x = 8'],
        correctAnswer: 2,
        explanation: '3x - 7 = 14 => 3x = 21 => x = 7',
        difficulty: 'medium',
        tags: ['giải phương trình'],
      },
    ],
    metadata: {
      subject: 'Toán học',
      grade: 'Khối 10',
      topic: 'Phương trình bậc nhất',
    },
  };

  try {
    const quizValidation = await validator.validateQuiz(testQuiz, {
      subject: 'Toán học',
      grade: 'Khối 10',
      topic: 'Phương trình bậc nhất',
    });

    console.log('✅ Quiz validation completed');
    console.log(`   Overall Score: ${quizValidation.score.overall}/100`);
    console.log(`   Can Publish: ${quizValidation.canPublish}`);
    console.log(`   Issues: ${quizValidation.score.issues.length}\n`);
  } catch (error: any) {
    console.error('❌ Error validating quiz:', error.message);
  }

  // Test 3: Validate slides
  console.log('\n3️⃣ Validating slides...');
  const testSlides = {
    title: 'Phương trình bậc nhất',
    slides: [
      {
        title: 'Khái niệm',
        content: '• Phương trình bậc nhất có dạng ax + b = 0\n• Với a ≠ 0\n• Ví dụ: 2x + 5 = 13',
        speakerNotes: 'Giới thiệu khái niệm cơ bản',
      },
      {
        title: 'Cách giải',
        content: '• Bước 1: Chuyển vế\n• Bước 2: Chia cho hệ số\n• Ví dụ: 2x = 8 => x = 4',
        speakerNotes: 'Hướng dẫn từng bước giải',
      },
    ],
  };

  try {
    const slidesValidation = await validator.validateSlides(testSlides, {
      subject: 'Toán học',
      grade: 'Khối 10',
      topic: 'Phương trình bậc nhất',
    });

    console.log('✅ Slides validation completed');
    console.log(`   Overall Score: ${slidesValidation.score.overall}/100`);
    console.log(`   Can Publish: ${slidesValidation.canPublish}\n`);
  } catch (error: any) {
    console.error('❌ Error validating slides:', error.message);
  }

  console.log('🎉 All validation tests completed!');
}

// Run tests
testContentValidation().catch(console.error);
