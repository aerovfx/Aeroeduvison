import { db } from "@/lib/db"

export class ContentGeneratorAgent {
  async generateLessonPlan(subject: string, grade: string, topic: string, duration: number): Promise<any> {
    try {
      const response = await fetch('/api/agents/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Tạo giáo án cho ${subject} - ${grade}, chủ đề: ${topic}, thời lượng: ${duration} phút. Theo CV 2018.`
          }],
          config: { model: 'gpt-4o-mini' }
        }),
      })
      const data = await response.json()
      return JSON.parse(data.content)
    } catch (error) {
      console.error('Lesson plan generation error:', error)
      return null
    }
  }

  async generateSlides(content: string): Promise<any> {
    // Generate slide outline from content
    return { slides: content.split('\n').map(s => ({ title: s, bullets: [] })) }
  }

  async generateQuiz(topic: string, count: number): Promise<any[]> {
    // Generate quiz questions
    return []
  }
}

export const contentGenerator = new ContentGeneratorAgent()
