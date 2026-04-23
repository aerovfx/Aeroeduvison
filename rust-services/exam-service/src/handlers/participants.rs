use axum::{
    extract::{State, Path},
    Json,
};
use serde_json::json;
use uuid::Uuid;

use crate::error::AppError;
use crate::models::{
    AuthUser, Question, QuestionForStudent,
    ExamQuestionListResponse, SubmitAnswersRequest, SubmitAnswersResponse, SubmitAnswersData,
    JoinRoomRequest, JoinRoomResponse,
};
use crate::AppState;

pub async fn get_exam_questions(
    State(state): State<AppState>,
    Path(room_id): Path<String>,
) -> Result<Json<ExamQuestionListResponse>, AppError> {
    let questions: Vec<Question> = sqlx::query_as(
        r#"
        SELECT
            q.id,
            q.content,
            q.options,
            q."questionType" as question_type,
            q."correctAnswer" as correct_answer,
            q.explanation
        FROM "Question" q
        JOIN "ExamRoomQuestion" erq ON q.id = erq."questionId"
        WHERE erq."examRoomId" = $1
        ORDER BY erq.position ASC
        "#
    )
    .bind(&room_id)
    .fetch_all(&state.db)
    .await?;

    // Strip correct_answer for students
    let questions_for_student: Vec<QuestionForStudent> = questions
        .into_iter()
        .map(|q| QuestionForStudent {
            id: q.id,
            content: q.content,
            options: q.options,
            question_type: q.question_type,
        })
        .collect();

    Ok(Json(ExamQuestionListResponse {
        success: true,
        data: questions_for_student,
    }))
}

pub async fn submit_answers(
    State(state): State<AppState>,
    Path(room_id): Path<String>,
    AuthUser { id: student_id, .. }: AuthUser,
    Json(req): Json<SubmitAnswersRequest>,
) -> Result<Json<SubmitAnswersResponse>, AppError> {
    // Get all questions for grading
    let questions: Vec<Question> = sqlx::query_as(
        r#"
        SELECT
            q.id,
            q.content,
            q.options,
            q."questionType" as question_type,
            q."correctAnswer" as correct_answer,
            q.explanation
        FROM "Question" q
        JOIN "ExamRoomQuestion" erq ON q.id = erq."questionId"
        WHERE erq."examRoomId" = $1
        ORDER BY erq.position ASC
        "#
    )
    .bind(&room_id)
    .fetch_all(&state.db)
    .await?;

    // Auto-grade MCQ and True-False
    let mut score = 0.0;
    let total_points = questions.len() as f64;

    if let serde_json::Value::Object(answers_map) = &req.answers {
        for question in questions {
            if let Some(student_answer) = answers_map.get(&question.id) {
                let correct_answer = question.correct_answer.unwrap_or_default();
                let student_answer_str = student_answer.as_str().unwrap_or("");

                // Check if answer is correct for MCQ/True-False
                if question.question_type.as_deref() == Some("MCQ")
                    || question.question_type.as_deref() == Some("TrueOrFalse")
                {
                    if student_answer_str == correct_answer {
                        score += 1.0;
                    }
                }
            }
        }
    }

    let percentage = if total_points > 0.0 {
        (score / total_points) * 100.0
    } else {
        0.0
    };

    // Update or insert participant record
    sqlx::query(
        r#"
        INSERT INTO "ExamRoomParticipant" (
            id, "examRoomId", "studentId", "joinedAt", score, "submittedAt", answers
        )
        VALUES ($1, $2, $3, NOW(), $4, NOW(), $5)
        ON CONFLICT ("examRoomId", "studentId")
        DO UPDATE SET
            score = $4,
            "submittedAt" = NOW(),
            answers = $5
        "#
    )
    .bind(Uuid::new_v4().to_string())
    .bind(&room_id)
    .bind(&student_id)
    .bind(score)
    .bind(&req.answers)
    .execute(&state.db)
    .await?;

    Ok(Json(SubmitAnswersResponse {
        success: true,
        data: SubmitAnswersData {
            score,
            total_points,
            percentage,
            graded: true,
        },
    }))
}

pub async fn join_room(
    State(state): State<AppState>,
    AuthUser { id: student_id, .. }: AuthUser,
    Json(req): Json<JoinRoomRequest>,
) -> Result<Json<JoinRoomResponse>, AppError> {
    // Find room by access code or room ID
    let room_id = if let Some(access_code) = req.access_code {
        let result: (String,) = sqlx::query_as(
            r#"SELECT id FROM "OnlineExamRoom" WHERE "accessCode" = $1"#
        )
        .bind(&access_code)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Invalid access code".to_string()))?;
        result.0
    } else if let Some(room_id) = req.room_id {
        // Verify room exists and is public
        let result: (bool,) = sqlx::query_as(
            r#"SELECT "isPublic" FROM "OnlineExamRoom" WHERE id = $1"#
        )
        .bind(&room_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Room not found".to_string()))?;

        if !result.0 {
            return Err(AppError::Forbidden("Room is not public".to_string()));
        }
        room_id
    } else {
        return Err(AppError::BadRequest("access_code or room_id required".to_string()));
    };

    // Check max students
    let room_info: (i32, Option<i32>) = sqlx::query_as(
        r#"
        SELECT (SELECT COUNT(*) FROM "ExamRoomParticipant" WHERE "examRoomId" = $1),
               "maxStudents"
        FROM "OnlineExamRoom"
        WHERE id = $1
        "#
    )
    .bind(&room_id)
    .fetch_one(&state.db)
    .await?;

    let (current_count, max_students) = room_info;
    if let Some(max) = max_students {
        if current_count >= max {
            return Err(AppError::Forbidden("Room is full".to_string()));
        }
    }

    // Insert or get participant
    let participant_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO "ExamRoomParticipant" (id, "examRoomId", "studentId", "joinedAt")
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT ("examRoomId", "studentId")
        DO NOTHING
        "#
    )
    .bind(&participant_id)
    .bind(&room_id)
    .bind(&student_id)
    .execute(&state.db)
    .await?;

    Ok(Json(JoinRoomResponse {
        success: true,
        data: json!({
            "roomId": room_id,
            "studentId": student_id,
            "message": "Successfully joined room"
        }),
    }))
}
