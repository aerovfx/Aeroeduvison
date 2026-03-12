import { db } from "@/lib/db"

export interface CareerRecommendation {
  career: string
  matchScore: number
  reasons: string[]
  universities: string[]
  salaryRange: string
  demandLevel: 'high' | 'medium' | 'low'
  alumni?: {
    name: string
    graduationYear: number
    currentRole: string
    company: string
  }[]
}

export interface StudentProfile {
  favoriteSubjects: string[]
  strengths: string[]
  interests: string[]
  personalityType?: string
  averageScores: Record<string, number>
}

export class CareerAdvisorAgent {
  /**
   * Phân tích profile học sinh và đề xuất ngành nghề
   */
  async analyzeAndRecommend(studentId: string): Promise<{
    profile: StudentProfile
    recommendations: CareerRecommendation[]
    actionPlan: string[]
  }> {
    // Lấy data học sinh
    const profile = await this.buildStudentProfile(studentId)
    
    // Generate recommendations với AI
    const recommendations = await this.generateRecommendations(profile)
    
    // Create action plan
    const actionPlan = this.createActionPlan(recommendations)

    return {
      profile,
      recommendations,
      actionPlan,
    }
  }

  /**
   * Build student profile từ data
   */
  private async buildStudentProfile(studentId: string): Promise<StudentProfile> {
    // TODO: Query from database
    return {
      favoriteSubjects: ['Toán', 'Tin học'],
      strengths: ['Giải quyết vấn đề', 'Tư duy logic', 'Lập trình'],
      interests: ['Công nghệ', 'AI', 'Game development'],
      personalityType: 'INTJ',
      averageScores: {
        'Toán': 9.2,
        'Lý': 8.5,
        'Tin': 9.5,
        'Văn': 7.0,
        'Anh': 8.0,
      },
    }
  }

  /**
   * Generate career recommendations với AI
   */
  private async generateRecommendations(profile: StudentProfile): Promise<CareerRecommendation[]> {
    try {
      const response = await fetch('/api/agents/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `Bạn là chuyên gia tư vấn hướng nghiệp.

Phân tích profile học sinh và đề xuất 5-7 ngành nghề phù hợp nhất.

Output JSON:
{
  "recommendations": [
    {
      "career": "Kỹ sư Phần mềm",
      "matchScore": 92,
      "reasons": ["Giỏi Toán", "Thích lập trình"],
      "universities": ["Bách Khoa", "Khoa Học Tự Nhiên"],
      "salaryRange": "$1000-3000",
      "demandLevel": "high"
    }
  ]
}`
            },
            {
              role: 'user',
              content: `Profile:
- Môn yêu thích: ${profile.favoriteSubjects.join(', ')}
- Điểm mạnh: ${profile.strengths.join(', ')}
- Sở thích: ${profile.interests.join(', ')}
- Điểm trung bình: ${JSON.stringify(profile.averageScores)}

Hãy đề xuất các ngành nghề phù hợp.`
            }
          ],
          config: { model: 'gpt-4o-mini', temperature: 0.7 }
        }),
      })

      if (!response.ok) throw new Error('AI recommendation failed')

      const data = await response.json()
      return JSON.parse(data.content).recommendations
    } catch (error) {
      console.error('Career recommendation error:', error)
      return this.getFallbackRecommendations(profile)
    }
  }

  /**
   * Fallback recommendations khi AI fails
   */
  private getFallbackRecommendations(profile: StudentProfile): CareerRecommendation[] {
    const recommendations: CareerRecommendation[] = []

    if (profile.averageScores['Toán'] >= 8.0 && profile.averageScores['Tin'] >= 8.0) {
      recommendations.push({
        career: 'Kỹ sư Phần mềm',
        matchScore: 92,
        reasons: ['Giỏi Toán', 'Giỏi Tin học', 'Tư duy logic tốt'],
        universities: ['ĐH Bách Khoa', 'ĐH Khoa Học Tự Nhiên', 'Học viện Kỹ thuật Quân sự'],
        salaryRange: '$1000-3000',
        demandLevel: 'high',
      })
    }

    if (profile.averageScores['Lý'] >= 8.0) {
      recommendations.push({
        career: 'Kỹ sư Điện - Điện tử',
        matchScore: 85,
        reasons: ['Giỏi Vật lý', 'Thích công nghệ'],
        universities: ['ĐH Bách Khoa', 'ĐH Giao thông Vận tải'],
        salaryRange: '$800-2500',
        demandLevel: 'high',
      })
    }

    if (profile.averageScores['Anh'] >= 8.0) {
      recommendations.push({
        career: 'Biên phiên dịch',
        matchScore: 80,
        reasons: ['Giỏi Tiếng Anh', 'Giao tiếp tốt'],
        universities: ['ĐH Ngoại Ngữ', 'ĐH Hà Nội'],
        salaryRange: '$600-2000',
        demandLevel: 'medium',
      })
    }

    return recommendations.slice(0, 5)
  }

  /**
   * Create action plan để đạt được mục tiêu
   */
  private createActionPlan(recommendations: CareerRecommendation[]): string[] {
    const plan: string[] = []

    if (recommendations.length > 0) {
      const top = recommendations[0]
      plan.push(`1. Tìm hiểu sâu về ngành: ${top.career}`)
      plan.push(`2. Ôn tập các môn: Toán, Lý, Tin (nếu có)`)
      plan.push('3. Tham gia các CLB, cuộc thi liên quan')
      plan.push('4. Tìm hiểu về các trường ĐH đào tạo')
      plan.push('5. Kết nối với anh chị đi trước trong ngành')
    }

    return plan
  }

  /**
   * Connect với alumni trong ngành
   */
  async connectWithAlumni(career: string, studentId: string): Promise<{
    alumni: Array<{
      id: string
      name: string
      graduationYear: number
      currentRole: string
      company: string
      canMentor: boolean
    }>
  }> {
    // TODO: Query alumni database
    return {
      alumni: [
        {
          id: 'alumni-1',
          name: 'Nguyễn Văn A',
          graduationYear: 2020,
          currentRole: 'Software Engineer',
          company: 'FPT Software',
          canMentor: true,
        },
        {
          id: 'alumni-2',
          name: 'Trần Thị B',
          graduationYear: 2019,
          currentRole: 'Frontend Developer',
          company: 'VNG',
          canMentor: true,
        },
      ],
    }
  }
}

export const careerAdvisor = new CareerAdvisorAgent()
