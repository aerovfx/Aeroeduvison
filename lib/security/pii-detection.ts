/**
 * Security Utilities - PII Detection & Redaction
 * Detects and redacts sensitive personal information
 *
 * Detects:
 * - Email addresses
 * - Phone numbers (VN + US formats)
 * - ID numbers (Vietnamese CCCD/CMND)
 * - Social Security Numbers (US format)
 * - Credit card numbers
 * - Bank account numbers
 */

/**
 * PII Detection Patterns
 */
const PII_PATTERNS = {
  // Email: user@domain.com
  email: /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi,

  // Phone: Various formats
  // Vietnamese: +84 9xx xxx xxxx, 09xx xxx xxxx
  // US: (123) 456-7890, 123-456-7890, +1 123 456 7890
  phone: /(\+?1?\s?[-.]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}|\+84\s?9\d{8}|09\d{8})/gi,

  // Vietnamese ID number (CCCD/CMND): 12 digits or old format 9 digits
  vietnameseId: /\b([0-9]{9}|[0-9]{12})\b/g,

  // Social Security Number (SSN): 123-45-6789 or 123456789
  ssn: /(\d{3}-\d{2}-\d{4}|\d{9})/g,

  // Credit card: 4532-1234-5678-9010 or similar
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,

  // Bank account: Various formats
  bankAccount: /(\b[0-9]{10,20}\b)/g,

  // Passport number
  passport: /([A-Z]{1,2}\d{6,9})/g
};

/**
 * Detect PII in text
 * Returns array of detected PII with types
 */
export function detectPII(text: string): Array<{ type: string; value: string }> {
  if (!text || typeof text !== 'string') return [];

  const detected: Array<{ type: string; value: string }> = [];

  // Check each pattern
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    let match;
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;

    while ((match = pattern.exec(text)) !== null) {
      detected.push({
        type,
        value: match[0]
      });
    }
  }

  return detected;
}

/**
 * Redact PII from text
 * Replaces detected PII with placeholder
 */
export function redactPII(text: string, placeholder: string = '[REDACTED]'): string {
  if (!text || typeof text !== 'string') return text;

  let redacted = text;

  // Apply each pattern
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    // Reset regex
    pattern.lastIndex = 0;
    redacted = redacted.replace(pattern, placeholder);
  }

  return redacted;
}

/**
 * Check if text contains sensitive data
 */
export function containsPII(text: string): boolean {
  return detectPII(text).length > 0;
}

/**
 * Sanitize user input - remove/escape potentially dangerous characters
 */
export function sanitizeInput(text: string): string {
  if (!text || typeof text !== 'string') return '';

  return text
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Limit to reasonable length
    .substring(0, 50000);
}

/**
 * Get detailed PII report
 */
export function getPIIReport(text: string): {
  hasPII: boolean;
  piiTypes: string[];
  totalMatches: number;
  details: Array<{ type: string; count: number }>;
} {
  const detected = detectPII(text);
  const types = [...new Set(detected.map(d => d.type))];
  const details = types.map(type => ({
    type,
    count: detected.filter(d => d.type === type).length
  }));

  return {
    hasPII: detected.length > 0,
    piiTypes: types,
    totalMatches: detected.length,
    details
  };
}

/**
 * PII Detection Options
 */
export interface PIIDetectionOptions {
  enableEmail?: boolean;
  enablePhone?: boolean;
  enableIDs?: boolean;
  enableSSN?: boolean;
  enableCreditCard?: boolean;
  enablePassport?: boolean;
}

/**
 * Selective PII detection based on options
 */
export function detectPIISelective(
  text: string,
  options: PIIDetectionOptions = {}
): Array<{ type: string; value: string }> {
  const {
    enableEmail = true,
    enablePhone = true,
    enableIDs = true,
    enableSSN = true,
    enableCreditCard = true,
    enablePassport = true
  } = options;

  const detected: Array<{ type: string; value: string }> = [];

  if (enableEmail) {
    let match;
    const pattern = PII_PATTERNS.email;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      detected.push({ type: 'email', value: match[0] });
    }
  }

  if (enablePhone) {
    let match;
    const pattern = PII_PATTERNS.phone;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      detected.push({ type: 'phone', value: match[0] });
    }
  }

  if (enableIDs) {
    let match;
    const pattern = PII_PATTERNS.vietnameseId;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      detected.push({ type: 'vietnameseId', value: match[0] });
    }
  }

  if (enableSSN) {
    let match;
    const pattern = PII_PATTERNS.ssn;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      detected.push({ type: 'ssn', value: match[0] });
    }
  }

  if (enableCreditCard) {
    let match;
    const pattern = PII_PATTERNS.creditCard;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      detected.push({ type: 'creditCard', value: match[0] });
    }
  }

  if (enablePassport) {
    let match;
    const pattern = PII_PATTERNS.passport;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      detected.push({ type: 'passport', value: match[0] });
    }
  }

  return detected;
}
