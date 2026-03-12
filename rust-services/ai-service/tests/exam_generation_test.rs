//! Exam Generation Tests
//! 
//! Tests for exam generation API endpoints

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;
    use serde_json::json;
    
    // Import test utilities
    use crate::app::create_app;
    use crate::AppState;
    
    // ========================================================================
    // UNIT TESTS
    // ========================================================================
    
    #[test]
    fn test_exam_generation_options_default() {
        let options = ExamGenerationOptions::default();
        
        assert_eq!(options.exam_variant, "A");
        assert!(!options.shuffle_questions);
        assert!(!options.ensure_no_overlap);
    }
    
    #[test]
    fn test_variant_overlap_calculation() {
        // Create mock exams with overlapping questions
        let exam1 = create_mock_exam(vec!["q1", "q2", "q3", "q4", "q5"]);
        let exam2 = create_mock_exam(vec!["q3", "q4", "q6", "q7", "q8"]);
        
        let (count, percent) = calculate_question_overlap(&exam1, &exam2);
        
        assert_eq!(count, 2); // q3, q4 overlap
        assert!((percent - 40.0).abs() < 0.1); // 2/5 = 40%
    }
    
    #[test]
    fn test_no_overlap() {
        let exam1 = create_mock_exam(vec!["q1", "q2", "q3"]);
        let exam2 = create_mock_exam(vec!["q4", "q5", "q6"]);
        
        let (count, percent) = calculate_question_overlap(&exam1, &exam2);
        
        assert_eq!(count, 0);
        assert_eq!(percent, 0.0);
    }
    
    #[test]
    fn test_full_overlap() {
        let exam1 = create_mock_exam(vec!["q1", "q2", "q3"]);
        let exam2 = create_mock_exam(vec!["q1", "q2", "q3"]);
        
        let (count, percent) = calculate_question_overlap(&exam1, &exam2);
        
        assert_eq!(count, 3);
        assert!((percent - 100.0).abs() < 0.1);
    }
    
    #[test]
    fn test_exam_statistics() {
        let exam = create_mock_exam(vec!["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"]);
        
        let stats = calculate_exam_statistics(&exam);
        
        assert_eq!(stats.total_questions, 10);
        assert_eq!(stats.easy_count, 2); // 20%
        assert_eq!(stats.medium_count, 5); // 50%
        assert_eq!(stats.hard_count, 3); // remainder
        assert_eq!(stats.estimated_duration_minutes, 20); // 2 min per question
    }
    
    #[test]
    fn test_variant_count_validation() {
        // Valid counts
        assert!(is_valid_variant_count(1));
        assert!(is_valid_variant_count(5));
        assert!(is_valid_variant_count(10));
        
        // Invalid counts
        assert!(!is_valid_variant_count(0));
        assert!(!is_valid_variant_count(11));
        assert!(!is_valid_variant_count(-1));
    }
    
    // ========================================================================
    // INTEGRATION TESTS
    // ========================================================================
    
    #[tokio::test]
    async fn test_generate_exam_from_matrix() {
        let app = create_app().await;
        
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/ai/exam/generate-from-matrix")
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        json!({
                            "matrix_id": "test_matrix_123",
                            "teacher_id": "teacher_456",
                            "options": {
                                "exam_variant": "A",
                                "shuffle_questions": false
                            }
                        }).to_string()
                    ))
                    .unwrap()
            )
            .await
            .unwrap();
        
        assert_eq!(response.status(), StatusCode::OK);
    }
    
    #[tokio::test]
    async fn test_generate_exam_variants() {
        let app = create_app().await;
        
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/ai/exam/generate-multiple-variants")
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        json!({
                            "matrix_id": "test_matrix_123",
                            "teacher_id": "teacher_456",
                            "variant_count": 3,
                            "options": {
                                "ensure_no_overlap": true
                            }
                        }).to_string()
                    ))
                    .unwrap()
            )
            .await
            .unwrap();
        
        assert_eq!(response.status(), StatusCode::OK);
    }
    
    #[tokio::test]
    async fn test_invalid_variant_count() {
        let app = create_app().await;
        
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/ai/exam/generate-multiple-variants")
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        json!({
                            "matrix_id": "test_matrix_123",
                            "teacher_id": "teacher_456",
                            "variant_count": 15, // Invalid: > 10
                        }).to_string()
                    ))
                    .unwrap()
            )
            .await
            .unwrap();
        
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
    
    #[tokio::test]
    async fn test_preview_exam() {
        let app = create_app().await;
        
        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/api/ai/exam/preview/exam_123")
                    .body(Body::empty())
                    .unwrap()
            )
            .await
            .unwrap();
        
        // Should return OK or NOT_FOUND depending on if exam exists
        assert!(
            response.status() == StatusCode::OK || 
            response.status() == StatusCode::NOT_FOUND
        );
    }
    
    #[tokio::test]
    async fn test_swap_question() {
        let app = create_app().await;
        
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/ai/exam/swap-question")
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        json!({
                            "exam_id": "exam_123",
                            "question_id": "q_456",
                            "constraints": {
                                "topic_id": "topic_789",
                                "cognitive_level": "VD"
                            }
                        }).to_string()
                    ))
                    .unwrap()
            )
            .await
            .unwrap();
        
        // Should return OK or NOT_FOUND depending on alternatives
        assert!(
            response.status() == StatusCode::OK || 
            response.status() == StatusCode::NOT_FOUND
        );
    }
    
    // ========================================================================
    // PERFORMANCE BENCHMARKS
    // ========================================================================
    
    #[tokio::test]
    async fn benchmark_exam_generation() {
        let app = create_app().await;
        
        let start = std::time::Instant::now();
        
        let _response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/ai/exam/generate-from-matrix")
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        json!({
                            "matrix_id": "benchmark_matrix",
                            "teacher_id": "teacher_bench",
                        }).to_string()
                    ))
                    .unwrap()
            )
            .await
            .unwrap();
        
        let elapsed = start.elapsed();
        
        // Exam generation should complete in < 30 seconds
        assert!(elapsed.as_secs() < 30, "Exam generation took too long: {:?}", elapsed);
        
        println!("Exam generation completed in {:?}", elapsed);
    }
    
    #[tokio::test]
    async fn benchmark_multiple_variants() {
        let app = create_app().await;
        
        let start = std::time::Instant::now();
        
        let _response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/ai/exam/generate-multiple-variants")
                    .header("Content-Type", "application/json")
                    .body(Body::from(
                        json!({
                            "matrix_id": "benchmark_matrix",
                            "teacher_id": "teacher_bench",
                            "variant_count": 5,
                        }).to_string()
                    ))
                    .unwrap()
            )
            .await
            .unwrap();
        
        let elapsed = start.elapsed();
        
        // 5 variants should complete in < 2 minutes
        assert!(elapsed.as_secs() < 120, "Variant generation took too long: {:?}", elapsed);
        
        println!("5 variants generated in {:?}", elapsed);
    }
    
    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================
    
    fn create_mock_exam(question_ids: Vec<&str>) -> GeneratedExam {
        GeneratedExam {
            exam_id: "exam_mock".to_string(),
            matrix_id: "matrix_mock".to_string(),
            teacher_id: "teacher_mock".to_string(),
            questions: question_ids.iter().map(|id| ExamQuestion {
                question_id: id.to_string(),
                position: 1,
                assigned_score: 1.0,
                question_type: "MCQ".to_string(),
            }).collect(),
            answer_key: AnswerKey {
                exam_id: "exam_mock".to_string(),
                answers: vec![],
                total_score: 10.0,
            },
            metadata: ExamMetadata {
                generated_at: chrono::Utc::now(),
                variant: "A".to_string(),
                generation_time_ms: 1000,
                llm_model: "test".to_string(),
            },
        }
    }
    
    fn is_valid_variant_count(count: i32) -> bool {
        count >= 1 && count <= 10
    }
}
