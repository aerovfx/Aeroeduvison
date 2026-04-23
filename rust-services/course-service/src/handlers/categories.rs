use axum::extract::{Path, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use crate::error::{CourseError, Result};

// ── Models ────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct CategoryRow {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub slug: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCategoryBody {
    pub name: String,
    pub slug: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCategoryBody {
    pub name: Option<String>,
    pub slug: Option<String>,
    pub description: Option<String>,
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// GET /api/categories
pub async fn list_categories(
    State(state): State<AppState>,
) -> Result<Json<Vec<CategoryRow>>> {
    let categories: Vec<CategoryRow> = sqlx::query_as(
        r#"SELECT id, name,
           NULL::text AS slug,
           NULL::text AS description
           FROM "Category" ORDER BY name ASC"#
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    Ok(Json(categories))
}

/// GET /api/categories/:id
pub async fn get_category(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<CategoryRow>> {
    let cat: CategoryRow = sqlx::query_as(
        r#"SELECT id, name,
           NULL::text AS slug,
           NULL::text AS description
           FROM "Category" WHERE id = $1"#
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| CourseError::Database(e))?
    .ok_or_else(|| CourseError::NotFound("Category not found".into()))?;

    Ok(Json(cat))
}

/// POST /api/categories
pub async fn create_category(
    State(state): State<AppState>,
    Json(body): Json<CreateCategoryBody>,
) -> Result<Json<CategoryRow>> {
    let id = Uuid::new_v4().to_string();
    let name = body.name.trim().to_string();

    if name.is_empty() {
        return Err(CourseError::Validation("Tên danh mục không được để trống".into()));
    }

    // Check duplicate name
    let exists: bool = sqlx::query_scalar(r#"SELECT EXISTS(SELECT 1 FROM "Category" WHERE lower(name) = lower($1))"#)
        .bind(&name)
        .fetch_one(&state.db)
        .await
        .unwrap_or(false);

    if exists {
        return Err(CourseError::Conflict("Danh mục đã tồn tại".into()));
    }

    sqlx::query(r#"INSERT INTO "Category" (id, name) VALUES ($1, $2)"#)
        .bind(&id)
        .bind(&name)
        .execute(&state.db)
        .await
        .map_err(|e| CourseError::Database(e))?;

    Ok(Json(CategoryRow { id, name, slug: body.slug, description: body.description }))
}

/// PUT /api/categories/:id
pub async fn update_category(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<UpdateCategoryBody>,
) -> Result<Json<CategoryRow>> {
    // Check exists
    let existing: Option<CategoryRow> = sqlx::query_as(
        r#"SELECT id, name, NULL::text AS slug, NULL::text AS description
           FROM "Category" WHERE id = $1"#
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| CourseError::Database(e))?;

    let existing = existing.ok_or_else(|| CourseError::NotFound("Category not found".into()))?;

    let new_name = body.name.as_deref().map(str::trim).unwrap_or(&existing.name).to_string();

    sqlx::query(r#"UPDATE "Category" SET name = $1 WHERE id = $2"#)
        .bind(&new_name)
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| CourseError::Database(e))?;

    Ok(Json(CategoryRow {
        id,
        name: new_name,
        slug: body.slug,
        description: body.description,
    }))
}

/// DELETE /api/categories/:id
pub async fn delete_category(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>> {
    let result = sqlx::query(r#"DELETE FROM "Category" WHERE id = $1"#)
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| CourseError::Database(e))?;

    if result.rows_affected() == 0 {
        return Err(CourseError::NotFound("Category not found".into()));
    }

    Ok(Json(serde_json::json!({ "success": true, "deleted_id": id })))
}
