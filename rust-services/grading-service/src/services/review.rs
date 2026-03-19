use crate::models::*;

/// Calculate review priority based on confidence and score.
pub fn calculate_priority(confidence: Option<f64>, score: Option<f64>) -> String {
    let conf = confidence.unwrap_or(0.0);
    let sc = score.unwrap_or(5.0);

    if conf < CONFIDENCE_CRITICAL || sc >= REVIEW_SCORE_PERFECT || sc <= 1.0 {
        "critical".to_string()
    } else if conf < CONFIDENCE_HIGH || (sc >= 8.0 && sc < REVIEW_SCORE_PERFECT) || sc <= REVIEW_SCORE_FAILING {
        "high".to_string()
    } else if conf < CONFIDENCE_MEDIUM {
        "medium".to_string()
    } else {
        "low".to_string()
    }
}
