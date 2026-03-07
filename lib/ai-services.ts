// AI Services for Learning Platform
// Supports Google AI and xAI (Grok) APIs

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Google AI Service
export class GoogleAIService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateContent(prompt: string, context?: string): Promise<AIResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/models/gemini-1.5-flash-latest:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: context ? `${context}\n\n${prompt}` : prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Google AI API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.candidates[0].content.parts[0].text,
        model: 'gemini-1.5-flash',
        usage: {
          prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
          completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
          total_tokens: data.usageMetadata?.totalTokenCount || 0,
        }
      };
    } catch (error) {
      console.error('Google AI Service Error:', error);
      throw error;
    }
  }
}

// xAI (Grok) Service
export class XAIService {
  private apiKey: string;
  private baseUrl = 'https://api.x.ai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chatCompletion(messages: AIMessage[], model = 'grok-4-latest'): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          messages,
          model,
          stream: false,
          temperature: 0.7,
          max_tokens: 1024,
        })
      });

      if (!response.ok) {
        throw new Error(`xAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0].message.content,
        model: data.model,
        usage: data.usage
      };
    } catch (error) {
      console.error('xAI Service Error:', error);
      throw error;
    }
  }
}

// AI Tutor Service - Main interface for learning platform
export class AITutorService {
  private googleAI: GoogleAIService;
  private xAI: XAIService;
  private preferredProvider: 'google' | 'xai' = 'google';

  constructor(googleApiKey: string, xaiApiKey: string) {
    this.googleAI = new GoogleAIService(googleApiKey);
    this.xAI = new XAIService(xaiApiKey);
  }

  // Generate daily learning plan
  async generateDailyPlan(userData: {
    subject: string;
    level: string;
    motivation: string;
    emotion: string;
    currentXP: number;
  }): Promise<{
    plan: any;
    analysis: any;
  }> {
    const systemPrompt = `You are an AI tutor for Vietnamese high school students. 
    Create a personalized daily learning plan based on the student's data.
    
    Student Data:
    - Subject: ${userData.subject}
    - Level: ${userData.level}
    - Motivation: ${userData.motivation}
    - Emotion: ${userData.emotion}
    - Current XP: ${userData.currentXP}
    
    Return a JSON object with:
    1. "plan": Daily learning plan with lessons, activities, and goals
    2. "analysis": AI analysis of student's learning state and recommendations
    
    Make it engaging and suitable for Vietnamese teenagers.`;

    try {
      const response = await this.googleAI.generateContent(systemPrompt);
      
      // Parse the response (assuming it returns JSON)
      const parsedResponse = JSON.parse(response.content);
      
      return {
        plan: parsedResponse.plan || this.getDefaultPlan(userData),
        analysis: parsedResponse.analysis || this.getDefaultAnalysis(userData)
      };
    } catch (error) {
      console.error('Error generating daily plan:', error);
      return {
        plan: this.getDefaultPlan(userData),
        analysis: this.getDefaultAnalysis(userData)
      };
    }
  }

  // Generate lesson content
  async generateLessonContent(lessonData: {
    subject: string;
    topic: string;
    difficulty: string;
    studentLevel: string;
  }): Promise<{
    content: string;
    exercises: any[];
    explanations: string[];
  }> {
    const prompt = `Create a lesson about ${lessonData.topic} in ${lessonData.subject} 
    for a ${lessonData.difficulty} level student.
    
    Include:
    1. Clear explanations
    2. Step-by-step examples
    3. Practice exercises
    4. Real-world applications
    
    Make it engaging and suitable for Vietnamese high school students.`;

    try {
      const response = await this.xAI.chatCompletion([
        { role: 'system', content: 'You are an expert teacher creating educational content for Vietnamese students.' },
        { role: 'user', content: prompt }
      ]);

      return {
        content: response.content,
        exercises: this.generateSampleExercises(lessonData),
        explanations: this.generateSampleExplanations(lessonData)
      };
    } catch (error) {
      console.error('Error generating lesson content:', error);
      return {
        content: this.getDefaultLessonContent(lessonData),
        exercises: this.generateSampleExercises(lessonData),
        explanations: this.generateSampleExplanations(lessonData)
      };
    }
  }

  // Provide real-time help
  async provideHelp(question: string, context: string): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful AI tutor. Provide clear, step-by-step explanations in Vietnamese. Be encouraging and supportive.'
      },
      {
        role: 'user',
        content: `Context: ${context}\n\nQuestion: ${question}`
      }
    ];

    try {
      const response = await this.xAI.chatCompletion(messages);
      return response.content;
    } catch (error) {
      console.error('Error providing help:', error);
      return 'Xin lỗi, tôi không thể trả lời câu hỏi này ngay bây giờ. Hãy thử lại sau nhé!';
    }
  }

  // Analyze student emotion and engagement
  async analyzeEmotion(emotionData: {
    mood: string;
    energy: number;
    stress: number;
    engagement: number;
  }): Promise<{
    analysis: string;
    recommendations: string[];
    encouragement: string;
  }> {
    const prompt = `Analyze this student's emotional state and provide recommendations:
    
    Mood: ${emotionData.mood}
    Energy Level: ${emotionData.energy}%
    Stress Level: ${emotionData.stress}%
    Engagement: ${emotionData.engagement}%
    
    Provide:
    1. Analysis of current state
    2. Specific recommendations
    3. Encouraging message
    
    Be supportive and understanding.`;

    try {
      const response = await this.googleAI.generateContent(prompt);
      
      return {
        analysis: response.content,
        recommendations: this.getDefaultRecommendations(emotionData),
        encouragement: this.getDefaultEncouragement(emotionData)
      };
    } catch (error) {
      console.error('Error analyzing emotion:', error);
      return {
        analysis: 'Tôi thấy bạn đang có một ngày học tập tích cực!',
        recommendations: ['Hãy nghỉ ngơi 5 phút sau mỗi 25 phút học', 'Uống đủ nước và ăn nhẹ'],
        encouragement: 'Bạn đang làm rất tốt! Hãy tiếp tục phát huy nhé!'
      };
    }
  }

  // Fallback methods for when APIs fail
  private getDefaultPlan(userData: any) {
    return {
      lessons: [
        {
          id: 'default-lesson-1',
          title: `Bài học ${userData.subject} cơ bản`,
          duration: 45,
          xpReward: 100,
          difficulty: userData.level
        }
      ],
      activities: ['Làm bài tập', 'Ôn tập kiến thức'],
      goals: ['Hoàn thành bài học', 'Đạt 80% độ chính xác']
    };
  }

  private getDefaultAnalysis(userData: any) {
    return {
      strengths: ['Tinh thần học tập tốt', 'Có động lực cao'],
      improvements: ['Tập trung hơn', 'Luyện tập thêm'],
      recommendations: ['Học đều đặn mỗi ngày', 'Nghỉ ngơi hợp lý']
    };
  }

  private generateSampleExercises(lessonData: any) {
    return [
      {
        id: 1,
        question: 'Câu hỏi mẫu về ' + lessonData.topic,
        options: ['A', 'B', 'C', 'D'],
        correct: 'A',
        explanation: 'Giải thích chi tiết'
      }
    ];
  }

  private generateSampleExplanations(lessonData: any) {
    return [
      'Giải thích bước 1: Khái niệm cơ bản',
      'Giải thích bước 2: Áp dụng thực tế',
      'Giải thích bước 3: Luyện tập'
    ];
  }

  private getDefaultLessonContent(lessonData: any) {
    return `Bài học về ${lessonData.topic} trong môn ${lessonData.subject}. 
    Đây là nội dung cơ bản phù hợp với trình độ ${lessonData.difficulty}.`;
  }

  private getDefaultRecommendations(emotionData: any) {
    return [
      'Hãy nghỉ ngơi 5 phút sau mỗi 25 phút học',
      'Uống đủ nước và ăn nhẹ',
      'Nghe nhạc nhẹ để thư giãn'
    ];
  }

  private getDefaultEncouragement(emotionData: any) {
    return 'Bạn đang làm rất tốt! Hãy tiếp tục phát huy nhé!';
  }
}

// Export singleton instance
export const aiTutorService = new AITutorService(
  process.env.GOOGLE_AI_API_KEY || '',
  process.env.XAI_API_KEY || ''
);
