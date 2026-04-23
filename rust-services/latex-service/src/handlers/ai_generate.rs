//! AI exam generator — gọi Anthropic Claude API để sinh đề LaTeX theo
//! bố cục chuẩn Bộ GD&ĐT 2025.
//!
//! Endpoint: POST /api/latex-projects/ai-generate
//! Input:   ExamConfig JSON (khớp với frontend `src/services/latex-ai.service.ts`)
//! Output:  { latex: string, totalQuestions: number, source: "ai" }
//!
//! Key lấy từ env `ANTHROPIC_API_KEY` — KHÔNG bao giờ hardcode.
//! Nếu env không có thì trả 503 để frontend tự dùng fallback cục bộ.

use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

use crate::{error::AppError, models::AuthUser, AppState};

// ── Request types (match frontend ExamConfig) ───────────────
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DifficultyBreakdown {
    #[serde(default)]
    pub easy: u32,
    #[serde(default)]
    pub medium: u32,
    #[serde(default)]
    pub hard: u32,
    #[serde(default)]
    pub very_hard: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExamConfigRequest {
    pub subject: String,
    pub grade: u32,
    #[serde(default)]
    pub topics: Vec<String>,
    pub duration: u32,
    pub format: String, // "bgd-2025" | "mcq-only" | "mcq-tf-essay" | "tn-tl" | "full-essay"
    pub difficulty: DifficultyBreakdown,
    pub total_points: Option<u32>,
    pub title: Option<String>,
    pub school_name: Option<String>,
    pub department_name: Option<String>,
    pub exam_label: Option<String>,
    pub exam_code: Option<String>,
    pub school_year: Option<String>,
    pub exam_session: Option<String>,
    pub author_name: Option<String>,
    pub include_answer_key: Option<bool>,
    pub notes: Option<String>,
}

// ── Response type ───────────────────────────────────────────
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiGenerateResponse {
    pub latex: String,
    pub total_questions: u32,
    pub source: String, // always "ai"
    pub model: String,
}

// ── Anthropic API types ─────────────────────────────────────
#[derive(Debug, Serialize)]
struct AnthropicRequest<'a> {
    model: &'a str,
    max_tokens: u32,
    temperature: f32,
    system: &'a str,
    messages: Vec<AnthropicMessage<'a>>,
}

#[derive(Debug, Serialize)]
struct AnthropicMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    content: Vec<AnthropicContent>,
    #[serde(default)]
    model: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicContent {
    #[serde(rename = "type")]
    content_type: String,
    #[serde(default)]
    text: String,
}

// ── Handler ─────────────────────────────────────────────────
/// POST /api/latex-projects/ai-generate
///
/// - Authenticated teachers only.
/// - Reads `ANTHROPIC_API_KEY` env var; returns 503 if missing so the
///   frontend falls back to the local generator.
/// - Streams request to `https://api.anthropic.com/v1/messages` with a carefully
///   crafted system prompt that instructs Claude to return only LaTeX matching
///   the Vietnamese Ministry of Education 2025 exam layout.
pub async fn ai_generate(
    State(state): State<AppState>,
    user: AuthUser,
    Json(body): Json<ExamConfigRequest>,
) -> Result<Json<AiGenerateResponse>, AppError> {
    // Chỉ giáo viên và admin được phép gọi (tránh tiêu tốn API key của học sinh)
    if !user.is_teacher() && !user.is_admin() {
        return Err(AppError::Forbidden(
            "Chỉ giáo viên mới được dùng AI để sinh đề.".to_string(),
        ));
    }

    // Lấy key từ env var — KHÔNG bao giờ hardcode trong source
    let api_key = match std::env::var("ANTHROPIC_API_KEY") {
        Ok(k) if !k.trim().is_empty() => k,
        _ => {
            // Trả 503 để frontend biết backend chưa sẵn sàng → dùng fallback cục bộ
            return Err(AppError::ServiceUnavailable(
                "ANTHROPIC_API_KEY chưa được cấu hình trên server".to_string(),
            ));
        }
    };

    let model = std::env::var("ANTHROPIC_MODEL")
        .unwrap_or_else(|_| "claude-sonnet-4-6".to_string());

    // Xây dựng system prompt + user prompt
    let system_prompt = build_system_prompt();
    let user_prompt = build_user_prompt(&body);

    // Tổng số câu mong muốn (để caller biết và hiển thị trên UI)
    let total_questions = body.difficulty.easy
        + body.difficulty.medium
        + body.difficulty.hard
        + body.difficulty.very_hard;
    let expected_questions = if body.format == "bgd-2025" {
        // Chuẩn BGD: 16 MCQ + 2 Đ/S + 4 TLN + 2 TL = 24
        24u32.max(total_questions)
    } else {
        total_questions.max(10)
    };

    let req = AnthropicRequest {
        model: &model,
        max_tokens: 8000,
        temperature: 0.35,
        system: &system_prompt,
        messages: vec![AnthropicMessage {
            role: "user",
            content: &user_prompt,
        }],
    };

    // Gọi Anthropic API
    let response = state
        .client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&req)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Anthropic request failed: {}", e)))?;

    let status = response.status();
    let body_bytes = response
        .bytes()
        .await
        .map_err(|e| AppError::Internal(format!("Read Anthropic response: {}", e)))?;

    if !status.is_success() {
        // Đừng leak nguyên văn response (có thể chứa thông tin key). Log error, trả summary.
        let err_preview = String::from_utf8_lossy(&body_bytes);
        let preview: String = err_preview.chars().take(400).collect();
        tracing::error!(status = %status, preview = %preview, "Anthropic API error");
        return Err(AppError::Internal(format!(
            "Anthropic API trả về lỗi {}. Vui lòng thử lại sau.",
            status
        )));
    }

    let parsed: AnthropicResponse = serde_json::from_slice(&body_bytes)
        .map_err(|e| AppError::Internal(format!("Parse Anthropic response: {}", e)))?;

    // Ghép tất cả khối text lại
    let raw_latex: String = parsed
        .content
        .into_iter()
        .filter(|c| c.content_type == "text")
        .map(|c| c.text)
        .collect::<Vec<_>>()
        .join("\n");

    if raw_latex.trim().is_empty() {
        return Err(AppError::Internal(
            "Anthropic trả về nội dung rỗng".to_string(),
        ));
    }

    // Làm sạch: bỏ code fence ```latex ... ``` nếu AI có wrap
    let latex = strip_code_fence(&raw_latex);

    // Sanity check: phải có \begin{document}
    if !latex.contains("\\begin{document}") || !latex.contains("\\end{document}") {
        tracing::warn!("AI output missing document environment — returning anyway");
    }

    Ok(Json(AiGenerateResponse {
        latex,
        total_questions: expected_questions,
        source: "ai".to_string(),
        model: parsed.model,
    }))
}

// ── Helpers ─────────────────────────────────────────────────

/// Bỏ code fence ```latex ... ``` mà đôi khi Claude wrap quanh output
fn strip_code_fence(s: &str) -> String {
    let trimmed = s.trim();
    if trimmed.starts_with("```") {
        // Tìm newline đầu tiên để bỏ dòng ```latex / ```
        if let Some(first_nl) = trimmed.find('\n') {
            let without_start = &trimmed[first_nl + 1..];
            // Bỏ dấu ``` ở cuối
            if let Some(end_fence) = without_start.rfind("```") {
                return without_start[..end_fence].trim_end().to_string();
            }
            return without_start.to_string();
        }
    }
    trimmed.to_string()
}

/// System prompt: giải thích bố cục chuẩn Bộ GD&ĐT 2025, ràng buộc output.
fn build_system_prompt() -> String {
    r#"Bạn là giáo viên kỳ cựu chuyên soạn đề thi phổ thông Việt Nam theo chương trình GDPT 2018.
Nhiệm vụ: sinh ra một tài liệu LaTeX HOÀN CHỈNH, biên dịch được ngay với pdfLaTeX (đã có gói babel vietnamese).

RÀNG BUỘC TUYỆT ĐỐI:
1. TRẢ VỀ DUY NHẤT mã LaTeX từ \documentclass đến \end{document}. KHÔNG kèm giải thích, KHÔNG kèm markdown fence, KHÔNG tiếng Anh thừa.
2. Sử dụng preamble chuẩn sau (không đổi tên gói):
   \documentclass[12pt,a4paper]{article}
   \usepackage[utf8]{inputenc}
   \usepackage[vietnamese]{babel}
   \usepackage{amsmath,amssymb}
   \usepackage{geometry}
   \usepackage{enumitem}
   \usepackage{siunitx}
   \usepackage{xcolor}
   \usepackage{tabularx}
   \usepackage{fancyhdr}
   \usepackage{titlesec}
   \geometry{a4paper, total={170mm,257mm}, left=20mm, right=20mm, top=18mm, bottom=20mm}
   \setlength{\parindent}{0pt}\setlength{\parskip}{4pt}
   \pagestyle{fancy}\fancyhf{}\fancyfoot[C]{\thepage}\renewcommand{\headrulewidth}{0pt}
   \titleformat{\section}{\Large\bfseries\MakeUppercase}{}{0pt}{}
   \titlespacing*{\section}{0pt}{14pt}{8pt}

3. Nếu format là "bgd-2025": phải có đủ 4 phần theo ĐÚNG thứ tự và ĐÚNG tên tiêu đề:
   - Phần I. Câu trắc nghiệm nhiều lựa chọn (4,0 điểm) — 16 câu, 0,25đ/câu, 4 đáp án A B C D INLINE cùng dòng (phân cách bằng \quad).
   - Phần II. Trắc nghiệm đúng/sai (2,0 điểm) — 2 câu, mỗi câu có 4 ý a) b) c) d) là phát biểu dài.
   - Phần III. Trả lời ngắn (2,0 điểm) — 4 câu, 0,5đ/câu, học sinh điền số.
   - Phần IV. Tự luận (2,0 điểm) — 2 câu × 1,0đ, có ý a) và b).

4. Header đầu đề PHẢI dùng tabularx 2 cột (bên trái: Sở / Trường / Loại đề / "(Đề thi có N trang)"; bên phải: Kỳ thi / Năm học / Môn / Thời gian). Sau đó có dòng "Họ, tên thí sinh:" + "Số báo danh:" + khung \fbox{\textbf{ Mã đề: XXX }}.

5. Cuối tài liệu phải có dòng căn giữa: \begin{center}\textit{\large --- HẾT ---}\end{center}

6. Tất cả câu hỏi phải có nội dung KHOA HỌC CHÍNH XÁC theo chương trình GDPT 2018 của môn và khối được yêu cầu. Không được bịa số liệu sai. Đáp án phải đúng về mặt vật lý/toán/hoá.

7. Công thức toán phải dùng cú pháp LaTeX chuẩn ($...$ cho inline). Escape đúng %, &, $, #, _, ~, ^ nếu xuất hiện trong văn bản.

8. Không dùng package tiếng Việt khác ngoài babel. Không dùng fontspec. Đảm bảo pdfLaTeX biên dịch được."#.to_string()
}

/// User prompt: tổng hợp cấu hình → prompt cụ thể
fn build_user_prompt(c: &ExamConfigRequest) -> String {
    let topics = if c.topics.is_empty() {
        "Theo chương trình chuẩn của khối.".to_string()
    } else {
        c.topics.join(", ")
    };
    let school = c.school_name.as_deref().unwrap_or("TRƯỜNG THPT PHƯỚC BỬU");
    let dept = c
        .department_name
        .as_deref()
        .unwrap_or("SỞ GD ĐT TP. HỒ CHÍ MINH");
    let label = c.exam_label.as_deref().unwrap_or("ĐỀ THI MINH HOẠ");
    let session = c.exam_session.as_deref().unwrap_or("KIỂM TRA CUỐI HỌC KỲ");
    let year = c.school_year.as_deref().unwrap_or("2025 -- 2026");
    let code = c.exam_code.clone().unwrap_or_else(|| {
        use std::time::{SystemTime, UNIX_EPOCH};
        let n = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(456);
        format!("{:03}", 100 + (n % 900) as u32)
    });
    let answer_key = c.include_answer_key.unwrap_or(false);
    let notes = c.notes.as_deref().unwrap_or("");

    format!(
        r#"Sinh đề thi theo cấu hình sau:

- Môn: {subject}
- Khối: {grade}
- Chủ đề / phạm vi kiến thức: {topics}
- Thời gian làm bài: {duration} phút
- Định dạng đề: {format}
- Phân bổ độ khó: Nhận biết {easy} · Thông hiểu {medium} · Vận dụng {hard} · Vận dụng cao {very_hard}

Thông tin header (điền chính xác vào tabularx 2 cột):
- Sở GD&ĐT: {dept}
- Trường: {school}
- Loại đề: {label}
- Kỳ thi: {session}
- Năm học: {year}
- Mã đề: {code}

Có kèm bảng đáp án cuối đề? {answer_key_text}
Ghi chú in đầu đề: {notes}

Yêu cầu:
- Nếu format == "bgd-2025": tuân thủ chính xác 4 phần như mô tả trong system prompt.
- Các câu hỏi phải đúng chương trình lớp {grade}, sát chủ đề trên, đa dạng dạng bài (định nghĩa, công thức, đồ thị, tính toán).
- Mỗi câu MCQ phải có đúng 4 phương án khác nhau, chỉ 1 đáp án đúng.
- Các câu trả lời ngắn phải có đáp số rõ ràng (số thực hoặc số nguyên kèm đơn vị).
- Các câu tự luận phải có ý a) và b), có dữ liệu đủ để học sinh tính ra kết quả duy nhất.

Trả về NGUYÊN VĂN mã LaTeX (từ \documentclass đến \end{{document}}), không thêm bất kỳ chữ nào khác."#,
        subject = c.subject,
        grade = c.grade,
        topics = topics,
        duration = c.duration,
        format = c.format,
        easy = c.difficulty.easy,
        medium = c.difficulty.medium,
        hard = c.difficulty.hard,
        very_hard = c.difficulty.very_hard,
        dept = dept,
        school = school,
        label = label,
        session = session,
        year = year,
        code = code,
        answer_key_text = if answer_key { "Có" } else { "Không" },
        notes = if notes.is_empty() { "(không có)" } else { notes },
    )
}

