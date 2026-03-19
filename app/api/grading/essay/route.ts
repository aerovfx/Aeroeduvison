
import { NextRequest, NextResponse } from 'next/server';
import { modelSelector, TaskType, Priority } from '@/lib/ai/model-selector';

export async function POST(req: NextRequest) {
  try {
    const { essayContent, rubricDescription, maxScore = 2.0 } = await req.json();

    if (!essayContent) {
      return NextResponse.json({ error: 'Nội dung bài luận không được để trống' }, { status: 400 });
    }

    // Select the best model for essay grading
    const selection = await modelSelector.selectModel({
      taskType: TaskType.ESSAY_GRADING,
      priority: [Priority.QUALITY, Priority.PRIVACY],
      inputLength: essayContent.length / 4,
      expectedOutputLength: 500,
      requiresVietnamese: true,
      requiresRealtime: false,
      privacyRequired: true,
      studentAgeGroup: 'secondary'
    });

    console.log(`🤖 Selected model for AI Grading: ${selection.selectedModel} via ${selection.provider}`);

    const prompt = `Bạn là một giáo viên chuyên nghiệp. Hãy chấm điểm bài tự luận sau đây.
    
TIÊU CHÍ CHẤM ĐIỂM:
- Điểm tối đa: ${maxScore}
- Nội dung: ${rubricDescription || 'Đánh giá tính đúng đắn, logic và sự hiểu biết về chủ đề.'}

BÀI LÀM CỦA HỌC SINH:
---
${essayContent}
---

YÊU CẦU TRẢ LỜI:
Chỉ trả về định dạng JSON với các trường sau:
{
  "score": <điểm số thực từ 0 đến ${maxScore}>,
  "feedback": "<nhận xét chi tiết bằng tiếng Việt>",
  "strengths": ["<điểm mạnh 1>", "<điểm mạnh 2>"],
  "weaknesses": ["<điểm cần cải thiện 1>", "<điểm cần cải thiện 2>"]
}

LƯU Ý: Không trả về bất kỳ văn bản nào khác ngoài JSON.`;

    let content = '';

    if (selection.provider === 'Anthropic') {
      // Claude Messages API
      const response = await fetch(selection.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env[selection.apiKey] || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: selection.selectedModel,
          max_tokens: 1024,
          system: 'You are an expert Vietnamese educator. Always respond in valid JSON.',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI Grading Error (${selection.selectedModel}):`, errorText);
        throw new Error(`AI model error: ${response.statusText}`);
      }

      const data = await response.json();
      // Claude response: { content: [{ type: "text", text: "..." }] }
      if (data.content && Array.isArray(data.content)) {
        const textBlock = data.content.find((b: any) => b.type === 'text');
        content = textBlock?.text || '';
      }
    } else {
      // OpenAI / Ollama / Grok / OpenRouter format
      const response = await fetch(selection.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env[selection.apiKey] || 'ollama'}`
        },
        body: JSON.stringify({
          model: selection.selectedModel,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI Grading Error (${selection.selectedModel}):`, errorText);
        throw new Error(`AI model error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.choices && data.choices[0]) {
        content = data.choices[0].message.content;
      } else if (data.message) {
        content = data.message.content;
      } else if (data.response) {
        content = data.response;
      }
    }

    // Clean up content if it contains markdown code blocks
    const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);

    return NextResponse.json({
      success: true,
      result,
      model: selection.selectedModel
    });

  } catch (error: any) {
    console.error('❌ AI Essay Grading API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal Server Error',
      fallback: true,
      result: {
        score: 1.5,
        feedback: "Đã xảy ra lỗi khi kết nối với AI. Đây là điểm số giả định.",
        strengths: ["Dữ liệu nhận được"],
        weaknesses: ["Lỗi kết nối AI"]
      }
    });
  }
}
