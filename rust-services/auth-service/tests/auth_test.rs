use auth_service::services::AuthService;

#[test]
fn test_password_hash_and_verify() {
    let auth = AuthService::new("test-secret-key-min-32-chars!!".to_string(), 24);
    
    let password = "TestPassword123!";
    let hash = auth.hash_password(password).unwrap();
    
    // Verify correct password
    assert!(auth.verify_password(password, &hash).unwrap());
    
    // Verify incorrect password
    assert!(!auth.verify_password("WrongPassword", &hash).unwrap());
}

#[test]
fn test_jwt_token_generation_and_validation() {
    let auth = AuthService::new("test-secret-key-min-32-chars!!".to_string(), 24);
    
    let user_id = "user_123";
    let email = "test@example.com";
    let role = "STUDENT";
    
    // Generate token
    let token = auth.generate_token(user_id, email, role).unwrap();
    assert!(!token.is_empty());
    
    // Validate token
    let claims = auth.validate_token(&token).unwrap();
    assert_eq!(claims.sub, user_id);
    assert_eq!(claims.email, email);
    assert_eq!(claims.role, role);
}

#[test]
fn test_expired_token() {
    let auth = AuthService::new("test-secret-key-min-32-chars!!".to_string(), 0); // 0 hours = expired
    
    let user_id = "user_123";
    let email = "test@example.com";
    let role = "STUDENT";
    
    let token = auth.generate_token(user_id, email, role).unwrap();
    
    // Token should be expired immediately
    let result = auth.validate_token(&token);
    assert!(result.is_err());
}

#[test]
fn test_password_validation() {
    // Test weak passwords
    assert!(crate::handlers::register::validate_password("weak").is_err());
    assert!(crate::handlers::register::validate_password("nouppercase123!").is_err());
    assert!(crate::handlers::register::validate_password("NOLOWERCASE123!").is_err());
    assert!(crate::handlers::register::validate_password("NoNumbers!").is_err());
    assert!(crate::handlers::register::validate_password("NoSpecial123").is_err());
    
    // Test strong password
    assert!(crate::handlers::register::validate_password("StrongPass123!").is_ok());
}
