import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';

// Initialize OpenAI only when needed
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Grok API configuration
const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

// OpenRouter for AI Tutor (ưu tiên khi có key)
const AI_TUTOR_OPENROUTER_API_KEY = process.env.AI_TUTOR_OPENROUTER_API_KEY ?? process.env.OPENROUTER_API_KEY;
const AI_TUTOR_OPENROUTER_MODEL = process.env.AI_TUTOR_OPENROUTER_MODEL ?? process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function POST(req: Request) {
  try {
    console.log('[AI_TUTOR_CHAT] Starting...');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      message, 
      conversationHistory = [], 
      userState = {},
      preferredModel = 'auto' 
    } = await req.json();

    console.log('[AI_TUTOR_CHAT] User:', session.user.email);
    console.log('[AI_TUTOR_CHAT] Message:', message);
    console.log('[AI_TUTOR_CHAT] User State:', userState);

    // Build system prompt based on user state
    const systemPrompt = buildSystemPrompt(userState);

    // Build conversation history
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Select AI model based on context
    const selectedModel = selectAIModel(message, userState, preferredModel);
    console.log('[AI_TUTOR_CHAT] Selected model:', selectedModel);

    let response: string | undefined;
    let aiModel: string;

    try {
      // 1) OpenRouter (AI Tutor) – ưu tiên khi có AI_TUTOR_OPENROUTER_API_KEY hoặc OPENROUTER_API_KEY
      if (AI_TUTOR_OPENROUTER_API_KEY?.trim() && (AI_TUTOR_OPENROUTER_API_KEY.startsWith('sk-or-') || AI_TUTOR_OPENROUTER_API_KEY.startsWith('ysk-or-'))) {
        console.log('[AI_TUTOR_CHAT] Using OpenRouter...', AI_TUTOR_OPENROUTER_MODEL);
        const openRouterRes = await fetch(OPENROUTER_CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AI_TUTOR_OPENROUTER_API_KEY}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://aeroeduvison.local',
          },
          body: JSON.stringify({
            model: AI_TUTOR_OPENROUTER_MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });

        if (!openRouterRes.ok) {
          const errText = await openRouterRes.text();
          throw new Error(`OpenRouter error: ${openRouterRes.status} ${errText}`);
        }

        const openRouterData = await openRouterRes.json();
        response = openRouterData.choices?.[0]?.message?.content ?? '';
        aiModel = openRouterData.model?.id ?? 'OpenRouter';
        console.log('[AI_TUTOR_CHAT] OpenRouter response length:', response?.length);
      } else if (selectedModel === 'gpt4') {
        // 2) GPT-4 for complex educational content
        console.log('[AI_TUTOR_CHAT] Using GPT-4...');
        const openai = getOpenAI();
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messages as any,
          temperature: 0.7,
          max_tokens: 1000,
          presence_penalty: 0.6,
          frequency_penalty: 0.3,
        });

        response = completion.choices[0].message.content ?? '';
        aiModel = 'GPT-4o-mini';
        console.log('[AI_TUTOR_CHAT] GPT-4 response length:', response?.length);
      } else if (selectedModel === 'grok' && GROK_API_KEY) {
        // 3) Grok for conversational support
        console.log('[AI_TUTOR_CHAT] Using Grok...');
        const grokResponse = await fetch(GROK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROK_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'grok-beta',
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });

        if (!grokResponse.ok) {
          throw new Error(`Grok API error: ${grokResponse.statusText}`);
        }

        const grokData = await grokResponse.json();
        response = grokData.choices[0].message.content;
        aiModel = 'Grok';
        console.log('[AI_TUTOR_CHAT] Grok response length:', response?.length);
      } else {
        throw new Error('No AI model available. Set AI_TUTOR_OPENROUTER_API_KEY, OPENAI_API_KEY, or GROK_API_KEY.');
      }

      // Parse response for actions
      const actions = extractActions(response, userState);

      console.log('[AI_TUTOR_CHAT] Success!');
      return NextResponse.json({
        response,
        aiModel,
        actions,
        emotion: detectEmotion(message),
        timestamp: new Date().toISOString()
      });

    } catch (aiError: any) {
      console.error('[AI_TUTOR_CHAT] AI Error:', aiError.message);

      // Fallback: thử Grok nếu vừa dùng GPT-4
      if (response == null && selectedModel === 'gpt4' && GROK_API_KEY) {
        console.log('[AI_TUTOR_CHAT] GPT-4 failed, trying Grok...');
        try {
          const grokResponse = await fetch(GROK_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${GROK_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'grok-beta',
              messages: messages,
              temperature: 0.7,
              max_tokens: 1000,
            }),
          });

          const grokData = await grokResponse.json();
          response = grokData.choices[0].message.content;
          aiModel = 'Grok (Fallback)';
          
          return NextResponse.json({
            response,
            aiModel,
            actions: extractActions(response, userState),
            emotion: detectEmotion(message),
            timestamp: new Date().toISOString()
          });
        } catch (grokError) {
          console.error('[AI_TUTOR_CHAT] Grok fallback failed:', grokError);
        }
      }

      // Final fallback - intelligent response
      return NextResponse.json({
        response: generateIntelligentFallback(message, userState),
        aiModel: 'Fallback System',
        actions: extractActions('', userState),
        emotion: detectEmotion(message),
        timestamp: new Date().toISOString()
      });
    }

  } catch (error: any) {
    console.error('[AI_TUTOR_CHAT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat', message: error.message },
      { status: 500 }
    );
  }
}

// Build system prompt based on user state
function buildSystemPrompt(userState: any): string {
  const { emotion, motivation, skillLevel, goals, currentXP } = userState;
  
  return `You are an AI Learning Coach for an adaptive education platform.

**Your Role:**
- Be empathetic, encouraging, and adaptive
- Personalize responses based on student's emotional state and skill level
- Use Vietnamese language naturally and warmly
- Provide actionable learning suggestions
- Keep responses concise (2-4 paragraphs max)

**Current Student Context:**
- Emotion: ${emotion || 'neutral'}
- Motivation: ${motivation || 'medium'}/10
- Skill Level: ${skillLevel || 'intermediate'}
- Learning Goals: ${goals?.join(', ') || 'general learning'}
- Current XP: ${currentXP || 0}

**Response Guidelines:**
1. If emotion is low (sad, frustrated, tired): Be extra encouraging, suggest shorter tasks
2. If motivation is low (<5): Offer easy wins, gamification, or breaks
3. If student asks questions: Provide clear explanations with examples
4. If student shares progress: Celebrate and suggest next steps
5. Always end with a question or call-to-action

**Tone:** Friendly, like a supportive study buddy. Use emojis sparingly but appropriately.`;
}

// Select AI model based on message complexity and context
function selectAIModel(message: string, userState: any, preferred: string): string {
  if (preferred !== 'auto') {
    return preferred;
  }

  // Complex educational questions → GPT-4
  const complexKeywords = [
    'giải thích', 'tại sao', 'như thế nào', 'phân tích', 'so sánh',
    'explain', 'why', 'how', 'analyze', 'compare',
    'công thức', 'định lý', 'nguyên lý', 'lý thuyết'
  ];
  
  const isComplex = complexKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );

  if (isComplex || message.length > 100) {
    return 'gpt4';
  }

  // Quick questions, chat → Grok (faster, cheaper)
  return 'grok';
}

// Extract suggested actions from AI response
function extractActions(response: string, userState: any): any[] {
  const actions = [];
  
  // Suggest practice if response mentions exercises
  if (response.includes('thực hành') || response.includes('bài tập')) {
    actions.push({ 
      label: '📝 Làm bài tập ngay', 
      action: 'start_practice' 
    });
  }

  // Suggest learning path if response mentions learning more
  if (response.includes('học thêm') || response.includes('tiếp tục')) {
    actions.push({ 
      label: '🎯 Xem lộ trình học', 
      action: 'show_learning_path' 
    });
  }

  // Always offer to continue conversation
  actions.push({ 
    label: '💬 Hỏi thêm câu khác', 
    action: 'continue_chat' 
  });

  return actions;
}

// Detect emotion from message
function detectEmotion(message: string): string {
  const lowerMsg = message.toLowerCase();
  
  // Frustrated
  if (lowerMsg.includes('khó quá') || lowerMsg.includes('không hiểu') || 
      lowerMsg.includes('confused') || lowerMsg.includes('stuck')) {
    return 'frustrated';
  }
  
  // Excited
  if (lowerMsg.includes('tuyệt') || lowerMsg.includes('hay quá') || 
      lowerMsg.includes('excited') || lowerMsg.includes('!')) {
    return 'excited';
  }
  
  // Tired
  if (lowerMsg.includes('mệt') || lowerMsg.includes('tired') || 
      lowerMsg.includes('nghỉ')) {
    return 'tired';
  }
  
  return 'neutral';
}

// Generate intelligent fallback if AI fails
function generateIntelligentFallback(message: string, userState: any): string {
  const { emotion, motivation } = userState;
  
  // Check if it's a question
  if (message.includes('?') || message.includes('sao') || message.includes('thế nào')) {
    return `Cảm ơn bạn đã đặt câu hỏi! 🤔\n\n` +
           `Mình đang gặp chút vấn đề kỹ thuật với AI chính, nhưng mình có thể giúp bạn:\n\n` +
           `• Thử tìm kiếm trong tài liệu học\n` +
           `• Hỏi giáo viên trực tiếp\n` +
           `• Hoặc thử lại sau vài phút\n\n` +
           `Bạn có muốn mình gợi ý một số tài liệu liên quan không? 📚`;
  }
  
  // Encouragement based on emotion
  if (emotion === 'frustrated' || motivation < 5) {
    return `Mình hiểu bạn đang gặp khó khăn. 💪\n\n` +
           `Đừng lo, học tập là một hành trình dài. Hãy thử:\n\n` +
           `• Nghỉ giải lao 5-10 phút\n` +
           `• Ôn lại kiến thức cơ bản\n` +
           `• Chia nhỏ vấn đề thành từng phần\n\n` +
           `Bạn muốn mình gợi ý một bài học dễ hơn để bắt đầu không? 🌱`;
  }
  
  // Generic helpful response
  return `Cảm ơn bạn đã chia sẻ! 😊\n\n` +
         `Mình là AI Learning Coach, luôn sẵn sàng hỗ trợ bạn trong hành trình học tập.\n\n` +
         `Bạn có thể hỏi mình về:\n` +
         `• Giải thích khái niệm học tập\n` +
         `• Gợi ý lộ trình học phù hợp\n` +
         `• Chiến lược học hiệu quả\n` +
         `• Động viên và hỗ trợ tinh thần\n\n` +
         `Bạn cần mình giúp gì nhé? 🚀`;
}


