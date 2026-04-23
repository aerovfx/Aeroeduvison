use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use serde_json::json;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{
        AuthUser, LocalCheckResponse, LocalSetupResponse, LocalTranscribeResponse,
        SaveTranscriptRequest, SummarizeResponse, TranscriptHistoryQuery, TranscriptListResponse,
        TranscriptRecord, TranscriptResponse, UpdateTranscriptRequest,
    },
    AppState,
};

/// POST /api/transcript - Main transcription endpoint (proxy to SONIOX or stub)
pub async fn transcribe(
    State(state): State<AppState>,
    _user: AuthUser,
    Json(_body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Stub response: in production, would call SONIOX API
    Ok(Json(json!({
        "success": false,
        "error": "Transcription service not implemented on this endpoint. Use /api/transcript/local/transcribe or external services."
    })))
}

/// POST /api/transcript/save - Save transcript record to database
pub async fn save_transcript(
    State(state): State<AppState>,
    user: AuthUser,
    Json(body): Json<SaveTranscriptRequest>,
) -> Result<(StatusCode, Json<TranscriptResponse>), AppError> {
    // Validate content
    if body.content.is_empty() {
        return Err(AppError::ValidationError(
            "Transcript content cannot be empty".to_string(),
        ));
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let word_count = body.content.split_whitespace().count() as i32;

    // Insert into database
    let record = sqlx::query_as::<_, TranscriptRecord>(
        r#"
        INSERT INTO "TranscriptRecord"
        (id, user_id, title, content, transcript_type, language, duration_ms, word_count, source_url, file_name, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, user_id, title, content, transcript_type, language, duration_ms, word_count, source_url, file_name, metadata, created_at, updated_at
        "#
    )
    .bind(&id)
    .bind(&user.id)
    .bind(&body.title)
    .bind(&body.content)
    .bind(&body.transcript_type)
    .bind(&body.language)
    .bind(body.duration_ms)
    .bind(word_count)
    .bind(&body.source_url)
    .bind(&body.file_name)
    .bind(&body.metadata)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(TranscriptResponse {
            success: true,
            data: record,
        }),
    ))
}

/// GET /api/transcript/history - List user's transcripts with filtering
pub async fn get_transcript_history(
    State(state): State<AppState>,
    user: AuthUser,
    Query(query): Query<TranscriptHistoryQuery>,
) -> Result<Json<TranscriptListResponse>, AppError> {
    let limit = query.limit.unwrap_or(50).min(500);
    let offset = query.offset.unwrap_or(0);

    let records = if let Some(transcript_type) = &query.transcript_type {
        sqlx::query_as::<_, TranscriptRecord>(
            r#"
            SELECT id, user_id, title, content, transcript_type, language, duration_ms, word_count, source_url, file_name, metadata, created_at, updated_at
            FROM "TranscriptRecord"
            WHERE user_id = $1 AND transcript_type = $2
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
            "#
        )
        .bind(&user.id)
        .bind(transcript_type)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.db)
        .await?
    } else {
        sqlx::query_as::<_, TranscriptRecord>(
            r#"
            SELECT id, user_id, title, content, transcript_type, language, duration_ms, word_count, source_url, file_name, metadata, created_at, updated_at
            FROM "TranscriptRecord"
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#
        )
        .bind(&user.id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.db)
        .await?
    };

    let count = records.len() as i64;

    Ok(Json(TranscriptListResponse {
        success: true,
        data: records,
        count,
    }))
}

/// DELETE /api/transcript/:id - Delete a transcript (ownership check)
pub async fn delete_transcript(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let result = sqlx::query(
        r#"
        DELETE FROM "TranscriptRecord"
        WHERE id = $1 AND user_id = $2
        "#
    )
    .bind(&id)
    .bind(&user.id)
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(
            "Transcript not found or unauthorized".to_string(),
        ));
    }

    Ok(Json(json!({
        "success": true,
        "message": "Transcript deleted"
    })))
}

/// PATCH /api/transcript/:id - Update transcript record
pub async fn update_transcript(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(body): Json<UpdateTranscriptRequest>,
) -> Result<Json<TranscriptResponse>, AppError> {
    // Fetch existing record to verify ownership
    let existing = sqlx::query_as::<_, TranscriptRecord>(
        r#"
        SELECT id, user_id, title, content, transcript_type, language, duration_ms, word_count, source_url, file_name, metadata, created_at, updated_at
        FROM "TranscriptRecord"
        WHERE id = $1 AND user_id = $2
        "#
    )
    .bind(&id)
    .bind(&user.id)
    .fetch_optional(&state.db)
    .await?;

    let existing = existing.ok_or_else(|| {
        AppError::NotFound("Transcript not found or unauthorized".to_string())
    })?;

    let new_title = body.title.or(existing.title);
    let new_content = body.content.unwrap_or(existing.content);
    let now = Utc::now();

    let record = sqlx::query_as::<_, TranscriptRecord>(
        r#"
        UPDATE "TranscriptRecord"
        SET title = $1, content = $2, updated_at = $3
        WHERE id = $4 AND user_id = $5
        RETURNING id, user_id, title, content, transcript_type, language, duration_ms, word_count, source_url, file_name, metadata, created_at, updated_at
        "#
    )
    .bind(&new_title)
    .bind(&new_content)
    .bind(now)
    .bind(&id)
    .bind(&user.id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(TranscriptResponse {
        success: true,
        data: record,
    }))
}

/// POST /api/transcript/summarize - Proxy to AI service or stub
pub async fn summarize_transcript(
    State(state): State<AppState>,
    _user: AuthUser,
    Json(_body): Json<serde_json::Value>,
) -> Result<Json<SummarizeResponse>, AppError> {
    // Try to forward to AI service, fallback to stub
    match reqwest::Client::new()
        .post(format!("{}/api/ai-tutor-chat", state.ai_service_url))
        .json(&_body)
        .send()
        .await
    {
        Ok(_response) => Ok(Json(SummarizeResponse {
            success: true,
            summary: "Summary delegated to AI service".to_string(),
            delegated: Some(true),
        })),
        Err(_) => Ok(Json(SummarizeResponse {
            success: false,
            summary: "Feature delegated to AI service".to_string(),
            delegated: Some(true),
        })),
    }
}

/// POST /api/transcript/elevenlabs/transcribe - Proxy to ElevenLabs API
pub async fn elevenlabs_transcribe(
    State(state): State<AppState>,
    _user: AuthUser,
    body: axum::body::Body,
) -> Result<Json<serde_json::Value>, AppError> {
    if state.elevenlabs_api_key.is_none() {
        return Ok(Json(json!({
            "success": false,
            "error": "ElevenLabs API key not configured"
        })));
    }

    // In production, would forward to ElevenLabs API
    // For now, return stub response
    Ok(Json(json!({
        "success": false,
        "error": "ElevenLabs transcription not fully implemented"
    })))
}

/// GET /api/transcript/local/check-models - Check for MLX models in cache
pub async fn check_models(
    _user: AuthUser,
) -> Result<Json<LocalCheckResponse>, AppError> {
    let cache_path = std::path::Path::new("~/.cache/huggingface/hub/");
    let exists = cache_path.exists();

    Ok(Json(LocalCheckResponse {
        success: true,
        available: exists,
        path: Some("~/.cache/huggingface/hub/".to_string()),
        message: if exists {
            Some("MLX models cache found".to_string())
        } else {
            Some("MLX models cache not found".to_string())
        },
    }))
}

/// GET /api/transcript/local/check-python - Check if python3 is installed
pub async fn check_python(
    _user: AuthUser,
) -> Result<Json<LocalCheckResponse>, AppError> {
    match std::process::Command::new("python3")
        .arg("--version")
        .output()
    {
        Ok(output) => {
            let version = String::from_utf8_lossy(&output.stdout);
            Ok(Json(LocalCheckResponse {
                success: true,
                available: true,
                path: Some("/usr/bin/python3".to_string()),
                message: Some(format!("Python found: {}", version.trim())),
            }))
        }
        Err(_) => Ok(Json(LocalCheckResponse {
            success: true,
            available: false,
            path: None,
            message: Some("Python3 not found in PATH".to_string()),
        })),
    }
}

/// GET /api/transcript/local/check-venv - Check for venv at standard location
pub async fn check_venv(
    _user: AuthUser,
) -> Result<Json<LocalCheckResponse>, AppError> {
    let venv_path = std::path::Path::new("~/Library/Application Support/Aeroeduvison/mlx-env/bin/python3");
    let exists = venv_path.exists();

    Ok(Json(LocalCheckResponse {
        success: true,
        available: exists,
        path: Some("~/Library/Application Support/Aeroeduvison/mlx-env/bin/python3".to_string()),
        message: if exists {
            Some("Virtual environment found".to_string())
        } else {
            Some("Virtual environment not found - run setup first".to_string())
        },
    }))
}

/// POST /api/transcript/local/setup - Run setup script or return stub
pub async fn setup_local(
    _user: AuthUser,
) -> Result<Json<LocalSetupResponse>, AppError> {
    // Stub response: in production would run shell setup script
    Ok(Json(LocalSetupResponse {
        success: false,
        message: "Local MLX environment setup not available on this server. Please run setup script locally.".to_string(),
    }))
}

/// POST /api/transcript/local/transcribe - Shell out to python script or stub
pub async fn transcribe_local(
    _user: AuthUser,
    Json(_body): Json<serde_json::Value>,
) -> Result<Json<LocalTranscribeResponse>, AppError> {
    // Stub response: in production would call local MLX script via tokio::process::Command
    Ok(Json(LocalTranscribeResponse {
        success: false,
        transcript: None,
        error: Some("Local transcription not available on server. Use local deployment.".to_string()),
    }))
}

/// POST /api/transcript/local/transcribe-stream - Streaming transcription stub
pub async fn transcribe_stream(
    _user: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    // Stub response: in production would return Server-Sent Events stream
    Ok(Json(json!({
        "success": false,
        "error": "Streaming transcription not implemented",
        "note": "SSE streaming would be implemented here"
    })))
}
