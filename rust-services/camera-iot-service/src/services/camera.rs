use crate::db::DbPool;
use crate::error::AppError;
use crate::models::{Camera, CreateCameraRequest, UpdateCameraRequest};
use uuid::Uuid;
use chrono::Utc;

#[derive(Clone)]
pub struct CameraService {
    pool: DbPool,
}

impl CameraService {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
      }

    pub async fn list_cameras(&self) -> Result<Vec<Camera>, AppError> {
        let cameras = sqlx::query_as::<_, Camera>(
            "SELECT * FROM cameras ORDER BY created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;
        
        Ok(cameras)
    }

    pub async fn list_cameras_for_classes(&self, class_ids: Vec<String>) -> Result<Vec<Camera>, AppError> {
        let cameras = sqlx::query_as::<_, Camera>(
            "SELECT * FROM cameras WHERE class_id = ANY($1) ORDER BY created_at DESC"
        )
        .bind(class_ids)
        .fetch_all(&self.pool)
        .await?;
        
        Ok(cameras)
    }

    pub async fn get_camera(&self, id: Uuid) -> Result<Camera, AppError> {
        let camera = sqlx::query_as::<_, Camera>(
            "SELECT * FROM cameras WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Camera with id {} not found", id)))?;

        Ok(camera)
    }

    pub async fn create_camera(&self, req: CreateCameraRequest) -> Result<Camera, AppError> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        
        let camera = sqlx::query_as::<_, Camera>(
            r#"
            INSERT INTO cameras (
                id, name, rtsp_url, brand, location, location_type, room_number, 
                status, is_active, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
            "#
        )
        .bind(id)
        .bind(req.name)
        .bind(req.rtsp_url)
        .bind(req.brand)
        .bind(req.location)
        .bind(req.location_type)
        .bind(req.room_number)
        .bind("offline") // Initial status
        .bind(true)
        .bind(now)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(camera)
    }

    pub async fn update_camera(&self, id: Uuid, req: UpdateCameraRequest) -> Result<Camera, AppError> {
        let now = Utc::now();
        
        // This is a simplified update. In a real app, we'd use a builder or dynamic query
        let camera = sqlx::query_as::<_, Camera>(
            r#"
            UPDATE cameras 
            SET name = COALESCE($1, name),
                rtsp_url = COALESCE($2, rtsp_url),
                brand = COALESCE($3, brand),
                location = COALESCE($4, location),
                location_type = COALESCE($5, location_type),
                room_number = COALESCE($6, room_number),
                updated_at = $7
            WHERE id = $8
            RETURNING *
            "#
        )
        .bind(req.name)
        .bind(req.rtsp_url)
        .bind(req.brand)
        .bind(req.location)
        .bind(req.location_type)
        .bind(req.room_number)
        .bind(now)
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Camera with id {} not found", id)))?;

        Ok(camera)
    }

    pub async fn delete_camera(&self, id: Uuid) -> Result<(), AppError> {
        let rows_affected = sqlx::query("DELETE FROM cameras WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?
            .rows_affected();

        if rows_affected == 0 {
            return Err(AppError::NotFound(format!("Camera with id {} not found", id)));
        }

        Ok(())
    }

    pub async fn assign_camera(&self, camera_id: Uuid, class_id: String) -> Result<Camera, AppError> {
        let now = Utc::now();
        
        let camera = sqlx::query_as::<_, Camera>(
            r#"
            UPDATE cameras 
            SET assigned_to = $1,
                class_id = $1,
                updated_at = $2
            WHERE id = $3
            RETURNING *
            "#
        )
        .bind(class_id)
        .bind(now)
        .bind(camera_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Camera with id {} not found", camera_id)))?;

        Ok(camera)
    }
}
