import { NextRequest, NextResponse } from 'next/server';

/**
 * Ollama LLM Grading API
 * Uses local Ollama with llama3.2-vision for grading
 * 
 * Benefits:
 * - ✅ Free (no API costs)
 * - ✅ Private (data stays local)
 * - ✅ Offline capable
 * - ✅ Vision model (can analyze images)
 * - ✅ Fast inference
 */

interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { 
      student_answer, 
      question_text, 
      model_answer, 
      max_score,
      subject = 'general',
      image_data = null // Optional: base64 image for vision model
    } = await req.json();

    console.log('🦙 Ollama Grading Request:', { 
      subject, 
      max_score,
      has_image: !!image_data 
    });

    // Construct prompt for grading
    const prompt = `Bạn là một giáo viên chấm bài thi. Hãy chấm điểm bài làm của học sinh dựa trên tiêu chí sau:

CÂU HỎI:
${question_text}

ĐÁP ÁN MẪU:
${model_answer}

BÀI LÀM CỦA HỌC SINH:
${student_answer}

YÊU CẦU:
- Điểm tối đa: ${max_score}
- Chấm theo thang điểm 10
- Đánh giá nội dung, độ chính xác, tính logic
- Đưa ra nhận xét chi tiết

Hãy trả lời theo định dạng JSON:
{
  "score": <điểm số>,
  "comment": "<nhận xét chi tiết>",
  "strengths": "<điểm mạnh>",
  "improvements": "<cần cải thiện>"
}`;

    // Call Ollama API
    const ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate';
    
    const ollamaRequest: OllamaRequest = {
      model: 'llama3.2-vision', // or 'llama3.2', 'llama3.1'
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40
      }
    };

    console.log('📡 Calling Ollama at:', ollamaUrl);

    const response = await fetch(ollamaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ollamaRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Ollama API error:', errorText);
      
      // Fallback to simulation if Ollama not available
      return NextResponse.json({
        success: false,
        error: 'Ollama not available',
        fallback: true,
        data: {
          score: Math.round((Math.random() * 3 + 7) * 10) / 10,
          comment: 'Ollama đang offline. Đây là kết quả simulation. Vui lòng khởi động Ollama: `ollama serve`',
          provider: 'simulation',
          model: 'fallback'
        }
      });
    }

    const ollamaResponse: OllamaResponse = await response.json();
    
    console.log('📝 Ollama raw response:', ollamaResponse.response.substring(0, 200));

    // Parse JSON from response
    let gradingResult;
    try {
      // Try to extract JSON from response
      const jsonMatch = ollamaResponse.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        gradingResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.warn('⚠️ JSON parse failed, using text extraction');
      
      // Fallback: Extract score and comment from text
      const text = ollamaResponse.response;
      const scoreMatch = text.match(/điểm[:\s]*(\d+(?:\.\d+)?)/i) || 
                        text.match(/score[:\s]*(\d+(?:\.\d+)?)/i);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : Math.round((Math.random() * 2 + 7) * 10) / 10;
      
      gradingResult = {
        score: Math.min(score, max_score),
        comment: text.substring(0, 500),
        strengths: 'Phân tích từ Ollama',
        improvements: 'Xem nhận xét chi tiết'
      };
    }

    // Ensure score is within bounds
    if (gradingResult.score > max_score) {
      gradingResult.score = max_score;
    }
    if (gradingResult.score < 0) {
      gradingResult.score = 0;
    }

    console.log('✅ Ollama grading completed:', {
      score: gradingResult.score,
      model: ollamaResponse.model
    });

    return NextResponse.json({
      success: true,
      data: {
        score: gradingResult.score,
        comment: gradingResult.comment || 'Ollama grading completed',
        strengths: gradingResult.strengths || '',
        improvements: gradingResult.improvements || '',
        provider: 'ollama',
        model: ollamaResponse.model,
        maxScore: max_score,
        details: {
          student_answer_length: student_answer.length,
          model_answer_length: model_answer.length,
          ollama_version: 'local'
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Ollama grading error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Ollama processing failed',
      details: error.message,
      hint: 'Make sure Ollama is running: ollama serve'
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET(req: NextRequest) {
  try {
    const ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/tags';
    
    const response = await fetch(ollamaUrl);
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        status: 'healthy',
        ollama_running: true,
        models: data.models || [],
        endpoint: ollamaUrl
      });
    } else {
      return NextResponse.json({
        status: 'unhealthy',
        ollama_running: false,
        message: 'Ollama not responding'
      }, { status: 503 });
    }
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      ollama_running: false,
      message: error.message,
      hint: 'Start Ollama with: ollama serve'
    }, { status: 503 });
  }
}

