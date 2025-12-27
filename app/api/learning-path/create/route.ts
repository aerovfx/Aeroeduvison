/**
 * API Route: Create Multi-Disciplinary Learning Path
 * POST /api/learning-path/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { aiCoordinator } from '@/lib/learning-path/ai-coordinator';
import { SubjectDomain, SubjectMentor, KnowledgeNode } from '@/lib/learning-path/types';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { studentId, goals, interests } = body;

    if (!studentId || !goals || !interests) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, goals, interests' },
        { status: 400 }
      );
    }

    console.log(`📝 [API] Creating learning path for student: ${studentId}`);

    // Mock data - in production, fetch from database
    const mockMentors: SubjectMentor[] = [
      {
        id: 'mentor_math_1',
        name: 'Nguyễn Văn A',
        email: 'mentor.math@example.com',
        domain: SubjectDomain.MATH,
        expertise: ['Đại số', 'Hình học', 'Giải tích'],
        responseTime: 2,
        effectiveness: 92,
        assignmentCount: 3,
        availability: 'available',
      },
      {
        id: 'mentor_physics_1',
        name: 'Trần Thị B',
        email: 'mentor.physics@example.com',
        domain: SubjectDomain.PHYSICS,
        expertise: ['Cơ học', 'Điện từ', 'Quang học'],
        responseTime: 3,
        effectiveness: 88,
        assignmentCount: 2,
        availability: 'available',
      },
      {
        id: 'mentor_cs_1',
        name: 'Lê Văn C',
        email: 'mentor.cs@example.com',
        domain: SubjectDomain.COMPUTER_SCIENCE,
        expertise: ['Lập trình', 'AI', 'Thuật toán'],
        responseTime: 1.5,
        effectiveness: 95,
        assignmentCount: 4,
        availability: 'available',
      },
      {
        id: 'mentor_music_1',
        name: 'Phạm Thị D',
        email: 'mentor.music@example.com',
        domain: SubjectDomain.MUSIC,
        expertise: ['Hòa âm', 'Sóng âm', 'Nhạc cụ'],
        responseTime: 4,
        effectiveness: 85,
        assignmentCount: 1,
        availability: 'available',
      },
    ];

    const mockKnowledgeGraph: KnowledgeNode[] = [
      // Math nodes
      {
        id: 'node_math_1',
        title: 'Hàm số và đồ thị',
        domain: SubjectDomain.MATH,
        relatedDomains: [SubjectDomain.PHYSICS, SubjectDomain.COMPUTER_SCIENCE],
        prerequisites: [],
        difficulty: 5,
        estimatedTime: 60,
        content: {
          type: 'video',
          description: 'Khái niệm hàm số, vẽ đồ thị',
        },
        mentorId: 'mentor_math_1',
        verificationStatus: 'approved',
        lastUpdated: new Date(),
      },
      // Physics nodes
      {
        id: 'node_physics_1',
        title: 'Dao động và sóng',
        domain: SubjectDomain.PHYSICS,
        relatedDomains: [SubjectDomain.MATH, SubjectDomain.MUSIC],
        prerequisites: ['node_math_1'],
        difficulty: 6,
        estimatedTime: 90,
        content: {
          type: 'interactive',
          description: 'Dao động điều hòa, sóng cơ học',
        },
        mentorId: 'mentor_physics_1',
        verificationStatus: 'approved',
        lastUpdated: new Date(),
      },
      // Music nodes
      {
        id: 'node_music_1',
        title: 'Sóng âm và tần số',
        domain: SubjectDomain.MUSIC,
        relatedDomains: [SubjectDomain.PHYSICS, SubjectDomain.MATH],
        prerequisites: ['node_physics_1'],
        difficulty: 5,
        estimatedTime: 75,
        content: {
          type: 'video',
          description: 'Âm thanh, tần số, hòa âm',
        },
        mentorId: 'mentor_music_1',
        verificationStatus: 'approved',
        lastUpdated: new Date(),
      },
      // CS nodes
      {
        id: 'node_cs_1',
        title: 'Xử lý tín hiệu số',
        domain: SubjectDomain.COMPUTER_SCIENCE,
        relatedDomains: [SubjectDomain.MATH, SubjectDomain.PHYSICS, SubjectDomain.MUSIC],
        prerequisites: ['node_math_1', 'node_physics_1'],
        difficulty: 7,
        estimatedTime: 120,
        content: {
          type: 'interactive',
          description: 'FFT, xử lý âm thanh số',
        },
        mentorId: 'mentor_cs_1',
        verificationStatus: 'approved',
        lastUpdated: new Date(),
      },
    ];

    // Create AI context
    const context = {
      studentId,
      currentNode: '',
      completedNodes: [],
      studentProfile: {
        learningStyle: 'visual',
        strengths: [SubjectDomain.MATH, SubjectDomain.COMPUTER_SCIENCE],
        weaknesses: [SubjectDomain.MUSIC],
        interests,
        goals,
      },
      availableMentors: mockMentors,
      knowledgeGraph: mockKnowledgeGraph,
    };

    // Create multi-disciplinary path
    const path = await aiCoordinator.createMultiDisciplinaryPath(
      studentId,
      goals,
      interests,
      context
    );

    console.log(`✅ [API] Learning path created: ${path.id}`);

    return NextResponse.json({
      success: true,
      path,
      message: 'Multi-disciplinary learning path created successfully',
    });

  } catch (error) {
    console.error('[API] Error creating learning path:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

