use axum::extract::{Multipart, State};
use axum::http::HeaderMap;
use axum::Json;
use calamine::{open_workbook_auto_from_rs, Reader};
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use uuid::Uuid;

use crate::AppState;
use crate::error::{MediaError, Result};

// ── Request / Response types ──────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct BatchImportBody {
    pub questions: Vec<ImportQuestion>,
}

#[derive(Debug, Deserialize)]
pub struct ImportQuestion {
    pub content: String,
    #[serde(rename = "questionType")]
    pub question_type: Option<String>,
    pub subject: Option<String>,
    pub grade: Option<String>,
    pub difficulty: Option<String>,
    pub topic: Option<String>,
    pub options: Option<Vec<String>>,
    #[serde(rename = "correctAnswer")]
    pub correct_answer: Option<String>,
    pub explanation: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BatchImportResponse {
    pub success: bool,
    pub inserted: i64,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct ListQuestionsResponse {
    pub success: bool,
    pub data: Vec<QuestionRow>,
    pub total: i64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct QuestionRow {
    pub id: String,
    pub content: String,
    pub subject: String,
    pub grade: String,
    #[serde(rename = "questionType")]
    pub question_type: String,
    pub difficulty: String,
    pub status: String,
    pub options: Vec<String>,
    #[serde(rename = "correctAnswer")]
    pub correct_answer: Option<String>,
    pub explanation: String,
    #[serde(rename = "aiGenerated")]
    pub ai_generated: bool,
    pub topic: String,
    #[serde(rename = "createdAt")]
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ListQuestionsQuery {
    pub subject: Option<String>,
    pub grade: Option<String>,
    pub difficulty: Option<String>,
    pub status: Option<String>,
    #[serde(rename = "type")]
    pub question_type: Option<String>,
    pub search: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

// ── Handlers ─────────────────────────────────────────────────────────────

/// POST /api/questions/batch
/// Accepts a JSON array of questions parsed on the frontend (JSON/CSV import)
pub async fn batch_import_questions(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<BatchImportBody>,
) -> Result<Json<serde_json::Value>> {
    // Get user ID from JWT (optional – fall back to "import" if no auth)
    let created_by = extract_user_id_optional(&state, &headers);

    if body.questions.is_empty() {
        return Err(MediaError::Validation("Danh sách câu hỏi trống".to_string()));
    }

    let mut inserted = 0i64;

    for q in &body.questions {
        if q.content.trim().is_empty() {
            continue; // skip blank
        }

        let id = format!("cq{}", Uuid::new_v4().to_string().replace('-', ""));
        let question_type = q.question_type.as_deref().unwrap_or("MCQ");
        let subject = q.subject.as_deref().unwrap_or("Chung");
        let grade = q.grade.as_deref().unwrap_or("Khối 10");
        let difficulty = q.difficulty.as_deref().unwrap_or("MEDIUM");
        let topic = q.topic.as_deref().unwrap_or("");
        let explanation = q.explanation.as_deref().unwrap_or("");
        let correct_answer = q.correct_answer.as_deref().unwrap_or("");
        let options: Vec<&str> = q
            .options
            .as_ref()
            .map(|v| v.iter().map(|s| s.as_str()).collect())
            .unwrap_or_default();

        let now = chrono::Utc::now();

        let result = sqlx::query(
            r#"
            INSERT INTO "Question" (
                id, topic, subject, grade, "questionType", difficulty,
                content, options, "correctAnswer", explanation,
                "learningObjectives", keywords, tags,
                status, "createdBy", "aiGenerated", "humanReviewed",
                "usageCount", "createdAt", "updatedAt"
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10,
                $11, $12, $13,
                'Đã duyệt', $14, false, false,
                0, $15, $15
            )
            ON CONFLICT (id) DO NOTHING
            "#,
        )
        .bind(&id)
        .bind(topic)
        .bind(subject)
        .bind(grade)
        .bind(question_type)
        .bind(difficulty)
        .bind(q.content.trim())
        .bind(&options)
        .bind(correct_answer)
        .bind(explanation)
        .bind(&[] as &[String]) // learningObjectives
        .bind(&[] as &[String]) // keywords
        .bind(&[] as &[String]) // tags
        .bind(&created_by)
        .bind(now)
        .execute(&state.db)
        .await;

        match result {
            Ok(r) if r.rows_affected() > 0 => inserted += 1,
            Ok(_) => {} // conflict / no-op
            Err(e) => {
                tracing::warn!("Failed to insert question: {}", e);
                // Continue with remaining questions instead of aborting
            }
        }
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "data": { "inserted": inserted },
        "message": format!("Đã import {} câu hỏi thành công", inserted)
    })))
}

/// GET /api/questions
/// List questions with optional filters
pub async fn list_questions_v2(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<ListQuestionsQuery>,
) -> Result<Json<serde_json::Value>> {
    let limit = params.limit.unwrap_or(50).min(200);
    let offset = params.offset.unwrap_or(0);

    // Build WHERE clause dynamically
    let mut conditions = vec!["1=1".to_string()];
    let mut bind_idx = 1usize;
    let mut bind_vals: Vec<String> = vec![];

    if let Some(ref s) = params.subject {
        if !s.is_empty() {
            conditions.push(format!("subject = ${}", bind_idx));
            bind_vals.push(s.clone());
            bind_idx += 1;
        }
    }
    if let Some(ref g) = params.grade {
        if !g.is_empty() {
            conditions.push(format!("grade = ${}", bind_idx));
            bind_vals.push(g.clone());
            bind_idx += 1;
        }
    }
    if let Some(ref d) = params.difficulty {
        if !d.is_empty() {
            conditions.push(format!("difficulty = ${}", bind_idx));
            bind_vals.push(d.clone());
            bind_idx += 1;
        }
    }
    if let Some(ref st) = params.status {
        if !st.is_empty() {
            conditions.push(format!("status = ${}", bind_idx));
            bind_vals.push(st.clone());
            bind_idx += 1;
        }
    }
    if let Some(ref qt) = params.question_type {
        if !qt.is_empty() {
            conditions.push(format!(r#""questionType" = ${}"#, bind_idx));
            bind_vals.push(qt.clone());
            bind_idx += 1;
        }
    }
    if let Some(ref search) = params.search {
        if !search.is_empty() {
            conditions.push(format!("content ILIKE ${}", bind_idx));
            bind_vals.push(format!("%{}%", search));
            bind_idx += 1;
        }
    }
    let _ = bind_idx; // suppress unused_assignments warning

    let where_clause = conditions.join(" AND ");
    let query_sql = format!(
        r#"SELECT id, content, subject, grade, "questionType" as question_type, difficulty,
                  status, options, "correctAnswer" as correct_answer, explanation,
                  "aiGenerated" as ai_generated, topic, "createdAt" as created_at
           FROM "Question"
           WHERE {}
           ORDER BY "createdAt" DESC
           LIMIT {} OFFSET {}"#,
        where_clause, limit, offset
    );

    let count_sql = format!(
        r#"SELECT COUNT(*) FROM "Question" WHERE {}"#,
        where_clause
    );

    // Build and execute queries with dynamic bindings
    let mut q = sqlx::query_as::<_, QuestionRow>(&query_sql);
    let mut q_count = sqlx::query_scalar::<_, i64>(&count_sql);
    for val in &bind_vals {
        q = q.bind(val);
        q_count = q_count.bind(val);
    }

    let rows = q.fetch_all(&state.db).await.map_err(MediaError::Database)?;
    let total = q_count.fetch_one(&state.db).await.unwrap_or(0);

    Ok(Json(serde_json::json!({
        "success": true,
        "data": {
            "questions": rows,
            "total": total,
            "pagination": {
                "total": total,
                "limit": limit,
                "offset": offset
            }
        }
    })))
}

/// POST /api/questions — create a single question manually
pub async fn create_question(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(q): Json<ImportQuestion>,
) -> Result<Json<serde_json::Value>> {
    if q.content.trim().is_empty() {
        return Err(MediaError::Validation("Nội dung câu hỏi không được trống".to_string()));
    }

    let created_by = extract_user_id_optional(&state, &headers);
    let id = format!("cq{}", Uuid::new_v4().to_string().replace('-', ""));
    let question_type = q.question_type.as_deref().unwrap_or("MCQ");
    let subject = q.subject.as_deref().unwrap_or("Chung");
    let grade = q.grade.as_deref().unwrap_or("Khối 10");
    let difficulty = q.difficulty.as_deref().unwrap_or("MEDIUM");
    let topic = q.topic.as_deref().unwrap_or(subject);
    let explanation = q.explanation.as_deref().unwrap_or("");
    let correct_answer = q.correct_answer.as_deref().unwrap_or("");
    let options: Vec<&str> = q
        .options
        .as_ref()
        .map(|v| v.iter().map(|s| s.as_str()).collect())
        .unwrap_or_default();
    let now = chrono::Utc::now();

    sqlx::query(
        r#"
        INSERT INTO "Question" (
            id, topic, subject, grade, "questionType", difficulty,
            content, options, "correctAnswer", explanation,
            "learningObjectives", keywords, tags,
            status, "createdBy", "aiGenerated", "humanReviewed",
            "usageCount", "createdAt", "updatedAt"
        ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12, $13,
            'Đã duyệt', $14, false, false,
            0, $15, $15
        )
        "#,
    )
    .bind(&id)
    .bind(topic)
    .bind(subject)
    .bind(grade)
    .bind(question_type)
    .bind(difficulty)
    .bind(q.content.trim())
    .bind(&options)
    .bind(correct_answer)
    .bind(explanation)
    .bind(&[] as &[String])
    .bind(&[] as &[String])
    .bind(&[] as &[String])
    .bind(&created_by)
    .bind(now)
    .execute(&state.db)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "data": { "id": id }
    })))
}

/// PUT /api/questions/:id — update a question
pub async fn update_question(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(q): Json<ImportQuestion>,
) -> Result<Json<serde_json::Value>> {
    let now = chrono::Utc::now();
    let options: Vec<&str> = q
        .options
        .as_ref()
        .map(|v| v.iter().map(|s| s.as_str()).collect())
        .unwrap_or_default();

    sqlx::query(
        r#"
        UPDATE "Question" SET
            content = COALESCE($1, content),
            "questionType" = COALESCE($2, "questionType"),
            subject = COALESCE($3, subject),
            grade = COALESCE($4, grade),
            difficulty = COALESCE($5, difficulty),
            topic = COALESCE($6, topic),
            explanation = COALESCE($7, explanation),
            "correctAnswer" = COALESCE($8, "correctAnswer"),
            options = CASE WHEN array_length($9::text[], 1) > 0 THEN $9 ELSE options END,
            "updatedAt" = $10
        WHERE id = $11
        "#,
    )
    .bind(q.content.trim())
    .bind(q.question_type.as_deref())
    .bind(q.subject.as_deref())
    .bind(q.grade.as_deref())
    .bind(q.difficulty.as_deref())
    .bind(q.topic.as_deref())
    .bind(q.explanation.as_deref())
    .bind(q.correct_answer.as_deref())
    .bind(&options)
    .bind(now)
    .bind(&id)
    .execute(&state.db)
    .await?;

    Ok(Json(serde_json::json!({ "success": true })))
}

/// DELETE /api/questions/:id
pub async fn delete_question(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query(r#"DELETE FROM "Question" WHERE id = $1"#)
        .bind(&id)
        .execute(&state.db)
        .await?;

    Ok(Json(serde_json::json!({ "success": true })))
}

/// POST /api/questions/import — Excel file upload (multipart/form-data)
/// FormData fields: file (xlsx/xls), subject (string), grade (string)
pub async fn import_questions_excel(
    State(state): State<AppState>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>> {
    let created_by = extract_user_id_optional(&state, &headers);

    let mut file_bytes: Option<Vec<u8>> = None;
    let mut default_subject = "Chung".to_string();
    let mut default_grade = "Khối 10".to_string();

    // Parse multipart fields
    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "file" => {
                let data = field.bytes().await.map_err(|e| MediaError::Internal(e.to_string()))?;
                file_bytes = Some(data.to_vec());
            }
            "subject" => {
                if let Ok(text) = field.text().await {
                    if !text.is_empty() { default_subject = text; }
                }
            }
            "grade" => {
                if let Ok(text) = field.text().await {
                    if !text.is_empty() { default_grade = text; }
                }
            }
            _ => {}
        }
    }

    let bytes = file_bytes.ok_or_else(|| MediaError::Validation("Không tìm thấy file".to_string()))?;

    // Parse Excel in a blocking thread (calamine is synchronous)
    let (ds, dg) = (default_subject.clone(), default_grade.clone());
    let questions = tokio::task::spawn_blocking(move || -> Result<Vec<ImportQuestion>> {
        let cursor = Cursor::new(bytes);
        let mut workbook = open_workbook_auto_from_rs(cursor)
            .map_err(|e| MediaError::Internal(format!("Không thể đọc file Excel: {}", e)))?;

        let sheet_name = workbook
            .sheet_names()
            .first()
            .cloned()
            .ok_or_else(|| MediaError::Validation("File Excel không có sheet nào".to_string()))?;

        // calamine 0.23-: returns Option<Result<...>>; 0.24+: returns Result<...>
        let range = workbook
            .worksheet_range(&sheet_name)
            .map_err(|e| MediaError::Internal(e.to_string()))?;

        let mut rows = range.rows();

        // Read header row to figure out column indices
        let headers: Vec<String> = match rows.next() {
            Some(h) => h.iter().map(|c| c.to_string().to_lowercase().trim().to_string()).collect(),
            None => return Err(MediaError::Validation("File trống".to_string())),
        };

        let col = |name: &str| -> Option<usize> { headers.iter().position(|h| h == name) };

        let idx_content = col("content").or_else(|| col("nội_dung")).or_else(|| col("câu_hỏi")).or_else(|| col("question"));
        let idx_a = col("a");
        let idx_b = col("b");
        let idx_c = col("c");
        let idx_d = col("d");
        let idx_correct = col("correctanswer").or_else(|| col("correct_answer")).or_else(|| col("đáp_án")).or_else(|| col("answer"));
        let idx_subject = col("subject").or_else(|| col("môn"));
        let idx_grade = col("grade").or_else(|| col("khối"));
        let idx_difficulty = col("difficulty").or_else(|| col("độ_khó"));
        let idx_explanation = col("explanation").or_else(|| col("giải_thích"));
        let idx_topic = col("topic").or_else(|| col("chủ_đề"));
        let idx_type = col("questiontype").or_else(|| col("type"));

        let cell = |row: &[calamine::Data], idx: Option<usize>| -> Option<String> {
            idx.and_then(|i| row.get(i)).map(|c| c.to_string()).filter(|s| !s.is_empty() && s != "nil")
        };

        let mut questions = Vec::new();
        for row in rows {
            let content = match cell(row, idx_content) {
                Some(c) if !c.trim().is_empty() => c,
                _ => continue,
            };

            // Build options from A/B/C/D columns
            let mut options = Vec::new();
            for idx in [idx_a, idx_b, idx_c, idx_d] {
                if let Some(opt) = cell(row, idx) {
                    options.push(opt);
                }
            }

            let question_type = cell(row, idx_type)
                .map(|t| t.to_uppercase())
                .filter(|t| ["MCQ","TRUE_FALSE","SHORT_ANSWER","ESSAY"].contains(&t.as_str()))
                .or_else(|| if options.len() >= 2 { Some("MCQ".to_string()) } else { None })
                .unwrap_or_else(|| "MCQ".to_string());

            let subject = cell(row, idx_subject).unwrap_or_else(|| ds.clone());
            let grade = cell(row, idx_grade).unwrap_or_else(|| dg.clone());

            let difficulty = cell(row, idx_difficulty)
                .map(|d| match d.to_lowercase().as_str() {
                    "dễ" | "easy" => "EASY".to_string(),
                    "khó" | "hard" => "HARD".to_string(),
                    _ => "MEDIUM".to_string(),
                })
                .unwrap_or_else(|| "MEDIUM".to_string());

            questions.push(ImportQuestion {
                content: content.trim().to_string(),
                question_type: Some(question_type),
                subject: Some(subject),
                grade: Some(grade),
                difficulty: Some(difficulty),
                topic: cell(row, idx_topic),
                options: if options.is_empty() { None } else { Some(options) },
                correct_answer: cell(row, idx_correct),
                explanation: cell(row, idx_explanation),
            });
        }
        Ok(questions)
    })
    .await
    .map_err(|e| MediaError::Internal(e.to_string()))??;

    if questions.is_empty() {
        return Err(MediaError::Validation("Không tìm thấy câu hỏi trong file Excel".to_string()));
    }

    let batch_body = BatchImportBody { questions };
    // Insert all questions
    let mut inserted = 0i64;
    let now = chrono::Utc::now();
    for q in &batch_body.questions {
        if q.content.trim().is_empty() { continue; }
        let id = format!("cq{}", Uuid::new_v4().to_string().replace('-', ""));
        let question_type = q.question_type.as_deref().unwrap_or("MCQ");
        let subject = q.subject.as_deref().unwrap_or(&default_subject);
        let grade = q.grade.as_deref().unwrap_or(&default_grade);
        let difficulty = q.difficulty.as_deref().unwrap_or("MEDIUM");
        let topic = q.topic.as_deref().unwrap_or(subject);
        let explanation = q.explanation.as_deref().unwrap_or("");
        let correct_answer = q.correct_answer.as_deref().unwrap_or("");
        let options: Vec<&str> = q.options.as_ref().map(|v| v.iter().map(|s| s.as_str()).collect()).unwrap_or_default();

        let result = sqlx::query(
            r#"INSERT INTO "Question" (id, topic, subject, grade, "questionType", difficulty,
               content, options, "correctAnswer", explanation, "learningObjectives", keywords, tags,
               status, "createdBy", "aiGenerated", "humanReviewed", "usageCount", "createdAt", "updatedAt")
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Đã duyệt',$14,false,false,0,$15,$15)
               ON CONFLICT (id) DO NOTHING"#,
        )
        .bind(&id).bind(topic).bind(subject).bind(grade).bind(question_type).bind(difficulty)
        .bind(q.content.trim()).bind(&options).bind(correct_answer).bind(explanation)
        .bind(&[] as &[String]).bind(&[] as &[String]).bind(&[] as &[String])
        .bind(&created_by).bind(now)
        .execute(&state.db)
        .await;

        if let Ok(r) = result { if r.rows_affected() > 0 { inserted += 1; } }
    }

    Ok(Json(serde_json::json!({
        "success": true,
        "data": { "inserted": inserted },
        "message": format!("Đã import {} câu hỏi từ Excel", inserted)
    })))
}

// ── Helpers ───────────────────────────────────────────────────────────────

fn extract_user_id_optional(state: &AppState, headers: &HeaderMap) -> String {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .and_then(|token| state.media.validate_token(token).ok())
        .map(|claims| claims.sub)
        .unwrap_or_else(|| "import".to_string())
}
