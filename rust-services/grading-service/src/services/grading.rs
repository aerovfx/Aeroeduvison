use sqlx::PgPool;

use crate::error::AppError;
use crate::models::*;
use crate::services::llm::LlmService;

#[derive(Clone)]
pub struct GradingService {
    db: PgPool,
    llm: LlmService,
}

impl GradingService {
    pub fn new(db: PgPool, llm: LlmService) -> Self {
        Self { db, llm }
    }

    /// Grade a single submission using AI.
    pub async fn grade_single(
        &self,
        submission_text: &str,
        subject: &str,
        assignment_type: Option<&str>,
        max_score: f64,
    ) -> Result<AiGradingResult, AppError> {
        let (result, _model) = self.llm.grade_submission(
            submission_text,
            subject,
            assignment_type,
            max_score,
        ).await?;

        let percentage = if max_score > 0.0 { (result.score / max_score) * 100.0 } else { 0.0 };
        let grade = score_to_grade(result.score);

        // Confidence based on response quality heuristics
        let confidence = self.estimate_confidence(&result);

        Ok(AiGradingResult {
            score: result.score,
            percentage,
            grade,
            confidence,
            feedback: GradingFeedbackInternal {
                summary: result.feedback,
                strengths: result.strengths,
                improvements: result.weaknesses,
                suggestions: vec![],
            },
            criteria_scores: vec![],
        })
    }

    /// Detect if a score is an outlier compared to historical grades.
    pub fn detect_outlier(&self, score: f64, historical_scores: &[f64]) -> Option<OutlierAnalysis> {
        if historical_scores.len() < 10 {
            return None;
        }

        let mean = historical_scores.iter().sum::<f64>() / historical_scores.len() as f64;
        let variance = historical_scores.iter()
            .map(|s| (s - mean).powi(2))
            .sum::<f64>() / historical_scores.len() as f64;
        let std_dev = variance.sqrt();

        if std_dev < 0.01 {
            return None;
        }

        let z_score = (score - mean) / std_dev;
        let abs_z = z_score.abs();

        if abs_z > 2.0 {
            let severity = if abs_z > 3.0 { "severe" } else { "moderate" };
            Some(OutlierAnalysis {
                is_outlier: true,
                severity: severity.to_string(),
                z_score,
            })
        } else {
            Some(OutlierAnalysis {
                is_outlier: false,
                severity: "none".to_string(),
                z_score,
            })
        }
    }

    /// Determine if a submission needs human review.
    pub fn needs_review(&self, confidence: f64, outlier: Option<&OutlierAnalysis>, score: f64) -> bool {
        if confidence < CONFIDENCE_HIGH {
            return true;
        }
        if let Some(o) = outlier {
            if o.is_outlier && o.severity == "severe" {
                return true;
            }
        }
        if score >= REVIEW_SCORE_PERFECT || score <= REVIEW_SCORE_FAILING {
            return true;
        }
        false
    }

    /// Get historical scores for a student + assignment combination.
    pub async fn get_historical_scores(
        &self,
        student_id: &str,
        assignment_id: &str,
    ) -> Result<Vec<f64>, AppError> {
        let rows: Vec<(Option<f64>,)> = sqlx::query_as(
            "SELECT score FROM submission WHERE student_id = $1 AND assignment_id = $2::uuid AND status = 'GRADED' ORDER BY graded_at DESC LIMIT 50"
        )
        .bind(student_id)
        .bind(assignment_id)
        .fetch_all(&self.db)
        .await?;

        Ok(rows.into_iter().filter_map(|r| r.0).collect())
    }

    fn estimate_confidence(&self, result: &crate::services::llm::LlmGradingResult) -> f64 {
        let mut confidence: f64 = 0.75;

        // Adjust based on feedback quality
        if result.feedback.len() > 100 { confidence += 0.05; }
        if !result.strengths.is_empty() { confidence += 0.05; }
        if !result.weaknesses.is_empty() { confidence += 0.05; }

        // Cap at 0.95
        confidence.min(0.95)
    }
}
