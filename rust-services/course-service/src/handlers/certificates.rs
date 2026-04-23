use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use serde::Serialize;
use uuid::Uuid;

use crate::AppState;
use crate::error::{CourseError, Result};
use super::require_user_id;

// ── Response shape ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct CertificateUser {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct CertificateCourse {
    pub title: String,
    pub slug: String,
    pub user: CertificateUser,
}

#[derive(Debug, Serialize)]
pub struct CertificateResponse {
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "courseId")]
    pub course_id: String,
    #[serde(rename = "completedAt")]
    pub completed_at: String,
    pub user: CertificateUser,
    pub course: CertificateCourse,
}

// ── DB row helpers ────────────────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
struct CertRow {
    id: String,
    user_id: String,
    course_id: String,
    completed_at: chrono::DateTime<chrono::Utc>,
}

#[derive(sqlx::FromRow)]
struct CourseRow {
    id: String,
    title: String,
    user_id: String,
}

// ── Handler ───────────────────────────────────────────────────────────────────

/// GET /api/learning/certificate/:courseId
///
/// Returns an existing certificate, or issues a new one if the student has
/// completed every published chapter in the course.
pub async fn get_or_issue_certificate(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(course_id): Path<String>,
) -> Result<Json<CertificateResponse>> {
    let user_id = require_user_id(&state, &headers)?;

    // Extract email from token for display name (best we can do without a user service)
    let user_email = {
        let auth = headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.strip_prefix("Bearer "))
            .unwrap_or("");
        state.course.validate_token(auth)
            .map(|c| c.email)
            .unwrap_or_else(|_| user_id.clone())
    };

    // 1. Look up the course
    let course: CourseRow = sqlx::query_as(
        r#"SELECT id, title, "userId" AS user_id FROM "Course" WHERE id = $1"#
    )
    .bind(&course_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| CourseError::Database(e))?
    .ok_or_else(|| CourseError::NotFound("Khoá học không tồn tại".into()))?;

    // 2. Check for existing certificate
    let existing: Option<CertRow> = sqlx::query_as(
        r#"SELECT id, "userId" AS user_id, "courseId" AS course_id, "completedAt" AS completed_at
           FROM "Certificate"
           WHERE "userId" = $1 AND "courseId" = $2"#
    )
    .bind(&user_id)
    .bind(&course_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| CourseError::Database(e))?;

    if let Some(cert) = existing {
        return Ok(Json(build_response(cert, &user_email, &course)));
    }

    // 3. Verify 100% completion — count published chapters vs completed
    let total: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM "Chapter"
           WHERE "courseId" = $1 AND "isPublished" = true"#
    )
    .bind(&course_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| CourseError::Database(e))?;

    if total == 0 {
        return Err(CourseError::Validation(
            "Khoá học chưa có bài học nào được xuất bản".into()
        ));
    }

    let completed: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM "UserProgress" up
           INNER JOIN "Chapter" ch ON ch.id = up."chapterId"
           WHERE up."userId" = $1
             AND ch."courseId" = $2
             AND ch."isPublished" = true
             AND up."isCompleted" = true"#
    )
    .bind(&user_id)
    .bind(&course_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| CourseError::Database(e))?;

    if completed < total {
        return Err(CourseError::Validation(format!(
            "Chưa hoàn thành khoá học ({}/{} bài)",
            completed, total
        )));
    }

    // 4. Issue certificate
    let cert_id = Uuid::new_v4().to_string();
    let cert: CertRow = sqlx::query_as(
        r#"INSERT INTO "Certificate" (id, "userId", "courseId")
           VALUES ($1, $2, $3)
           ON CONFLICT ("userId", "courseId") DO UPDATE
             SET "completedAt" = NOW()
           RETURNING id, "userId" AS user_id, "courseId" AS course_id, "completedAt" AS completed_at"#
    )
    .bind(&cert_id)
    .bind(&user_id)
    .bind(&course_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| CourseError::Database(e))?;

    Ok(Json(build_response(cert, &user_email, &course)))
}

fn build_response(
    cert: CertRow,
    user_email: &str,
    course: &CourseRow,
) -> CertificateResponse {
    CertificateResponse {
        id: cert.id,
        user_id: cert.user_id.clone(),
        course_id: cert.course_id,
        completed_at: cert.completed_at.to_rfc3339(),
        user: CertificateUser {
            id: cert.user_id,
            name: user_email.to_string(),
        },
        course: CertificateCourse {
            title: course.title.clone(),
            slug: course.id.clone(), // use id as slug fallback
            user: CertificateUser {
                id: course.user_id.clone(),
                name: course.user_id.clone(), // no name table — show id; UI can override
            },
        },
    }
}
