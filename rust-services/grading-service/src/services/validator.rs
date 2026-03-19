/// Grading validation and consistency checking service.

/// Check consistency across a batch of grading results.
/// Returns (coefficient_of_variation, is_consistent).
pub fn check_consistency(scores: &[f64]) -> (f64, bool) {
    if scores.len() < 2 {
        return (0.0, true);
    }

    let mean = scores.iter().sum::<f64>() / scores.len() as f64;
    if mean < 0.01 {
        return (0.0, true);
    }

    let variance = scores.iter()
        .map(|s| (s - mean).powi(2))
        .sum::<f64>() / scores.len() as f64;
    let std_dev = variance.sqrt();
    let cv = std_dev / mean;

    // Consistent if coefficient of variation < 0.3 (30%)
    (cv, cv < 0.3)
}

/// Compare AI score vs human score and return agreement metrics.
pub fn validate_against_human(ai_score: f64, human_score: f64) -> HumanComparison {
    let diff = (ai_score - human_score).abs();
    let pct_diff = if human_score > 0.0 { diff / human_score * 100.0 } else { 0.0 };
    let within_tolerance = diff <= 1.0;

    let ai_grade = crate::models::score_to_grade(ai_score);
    let human_grade = crate::models::score_to_grade(human_score);
    let grade_match = ai_grade == human_grade;

    let agreement = if diff < 0.5 {
        "excellent"
    } else if diff < 1.0 {
        "high"
    } else if diff < 2.0 {
        "moderate"
    } else {
        "low"
    };

    let agreement_score = (1.0 - (diff / 10.0).min(1.0)) * 100.0;

    HumanComparison {
        score_difference: diff,
        percentage_difference: pct_diff,
        agreement: agreement.to_string(),
        agreement_score,
        within_tolerance,
        grade_level_match: grade_match,
        feedback_similarity: 0.0, // Would need NLP for this
    }
}

/// Find outliers in a batch of scores using z-score.
pub fn find_outliers(scores: &[(String, f64)]) -> Vec<OutlierEntry> {
    if scores.len() < 5 {
        return vec![];
    }

    let values: Vec<f64> = scores.iter().map(|s| s.1).collect();
    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let variance = values.iter()
        .map(|s| (s - mean).powi(2))
        .sum::<f64>() / values.len() as f64;
    let std_dev = variance.sqrt();

    if std_dev < 0.01 {
        return vec![];
    }

    scores.iter()
        .filter_map(|(student_id, score)| {
            let z = (score - mean) / std_dev;
            if z.abs() > 2.0 {
                let reason = if z > 0.0 {
                    "Score significantly above average"
                } else {
                    "Score significantly below average"
                };
                Some(OutlierEntry {
                    student_id: student_id.clone(),
                    reason: reason.to_string(),
                    z_score: z,
                })
            } else {
                None
            }
        })
        .collect()
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HumanComparison {
    pub score_difference: f64,
    pub percentage_difference: f64,
    pub agreement: String,
    pub agreement_score: f64,
    pub within_tolerance: bool,
    pub grade_level_match: bool,
    pub feedback_similarity: f64,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OutlierEntry {
    pub student_id: String,
    pub reason: String,
    pub z_score: f64,
}
