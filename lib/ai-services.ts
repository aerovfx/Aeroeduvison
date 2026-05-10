
import { modelSelector, TaskType, Priority } from './ai/model-selector';
import { GeminiProvider } from './ai/providers/gemini-provider';
import { OllamaProvider } from './ai/providers/ollama-provider';
import { OpenAIProvider } from './ai/providers/openai-provider';
import { FalProvider } from './ai/providers/fal-provider';
import { AIMessage } from './ai/providers/base-provider';

interface AIResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// AI Tutor Service - Main interface for learning platform
export class AITutorService {
  private gemini: GeminiProvider;
  private ollama: OllamaProvider;
  private openai: OpenAIProvider;
  private fal: FalProvider;

  constructor() {
    this.gemini = new GeminiProvider();
    this.ollama = new OllamaProvider();
    this.openai = new OpenAIProvider();
    this.fal = new FalProvider();
  }

  private async callProvider(selection: any, messages: AIMessage[]): Promise<AIResponse> {
    // Global override: AI_PREFERRED_PROVIDER=fal sẽ ép mọi request qua fal.ai
    // bất kể model-selector chọn gì. Hữu ích khi muốn dồn budget vào 1 nhà cung cấp.
    const forced = (process.env.AI_PREFERRED_PROVIDER || '').toLowerCase();
    let provider;
    if (forced === 'fal' || selection.provider === 'fal.ai') {
      provider = this.fal;
    } else switch (selection.provider) {
      case 'Ollama': provider = this.ollama; break;
      case 'Google Gemini': provider = this.gemini; break;
      default: provider = this.openai;
    }

    // Khi route sang fal, đổi tên model selection sang fal-prefixed nếu cần.
    const model = (provider === this.fal && selection.selectedModel && !selection.selectedModel.includes('/'))
      ? this.mapToFalModel(selection.selectedModel)
      : selection.selectedModel;

    const response = await provider.complete(messages, { model });

    return {
      content: response.content,
      model: response.model,
      usage: {
        prompt_tokens: response.usage.promptTokens,
        completion_tokens: response.usage.completionTokens,
        total_tokens: response.usage.totalTokens
      }
    };
  }

  // Heuristic: map "claude-3.5-sonnet" → "anthropic/claude-3.5-sonnet" cho fal any-llm.
  private mapToFalModel(modelName: string): string {
    const m = modelName.toLowerCase();
    if (m.startsWith('claude'))   return `anthropic/${modelName}`;
    if (m.startsWith('gemini'))   return `google/${modelName}`;
    if (m.startsWith('gpt'))      return `openai/${modelName}`;
    if (m.startsWith('grok'))     return `xai/${modelName}`;
    return modelName; // already namespaced or unknown
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
    const context = `Học sinh: môn ${userData.subject}, trình độ ${userData.level}, động lực ${userData.motivation}, cảm xúc ${userData.emotion}, XP ${userData.currentXP}`;
    
    const selection = await modelSelector.selectModel({
      taskType: TaskType.LESSON_PLANNING,
      priority: [Priority.QUALITY, Priority.SPEED],
      inputLength: 200,
      expectedOutputLength: 1000,
      requiresVietnamese: true,
      requiresRealtime: false,
      privacyRequired: false,
      studentAgeGroup: 'secondary'
    });

    const systemPrompt = `You are an AI tutor for Vietnamese high school students. 
    Create a personalized daily learning plan based on the student's data.
    
    Student Data:
    ${context}
    
    Return a JSON object with:
    1. "plan": Daily learning plan with lessons, activities, and goals
    2. "analysis": AI analysis of student's learning state and recommendations
    
    Make it engaging and suitable for Vietnamese teenagers.`;

    try {
      const response = await this.callProvider(selection, [{ role: 'user', content: systemPrompt }]);
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
    const selection = await modelSelector.selectModel({
      taskType: TaskType.CONTENT_GENERATION,
      priority: [Priority.QUALITY, Priority.SPEED],
      inputLength: 100,
      expectedOutputLength: 2000,
      requiresVietnamese: true,
      requiresRealtime: false,
      privacyRequired: false,
      studentAgeGroup: 'secondary'
    });

    const prompt = `Create a lesson about ${lessonData.topic} in ${lessonData.subject} 
    for a ${lessonData.difficulty} level student.
    
    Include:
    1. Clear explanations
    2. Step-by-step examples
    3. Practice exercises
    4. Real-world applications
    
    Make it engaging and suitable for Vietnamese high school students.`;

    try {
      const response = await this.callProvider(selection, [
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
    const selection = await modelSelector.selectModel({
      taskType: TaskType.CHAT_SUPPORT,
      priority: [Priority.SPEED, Priority.COST],
      inputLength: (question.length + context.length) / 4,
      expectedOutputLength: 500,
      requiresVietnamese: true,
      requiresRealtime: true,
      privacyRequired: false,
      studentAgeGroup: 'secondary'
    });

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
      const response = await this.callProvider(selection, messages);
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
    const selection = await modelSelector.selectModel({
      taskType: TaskType.CHAT_SUPPORT,
      priority: [Priority.SPEED, Priority.QUALITY],
      inputLength: 100,
      expectedOutputLength: 500,
      requiresVietnamese: true,
      requiresRealtime: false,
      privacyRequired: false,
      studentAgeGroup: 'secondary'
    });

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
      const response = await this.callProvider(selection, [{ role: 'user', content: prompt }]);
      
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
export const aiTutorService = new AITutorService();
