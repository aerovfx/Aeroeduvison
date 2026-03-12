use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use axum::extract::Path;
use serde::{Deserialize, Serialize};

use super::require_user_id;
use crate::AppState;
use crate::error::Result;
use crate::models::{PlgData, StudentSkill, LearningInteraction, Recommendation};

#[derive(Debug, Deserialize)]
pub struct UpdateXpBody {
    pub xp: i32,
    pub subject: Option<String>,
    pub lesson_title: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct XpResponse {
    pub success: bool,
    pub xp: i32,
    pub level: i32,
    pub xp_gained: i32,
    pub subject: Option<String>,
    pub lesson_title: Option<String>,
}

/// POST /api/user/xp
pub async fn update_xp(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<UpdateXpBody>,
) -> Result<Json<XpResponse>> {
    if body.xp <= 0 {
        return Err(crate::error::StudentError::InvalidRequest);
    }

    let user_id = require_user_id(&state, &headers)?;
    tracing::debug!(user_id = %user_id, xp = body.xp, "XP update request");

    // Calculate level: level = floor(XP / 100) + 1
    let level = (body.xp / 100) + 1;

    // TODO: Update user XP in database
    // For now, return calculated values

    Ok(Json(XpResponse {
        success: true,
        xp: body.xp,
        level,
        xp_gained: body.xp,
        subject: body.subject,
        lesson_title: body.lesson_title,
    }))
}

#[derive(Debug, Deserialize)]
pub struct UpdateSkillBody {
    pub skill_name: String,
    pub proficiency_level: f64,
}

/// POST /api/plg/:student_id/update-skill
pub async fn update_skill(
    State(_state): State<AppState>,
    Path(student_id): Path<String>,
    Json(body): Json<UpdateSkillBody>,
) -> Result<Json<serde_json::Value>> {
    // Update or insert skill
    let skill = sqlx::query_as::<_, StudentSkill>(
        r#"
        INSERT INTO "StudentSkill" (id, student_id, skill_name, proficiency_level, last_practiced, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (student_id, skill_name) DO UPDATE SET
            proficiency_level = EXCLUDED.proficiency_level,
            last_practiced = EXCLUDED.last_practiced,
            updated_at = EXCLUDED.updated_at
        RETURNING *
        "#
    )
    .bind(format!("skill_{}_{}", chrono::Utc::now().timestamp(), uuid::Uuid::new_v4()))
    .bind(&student_id)
    .bind(&body.skill_name)
    .bind(body.proficiency_level)
    .bind(chrono::Utc::now())
    .bind(chrono::Utc::now())
    .bind(chrono::Utc::now())
    .fetch_one(&_state.db)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "skill": {
            "skill_name": skill.skill_name,
            "proficiency_level": skill.proficiency_level,
            "last_practiced": skill.last_practiced
        }
    })))
}

#[derive(Debug, Deserialize)]
pub struct RecordInteractionBody {
    pub content_id: String,
    pub interaction_type: String,
    pub score: Option<f64>,
    pub time_spent_seconds: i32,
}

/// POST /api/plg/:student_id/record-interaction
pub async fn record_interaction(
    State(_state): State<AppState>,
    Path(student_id): Path<String>,
    Json(body): Json<RecordInteractionBody>,
) -> Result<Json<serde_json::Value>> {
    // Record learning interaction
    let interaction = sqlx::query_as::<_, LearningInteraction>(
        r#"
        INSERT INTO "LearningInteraction" (id, student_id, content_id, interaction_type, score, time_spent_seconds, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#
    )
    .bind(format!("interaction_{}_{}", chrono::Utc::now().timestamp(), uuid::Uuid::new_v4()))
    .bind(&student_id)
    .bind(&body.content_id)
    .bind(&body.interaction_type)
    .bind(&body.score)
    .bind(body.time_spent_seconds)
    .bind(chrono::Utc::now())
    .fetch_one(&_state.db)
    .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "interaction_id": interaction.id
    })))
}

/// GET /api/plg/:student_id
pub async fn get_plg_data(
    State(state): State<AppState>,
    Path(student_id): Path<String>,
) -> Result<Json<PlgData>> {
    // Get student skills
    let skills = sqlx::query_as::<_, StudentSkill>(
        r#"SELECT * FROM "StudentSkill" WHERE student_id = $1 ORDER BY proficiency_level DESC"#
    )
    .bind(&student_id)
    .fetch_all(&state.db)
    .await?;

    // Get recent interactions
    let interactions = sqlx::query_as::<_, LearningInteraction>(
        r#"SELECT * FROM "LearningInteraction" WHERE student_id = $1 ORDER BY created_at DESC LIMIT 10"#
    )
    .bind(&student_id)
    .fetch_all(&state.db)
    .await?;

    let skill_infos: Vec<_> = skills.into_iter().map(|s| {
        crate::models::SkillInfo {
            skill_name: s.skill_name,
            proficiency_level: s.proficiency_level,
            last_practiced: s.last_practiced,
        }
    }).collect();

    let interaction_summaries: Vec<_> = interactions.into_iter().map(|i| {
        crate::models::InteractionSummary {
            content_id: i.content_id,
            interaction_type: i.interaction_type,
            score: i.score,
            created_at: i.created_at,
        }
    }).collect();

    Ok(Json(PlgData {
        student_id,
        skills: skill_infos,
        recent_interactions: interaction_summaries,
        learning_path: None, // TODO: Get learning path
    }))
}

#[derive(Debug, Serialize)]
pub struct RecommendationsResponse {
    pub recommendations: Vec<Recommendation>,
}

/// GET /api/plg/:student_id/recommendations
pub async fn get_recommendations(
    State(_state): State<AppState>,
    Path(_student_id): Path<String>,
) -> Result<Json<RecommendationsResponse>> {
    // Generate recommendations based on student skills and interactions
    // This is a placeholder - real implementation would use ML/AI
    let recommendations = vec![
        Recommendation {
            content_id: "content_1".to_string(),
            content_type: "lesson".to_string(),
            title: "Recommended Lesson 1".to_string(),
            reason: "Based on your recent activity".to_string(),
            priority: 1,
        },
        Recommendation {
            content_id: "content_2".to_string(),
            content_type: "quiz".to_string(),
            title: "Practice Quiz".to_string(),
            reason: "Improve your weak skills".to_string(),
            priority: 2,
        },
    ];

    Ok(Json(RecommendationsResponse {
        recommendations,
    }))
}
