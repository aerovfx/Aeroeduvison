import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { lessonId, lessonContent, answers } = await request.json();

    // TODO: Call actual AI API to grade answers (especially essays)
    // For now, use rule-based grading
    
    const results = gradeAnswers(lessonContent, answers);

    return NextResponse.json({ 
      success: true,
      results 
    });

  } catch (error) {
    console.error('Error grading lesson:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to grade lesson' },
      { status: 500 }
    );
  }
}

function gradeAnswers(lessonContent: any, answers: any[]): any {
  let totalScore = 0;
  let maxScore = 0;
  const gradedAnswers: any[] = [];

  lessonContent.exercises.forEach((exercise: any, index: number) => {
    maxScore += exercise.points;
    const studentAnswer = answers.find((a: any) => a.exerciseIndex === index);
    
    if (!studentAnswer) {
      gradedAnswers.push({
        exerciseIndex: index,
        answer: '',
        score: 0,
        feedback: 'Chưa trả lời câu hỏi này.'
      });
      return;
    }

    let score = 0;
    let feedback = '';

    if (exercise.type === 'multiple_choice') {
      const isCorrect = studentAnswer.answer === exercise.correctAnswer;
      score = isCorrect ? exercise.points : 0;
      feedback = isCorrect 
        ? '✅ Chính xác! Bạn đã hiểu rất tốt.' 
        : `❌ Chưa đúng. Đáp án đúng là: ${exercise.options[exercise.correctAnswer]}`;
    } 
    else if (exercise.type === 'short_answer') {
      // Simple keyword-based grading (AI would do better)
      const answer = String(studentAnswer.answer).toLowerCase();
      const hasContent = answer.length > 10;
      score = hasContent ? exercise.points * 0.8 : exercise.points * 0.3;
      feedback = hasContent
        ? '✅ Câu trả lời của bạn đã đề cập đến các ý chính. Tuy nhiên, hãy cố gắng giải thích chi tiết hơn.'
        : '⚠️ Câu trả lời còn quá ngắn. Hãy trình bày đầy đủ hơn.';
    }
    else if (exercise.type === 'essay') {
      // AI grading simulation
      const answer = String(studentAnswer.answer);
      const wordCount = answer.split(/\s+/).length;
      const hasStructure = answer.includes('\n') || answer.length > 200;
      
      if (wordCount < 30) {
        score = exercise.points * 0.3;
        feedback = '📝 Bài làm quá ngắn. Cần trình bày chi tiết hơn ít nhất 50 từ.';
      } else if (wordCount < 50) {
        score = exercise.points * 0.6;
        feedback = '📝 Bài làm cần bổ sung thêm chi tiết và ví dụ minh họa.';
      } else {
        score = hasStructure ? exercise.points * 0.9 : exercise.points * 0.75;
        feedback = hasStructure
          ? '✅ Bài làm tốt! Bạn đã trình bày có cấu trúc và đầy đủ nội dung.'
          : '✅ Nội dung tốt, nhưng nên chia thành các đoạn văn rõ ràng hơn.';
      }
    }

    totalScore += score;
    gradedAnswers.push({
      ...studentAnswer,
      score: Math.round(score),
      feedback
    });
  });

  const percentage = (totalScore / maxScore) * 100;
  
  return {
    totalScore: Math.round(totalScore),
    maxScore,
    percentage: Math.round(percentage),
    earnedXP: Math.floor((104 * percentage) / 100), // Base XP = 104
    gradedAnswers,
    grade: percentage >= 90 ? 'Xuất sắc' : 
           percentage >= 80 ? 'Giỏi' : 
           percentage >= 70 ? 'Khá' : 
           percentage >= 50 ? 'Trung bình' : 
           'Cần cố gắng'
  };
}

