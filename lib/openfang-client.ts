const OPENFANG_BASE_URL =
  process.env.OPENFANG_BASE_URL || 'http://127.0.0.1:4200';

const OPENFANG_INTERNAL_TOKEN = process.env.OPENFANG_INTERNAL_TOKEN;

// Default: OFF mode - Teachers must explicitly start OpenFang service
// This saves resources and gives teachers control over when AI runs
const OPENFANG_MOCK_MODE = true;

// Log configuration on load (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[OpenFang Client] === CONFIGURATION ===');
  console.log('[OpenFang Client] OPENFANG_BASE_URL:', OPENFANG_BASE_URL);
  console.log('[OpenFang Client] OPENFANG_MOCK_MODE:', OPENFANG_MOCK_MODE, '(true = Mock mode, teachers must start OpenFang manually)');
  console.log('[OpenFang Client] NODE_ENV:', process.env.NODE_ENV);
  console.log('[OpenFang Client] =====================');
}

function buildHeaders() {
  const headers: Record<string, string> = {};
  if (OPENFANG_INTERNAL_TOKEN) {
    headers['Authorization'] = `Bearer ${OPENFANG_INTERNAL_TOKEN}`;
  }
  return headers;
}

export interface OpenfangAgent {
  id: string;
  name: string;
  description?: string;
  status?: string;
  last_run_at?: string;
}

export interface OpenfangReport {
  id: string;
  created_at: string;
  format: 'markdown' | 'html' | string;
  title?: string;
  summary?: string;
  content: string;
}

export async function getOpenfangHealth() {
  const res = await fetch(`${OPENFANG_BASE_URL}/api/health`, {
    method: 'GET',
    headers: buildHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`OpenFang health check failed: ${res.status}`);
  }
  return res.json();
}

export async function listOpenfangAgents(): Promise<OpenfangAgent[]> {
  const res = await fetch(`${OPENFANG_BASE_URL}/api/agents`, {
    method: 'GET',
    headers: buildHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to list OpenFang agents: ${res.status}`);
  }
  return res.json();
}

export async function triggerOpenfangAgent(
  agentId: string,
  message: string,
  payload?: unknown,
) {
  // Mock mode for development without OpenFang service
  if (OPENFANG_MOCK_MODE) {
    console.log('[OpenFang Client] Mock mode enabled, returning mock response');
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    return {
      reply: getMockResponse(agentId, payload),
      session_id: 'mock-session-' + Date.now(),
      mock: true,
    };
  }

  const url = `${OPENFANG_BASE_URL}/api/agents/${encodeURIComponent(agentId)}/message`;
  console.log(`[OpenFang Client] Triggering agent: ${agentId}`);
  console.log(`[OpenFang Client] URL: ${url}`);
  console.log(`[OpenFang Client] Payload:`, { message, payload });
  
  let res;
  try {
    res = await fetch(
      url,
      {
        method: 'POST',
        headers: {
          ...buildHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, payload }),
      },
    );
  } catch (fetchError) {
    console.error('[OpenFang Client] Fetch failed:', fetchError);
    throw new Error(
      `Cannot connect to OpenFang Agent OS at ${OPENFANG_BASE_URL}. ` +
      `Please ensure the service is running. Error: ${(fetchError as Error).message}`,
    );
  }
  
  const responseText = await res.text();
  console.log(`[OpenFang Client] Response status: ${res.status}`);
  console.log(`[OpenFang Client] Response body:`, responseText);
  
  if (!res.ok) {
    let errorDetail = responseText;
    try {
      const errorJson = JSON.parse(responseText);
      errorDetail = errorJson.error || errorJson.message || JSON.stringify(errorJson);
    } catch {
      // Response is not JSON, use as-is
    }
    throw new Error(
      `Failed to trigger OpenFang agent ${agentId}: ${res.status} ${res.statusText}. ${errorDetail}`,
    );
  }
  
  // Parse JSON response
  try {
    return JSON.parse(responseText);
  } catch (parseError) {
    console.error('[OpenFang Client] Failed to parse response:', parseError);
    throw new Error(`Failed to parse OpenFang response: ${(parseError as Error).message}`);
  }
}

// Mock responses for different agents
function getMockResponse(agentId: string, payload?: unknown): string {
  const text = (payload as any)?.text || 'Hello';
  
  const mockResponses: Record<string, string> = {
    'tutor-general': `Chào bạn! Tôi là Trợ giảng AI. Tôi có thể giúp gì cho bạn hôm nay? 

(Ghi chú: Đây là phản hồi mock. Để sử dụng trợ giảng AI thực tế, vui lòng khởi động OpenFang Agent OS.)`,
    
    'lesson-planner': `Tôi có thể giúp bạn thiết kế kế hoạch bài học! Bạn đang dạy môn gì và trình độ nào của học sinh?

(Ghi chú: Đây là phản hồi mock.)`,
    
    'assessment-designer': `Tôi sẽ giúp bạn tạo bài kiểm tra! Bạn cần loại câu hỏi nào (trắc nghiệm, tự luận) và thời lượng bao lâu?

(Ghi chú: Đây là phản hồi mock.)`,
    
    'feedback-writer': `Tôi có thể giúp bạn viết nhận xét cho học sinh. Hãy cho tôi biết về hiệu suất của học sinh đó.

(Ghi chú: Đây là phản hồi mock.)`,
    
    'parent-communicator': `Tôi sẽ giúp bạn soạn thông điệp cho phụ huynh. Bạn muốn truyền đạt điều gì?

(Ghi chú: Đây là phản hồi mock.)`,
    
    'general-assistant': `Xin chào! Tôi là trợ lý AI đa năng. Tôi có thể giúp gì cho bạn?

(Ghi chú: Đây là phản hồi mock.)`,
  };
  
  return mockResponses[agentId] || `Tôi đã nhận được tin nhắn của bạn: "${text}". 

(Ghi chú: Đây là phản hồi mock. Vui lòng khởi động OpenFang Agent OS để sử dụng trợ giảng AI thực tế.)`;
}

export async function getOpenfangReports(
  handId: string,
): Promise<{ hand_id: string; reports: OpenfangReport[] }> {
  const res = await fetch(
    `${OPENFANG_BASE_URL}/api/reports/${encodeURIComponent(handId)}`,
    {
      method: 'GET',
      headers: buildHeaders(),
      cache: 'no-store',
    },
  );
  if (!res.ok) {
    throw new Error(
      `Failed to fetch OpenFang reports for ${handId}: ${res.status}`,
    );
  }
  return res.json();
}

