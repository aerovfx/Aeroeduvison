use regex::Regex;
use once_cell::sync::Lazy;

static PII_PATTERNS: Lazy<Vec<(&str, Regex)>> = Lazy::new(|| vec![
    ("phone", Regex::new(r"(\+84|0)\d{9,10}").unwrap()),
    ("email", Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").unwrap()),
    ("cccd", Regex::new(r"\b\d{12}\b").unwrap()), // Vietnamese CCCD (12 digits)
    ("cmnd", Regex::new(r"\b\d{9}\b").unwrap()),   // Old CMND (9 digits)
]);

/// Detect PII in text. Returns list of detected PII types.
pub fn detect_pii(text: &str) -> Vec<String> {
    PII_PATTERNS.iter()
        .filter(|(_, regex)| regex.is_match(text))
        .map(|(name, _)| name.to_string())
        .collect()
}

/// Redact PII from text.
pub fn redact_pii(text: &str) -> String {
    let mut result = text.to_string();
    for (_, regex) in PII_PATTERNS.iter() {
        result = regex.replace_all(&result, "[REDACTED]").to_string();
    }
    result
}

/// Basic content filter. Returns (is_blocked, categories).
pub fn filter_content(text: &str) -> (bool, Vec<String>) {
    let lower = text.to_lowercase();
    let mut categories = vec![];

    // Very basic harmful content detection
    let harmful_patterns = [
        ("violence", &["giết", "đánh", "bạo lực", "tấn công"][..]),
        ("explicit", &["khiêu dâm", "sex", "porn"][..]),
    ];

    for (category, keywords) in &harmful_patterns {
        if keywords.iter().any(|kw| lower.contains(kw)) {
            categories.push(category.to_string());
        }
    }

    (!categories.is_empty(), categories)
}
