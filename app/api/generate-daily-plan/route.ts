import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// AI-powered daily plan generation logic
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subject, level, motivation, emotion, currentXP } = await req.json();

    // Get user's learning history and progress
    const userProgress = await db.userProgress.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        Chapter: {
          include: {
            Course: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    });

    // Calculate engagement score based on recent activity
    const completedChapters = userProgress.filter(p => p.isCompleted).length;
    const totalChapters = userProgress.length;
    const engagementScore = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 50;

    // AI Analysis: XP, competency, engagement, emotion
    const analysis = {
      xp: currentXP || 0,
      competency: calculateCompetencyScore(level, userProgress),
      engagement: engagementScore,
      emotionScore: calculateEmotionScore(emotion, motivation),
      learningVelocity: calculateLearningVelocity(userProgress)
    };

    // Generate personalized daily plan based on analysis
    const dailyPlan = generatePersonalizedPlan(subject, level, motivation, analysis);

    // Store daily plan in database
    try {
      await db.$executeRaw`
        INSERT INTO daily_learning_plans (user_id, plan_data, created_at)
        VALUES (${session.user.id}, ${JSON.stringify(dailyPlan)}::jsonb, NOW())
        ON CONFLICT (user_id, DATE(created_at))
        DO UPDATE SET plan_data = ${JSON.stringify(dailyPlan)}::jsonb, updated_at = NOW()
      `;
    } catch (dbError) {
      console.log('Note: daily_learning_plans table not found, skipping storage');
    }

    return NextResponse.json({
      success: true,
      plan: dailyPlan,
      analysis,
      recommendations: generateRecommendations(analysis)
    });

  } catch (error) {
    console.error('Error generating daily plan:', error);
    return NextResponse.json(
      { error: 'Failed to generate plan' },
      { status: 500 }
    );
  }
}

function calculateCompetencyScore(level: string, userProgress: any[]): number {
  const baseScore = {
    'beginner': 30,
    'intermediate': 60,
    'advanced': 80,
    'expert': 95
  }[level] || 50;

  // Adjust based on completion rate
  const completionRate = userProgress.length > 0
    ? (userProgress.filter(p => p.isCompleted).length / userProgress.length) * 100
    : 0;

  return Math.min(100, Math.round((baseScore + completionRate) / 2));
}

function calculateEmotionScore(emotion: string, motivation: number): number {
  const emotionWeights = {
    'happy': 1.0,
    'neutral': 0.7,
    'tired': 0.5,
    'stressed': 0.4
  };

  const weight = emotionWeights[emotion as keyof typeof emotionWeights] || 0.7;
  return Math.round(motivation * weight);
}

function calculateLearningVelocity(userProgress: any[]): number {
  if (userProgress.length < 2) return 50;

  const recentProgress = userProgress.slice(0, 5);
  const completedRecently = recentProgress.filter(p => p.isCompleted).length;
  
  return Math.min(100, (completedRecently / 5) * 100);
}

function generatePersonalizedPlan(
  subject: string,
  level: string,
  motivation: number,
  analysis: any
) {
  // AI-powered content selection based on user state
  const lessonDatabase = getLessonDatabase(subject, level);
  
  // Adjust difficulty based on emotion and motivation
  let targetDifficulty = level;
  if (motivation < 60) {
    // If tired/stressed, provide easier content
    targetDifficulty = level === 'expert' ? 'advanced' :
                       level === 'advanced' ? 'intermediate' :
                       level === 'intermediate' ? 'beginner' : 'beginner';
  }

  // Select optimal lessons
  const selectedLessons = lessonDatabase
    .filter(lesson => lesson.difficulty === targetDifficulty || lesson.difficulty === level)
    .slice(0, motivation >= 70 ? 4 : motivation >= 50 ? 3 : 2);

  // Calculate totals
  const totalTime = selectedLessons.reduce((sum, lesson) => sum + lesson.time, 0);
  const totalXP = selectedLessons.reduce((sum, lesson) => sum + lesson.xp, 0);

  return {
    lessons: selectedLessons,
    totalTime,
    totalXP,
    difficulty: targetDifficulty,
    focus: [subject],
    analysisSnapshot: analysis,
    adaptiveRecommendations: [
      motivation < 60 ? '💡 Hôm nay học nhẹ nhàng, không áp lực' : '🚀 Năng lượng tốt! Thử thách bản thân',
      analysis.engagement < 50 ? '🎯 Tập trung vào các bài ngắn, dễ hoàn thành' : '⭐ Engagement cao! Tiếp tục phát huy',
      analysis.learningVelocity > 70 ? '🔥 Tốc độ học tập ấn tượng!' : '🌱 Học đều đặn là chìa khóa'
    ]
  };
}

function generateRecommendations(analysis: any): string[] {
  const recommendations: string[] = [];

  if (analysis.emotionScore < 50) {
    recommendations.push('Nghỉ ngơi 5-10 phút giữa các bài học');
    recommendations.push('Chọn bài học ngắn, thú vị hơn');
  }

  if (analysis.engagement < 50) {
    recommendations.push('Thử thay đổi môn học hoặc chủ đề');
    recommendations.push('Học theo nhóm nhỏ để tăng động lực');
  }

  if (analysis.competency > 80) {
    recommendations.push('Sẵn sàng cho nội dung nâng cao hơn');
    recommendations.push('Có thể làm mentor cho bạn khác');
  }

  return recommendations;
}

function getLessonDatabase(subject: string, level: string) {
  // Lesson database - in production, this would come from database
  const lessonsBySubject: Record<string, any[]> = {
    'mathematics': [
      { id: 1, title: 'Phương trình bậc nhất', time: 30, xp: 100, difficulty: 'beginner', tags: ['algebra'] },
      { id: 2, title: 'Phương trình bậc hai', time: 45, xp: 150, difficulty: 'intermediate', tags: ['algebra'] },
      { id: 3, title: 'Hệ phương trình', time: 40, xp: 120, difficulty: 'intermediate', tags: ['algebra'] },
      { id: 4, title: 'Bất phương trình', time: 35, xp: 110, difficulty: 'beginner', tags: ['algebra'] },
      { id: 5, title: 'Vi tích phân', time: 60, xp: 200, difficulty: 'advanced', tags: ['calculus'] },
      { id: 6, title: 'Đại số tuyến tính', time: 50, xp: 180, difficulty: 'expert', tags: ['linear_algebra'] }
    ],
    'physics': [
      { id: 1, title: 'Động học cơ bản', time: 40, xp: 120, difficulty: 'beginner', tags: ['mechanics'] },
      { id: 2, title: 'Định luật Newton', time: 45, xp: 150, difficulty: 'intermediate', tags: ['mechanics'] },
      { id: 3, title: 'Năng lượng & Công', time: 50, xp: 160, difficulty: 'intermediate', tags: ['energy'] },
      { id: 4, title: 'Điện học cơ bản', time: 45, xp: 140, difficulty: 'beginner', tags: ['electricity'] },
      { id: 5, title: 'Sóng và Ánh sáng', time: 55, xp: 180, difficulty: 'advanced', tags: ['waves'] },
      { id: 6, title: 'Vật lý lượng tử', time: 70, xp: 250, difficulty: 'expert', tags: ['quantum'] }
    ],
    'chemistry': [
      { id: 1, title: 'Nguyên tử & Phân tử', time: 35, xp: 110, difficulty: 'beginner', tags: ['basics'] },
      { id: 2, title: 'Bảng tuần hoàn', time: 40, xp: 130, difficulty: 'beginner', tags: ['periodic'] },
      { id: 3, title: 'Phản ứng hóa học', time: 45, xp: 145, difficulty: 'intermediate', tags: ['reactions'] },
      { id: 4, title: 'Hóa hữu cơ cơ bản', time: 50, xp: 160, difficulty: 'intermediate', tags: ['organic'] },
      { id: 5, title: 'Cân bằng hóa học', time: 55, xp: 180, difficulty: 'advanced', tags: ['equilibrium'] },
      { id: 6, title: 'Hóa phân tích', time: 60, xp: 200, difficulty: 'expert', tags: ['analytical'] }
    ],
    'programming': [
      { id: 1, title: 'Python cơ bản', time: 45, xp: 150, difficulty: 'beginner', tags: ['python'] },
      { id: 2, title: 'Cấu trúc dữ liệu', time: 50, xp: 170, difficulty: 'intermediate', tags: ['data_structures'] },
      { id: 3, title: 'Thuật toán sắp xếp', time: 55, xp: 180, difficulty: 'intermediate', tags: ['algorithms'] },
      { id: 4, title: 'OOP với Python', time: 60, xp: 190, difficulty: 'advanced', tags: ['oop'] },
      { id: 5, title: 'API & Web Services', time: 65, xp: 210, difficulty: 'advanced', tags: ['web'] },
      { id: 6, title: 'Design Patterns', time: 70, xp: 240, difficulty: 'expert', tags: ['patterns'] }
    ],
    'ai_ml': [
      { id: 1, title: 'Giới thiệu Machine Learning', time: 40, xp: 140, difficulty: 'beginner', tags: ['ml_intro'] },
      { id: 2, title: 'Linear Regression', time: 50, xp: 170, difficulty: 'intermediate', tags: ['regression'] },
      { id: 3, title: 'Classification Algorithms', time: 55, xp: 185, difficulty: 'intermediate', tags: ['classification'] },
      { id: 4, title: 'Neural Networks', time: 60, xp: 200, difficulty: 'advanced', tags: ['neural_nets'] },
      { id: 5, title: 'Deep Learning', time: 70, xp: 230, difficulty: 'advanced', tags: ['deep_learning'] },
      { id: 6, title: 'NLP & Computer Vision', time: 80, xp: 280, difficulty: 'expert', tags: ['nlp_cv'] }
    ],
    'auto': [
      { id: 1, title: 'Bài học tổng hợp - Cơ bản', time: 30, xp: 100, difficulty: 'beginner', tags: ['mixed'] },
      { id: 2, title: 'Bài học tổng hợp - Trung bình', time: 40, xp: 140, difficulty: 'intermediate', tags: ['mixed'] },
      { id: 3, title: 'Bài học tổng hợp - Nâng cao', time: 50, xp: 180, difficulty: 'advanced', tags: ['mixed'] }
    ]
  };

  return lessonsBySubject[subject] || lessonsBySubject['auto'];
}
