use axum::{
    extract::{State, Path, Query},
    Json,
    http::StatusCode,
};
use serde_json::json;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::{
    AuthUser, ExamSummary, ExamDetail, QuestionDetail, ExamWithQuestions,
    ExamListResponse, ExamDetailResponse, DuplicateExamResponse, DeleteResponse,
    CreateExamRequest, CreateExamResponse, AnswerKeyQuestion, AnswerKeyResponse,
    ListExamsQuery,
};
use crate::AppState;

pub async fn list_exams(
    State(state): State<AppState>,
    Query(query): Query<ListExamsQuery>,
    AuthUser { id: teacher_id, .. }: AuthUser,
) -> Result<Json<ExamListResponse>, AppError> {
    let mut sql = r#"
        SELECT
            id,
            title,
            description,
            "examType" as exam_type,
            status,
            duration,
            "totalQuestions" as total_questions,
            "totalScore" as total_score,
            "createdAt",
            "updatedAt",
            "matrixId" as matrix_id
        FROM "Exam"
        WHERE "userId" = $1
    "#.to_string();

    let mut bindings: Vec<String> = vec![teacher_id.clone()];

    if let Some(status) = query.status {
        sql.push_str(&format!(" AND status = ${}", bindings.len() + 1));
        bindings.push(status);
    }

    if let Some(exam_type) = query.exam_type {
        sql.push_str(&format!(" AND \"examType\" = ${}", bindings.len() + 1));
        bindings.push(exam_type);
    }

    if let Some(search) = query.search {
        let search_term = format!("%{}%", search);
        sql.push_str(&format!(" AND (title ILIKE ${} OR description ILIKE ${})", bindings.len() + 1, bindings.len() + 2));
        bindings.push(search_term.clone());
        bindings.push(search_term);
    }

    sql.push_str(" ORDER BY \"createdAt\" DESC");

    // Build dynamic query
    let exams: Vec<ExamSummary> = match bindings.len() {
        1 => sqlx::query_as(&sql).bind(&bindings[0]).fetch_all(&state.db).await?,
        2 => sqlx::query_as(&sql).bind(&bindings[0]).bind(&bindings[1]).fetch_all(&state.db).await?,
        3 => sqlx::query_as(&sql).bind(&bindings[0]).bind(&bindings[1]).bind(&bindings[2]).fetch_all(&state.db).await?,
        4 => sqlx::query_as(&sql).bind(&bindings[0]).bind(&bindings[1]).bind(&bindings[2]).bind(&bindings[3]).fetch_all(&state.db).await?,
        _ => vec![],
    };

    Ok(Json(ExamListResponse {
        success: true,
        data: exams,
    }))
}

pub async fn get_exam(
    State(state): State<AppState>,
    Path(exam_id): Path<String>,
    AuthUser { id: teacher_id, .. }: AuthUser,
) -> Result<Json<ExamDetailResponse>, AppError> {
    let exam: ExamDetail = sqlx::query_as(
        r#"
        SELECT
            id,
            title,
            description,
            "examType" as exam_type,
            status,
            duration,
            "totalQuestions" as total_questions,
            "totalScore" as total_score,
            "createdAt",
            "updatedAt",
            "matrixId" as matrix_id
        FROM "Exam"
        WHERE id = $1 AND "userId" = $2
        "#
    )
    .bind(&exam_id)
    .bind(&teacher_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Exam not found".to_string()))?;

    let questions: Vec<QuestionDetail> = sqlx::query_as(
        r#"
        SELECT
            q.id,
            q.content,
            q.options,
            q."questionType" as question_type,
            q.explanation,
            q."correctAnswer" as correct_answer
        FROM "Question" q
        JOIN "ExamQuestion" eq ON q.id = eq."questionId"
        WHERE eq."examId" = $1
        ORDER BY eq."order" ASC
        "#
    )
    .bind(&exam_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(ExamDetailResponse {
        success: true,
        data: ExamWithQuestions { exam, questions },
    }))
}

pub async fn delete_exam(
    State(state): State<AppState>,
    Path(exam_id): Path<String>,
    AuthUser { id: teacher_id, .. }: AuthUser,
) -> Result<(StatusCode, Json<DeleteResponse>), AppError> {
    // Verify exam belongs to teacher
    let exam_exists: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(*) FROM "Exam" WHERE id = $1 AND "userId" = $2
        "#
    )
    .bind(&exam_id)
    .bind(&teacher_id)
    .fetch_one(&state.db)
    .await?;

    if exam_exists.0 == 0 {
        return Err(AppError::NotFound("Exam not found".to_string()));
    }

    // Delete exam questions first
    sqlx::query(r#"DELETE FROM "ExamQuestion" WHERE "examId" = $1"#)
        .bind(&exam_id)
        .execute(&state.db)
        .await?;

    // Delete exam
    sqlx::query(r#"DELETE FROM "Exam" WHERE id = $1"#)
        .bind(&exam_id)
        .execute(&state.db)
        .await?;

    Ok((StatusCode::OK, Json(DeleteResponse {
        success: true,
        message: "Exam deleted successfully".to_string(),
    })))
}

pub async fn duplicate_exam(
    State(state): State<AppState>,
    Path(exam_id): Path<String>,
    AuthUser { id: teacher_id, .. }: AuthUser,
) -> Result<Json<DuplicateExamResponse>, AppError> {
    // Get the original exam
    let exam: ExamDetail = sqlx::query_as(
        r#"
        SELECT
            id,
            title,
            description,
            "examType" as exam_type,
            status,
            duration,
            "totalQuestions" as total_questions,
            "totalScore" as total_score,
            "createdAt",
            "updatedAt",
            "matrixId" as matrix_id
        FROM "Exam"
        WHERE id = $1 AND "userId" = $2
        "#
    )
    .bind(&exam_id)
    .bind(&teacher_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Exam not found".to_string()))?;

    // Create new exam with duplicated title
    let new_exam_id = Uuid::new_v4().to_string();
    let new_title = format!("{} (Bản sao)", exam.title);

    sqlx::query(
        r#"
        INSERT INTO "Exam" (id, "userId", title, description, "examType", status, duration, "totalQuestions", "totalScore", "matrixId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        "#
    )
    .bind(&new_exam_id)
    .bind(&teacher_id)
    .bind(&new_title)
    .bind(&exam.description)
    .bind(&exam.exam_type)
    .bind("Nháp") // Reset status to draft
    .bind(exam.duration)
    .bind(exam.total_questions)
    .bind(exam.total_score)
    .bind(&exam.matrix_id)
    .execute(&state.db)
    .await?;

    // Copy exam questions
    sqlx::query(
        r#"
        INSERT INTO "ExamQuestion" (id, "examId", "questionId", "order", "points")
        SELECT gen_random_uuid(), $1, "questionId", "order", "points"
        FROM "ExamQuestion"
        WHERE "examId" = $2
        "#
    )
    .bind(&new_exam_id)
    .bind(&exam_id)
    .execute(&state.db)
    .await?;

    Ok(Json(DuplicateExamResponse {
        success: true,
        data: json!({
            "examId": new_exam_id,
            "title": new_title,
            "message": "Exam duplicated successfully"
        }),
    }))
}

/// POST /api/teacher/exams — create a new exam shell
pub async fn create_exam(
    State(state): State<AppState>,
    AuthUser { id: teacher_id, .. }: AuthUser,
    Json(body): Json<CreateExamRequest>,
) -> Result<Json<CreateExamResponse>, AppError> {
    let exam_id = Uuid::new_v4().to_string();
    let status = body.status.as_deref().unwrap_or("Nháp");

    sqlx::query(
        r#"
        INSERT INTO "Exam" (
            id, "userId", title, description, "examType",
            status, duration, "totalQuestions", "totalScore", "matrixId",
            "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        "#,
    )
    .bind(&exam_id)
    .bind(&teacher_id)
    .bind(&body.title)
    .bind(&body.description)
    .bind(&body.exam_type)
    .bind(status)
    .bind(body.duration)
    .bind(body.total_questions)
    .bind(body.passing_score)   // stored in totalScore column
    .bind(&body.matrix_id)
    .execute(&state.db)
    .await?;

    // Fetch back what we just inserted so the response mirrors list_exams shape
    let exam: ExamSummary = sqlx::query_as(
        r#"
        SELECT
            id,
            title,
            description,
            "examType" as exam_type,
            status,
            duration,
            "totalQuestions" as total_questions,
            "totalScore"      as total_score,
            "createdAt",
            "updatedAt",
            "matrixId"        as matrix_id
        FROM "Exam"
        WHERE id = $1
        "#,
    )
    .bind(&exam_id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(CreateExamResponse { success: true, data: exam }))
}

/// POST /api/teacher/exams/:id/answer-key — save PDF-import answer key
///
/// Creates one Question row per answer entry and links it to the exam via
/// ExamQuestion. Existing questions for this exam are deleted first so this
/// is idempotent (re-submit = replace).
pub async fn save_answer_key(
    State(state): State<AppState>,
    Path(exam_id): Path<String>,
    AuthUser { id: teacher_id, .. }: AuthUser,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<AnswerKeyResponse>, AppError> {
    // Verify ownership
    let exists: (i64,) = sqlx::query_as(
        r#"SELECT COUNT(*) FROM "Exam" WHERE id = $1 AND "userId" = $2"#,
    )
    .bind(&exam_id)
    .bind(&teacher_id)
    .fetch_one(&state.db)
    .await?;

    if exists.0 == 0 {
        return Err(AppError::NotFound("Exam not found".to_string()));
    }

    // Parse questions array (tolerate missing field)
    let questions: Vec<AnswerKeyQuestion> = body
        .get("questions")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    if questions.is_empty() {
        return Ok(Json(AnswerKeyResponse {
            success: true,
            message: "No questions provided".to_string(),
            questions_saved: 0,
        }));
    }

    // Remove old question links for this exam (idempotent re-import)
    sqlx::query(r#"DELETE FROM "ExamQuestion" WHERE "examId" = $1"#)
        .bind(&exam_id)
        .execute(&state.db)
        .await?;

    let mut saved = 0usize;
    for (order, q) in questions.iter().enumerate() {
        let question_id = Uuid::new_v4().to_string();

        // Build a human-readable content label
        let section = q.section.as_deref().unwrap_or("?");
        let idx = q.question_index.unwrap_or((order + 1) as i32);
        let content = format!("Phần {} — Câu {}", section, idx);

        // Encode the correct answer as JSON options for TF, plain string for others
        let options: Option<serde_json::Value> = q.sub_answers.clone();
        let correct = q.correct_answer.clone();

        sqlx::query(
            r#"
            INSERT INTO "Question" (id, content, options, "questionType", "correctAnswer", "createdAt", "updatedAt")
            VALUES ($1, $2, $3::jsonb, $4, $5, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            "#,
        )
        .bind(&question_id)
        .bind(&content)
        .bind(options)
        .bind(&q.question_type)
        .bind(correct)
        .execute(&state.db)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO "ExamQuestion" (id, "examId", "questionId", "order", "points")
            VALUES ($1, $2, $3, $4, 1.0)
            "#,
        )
        .bind(Uuid::new_v4().to_string())
        .bind(&exam_id)
        .bind(&question_id)
        .bind(order as i32)
        .execute(&state.db)
        .await?;

        saved += 1;
    }

    Ok(Json(AnswerKeyResponse {
        success: true,
        message: format!("Saved {} questions", saved),
        questions_saved: saved,
    }))
}
