/**
 * Password Validation Utility
 * 
 * Validates password strength and provides user-friendly feedback
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  score: number; // 0-100
}

export interface PasswordRequirements {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  disallowCommonPasswords: boolean;
}

// Default requirements
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  disallowCommonPasswords: true
};

// Common weak passwords to disallow
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '12345678', 'qwerty', 'abc123',
  'monkey', '1234567', 'letmein', 'trustno1', 'dragon', 'baseball',
  'iloveyou', 'master', 'sunshine', 'ashley', 'bailey', 'passw0rd',
  'shadow', '123123', '654321', 'superman', 'qazwsx', 'michael',
  'football', 'admin', 'welcome', 'login', 'admin123', 'root'
];

/**
 * Validate password against requirements
 */
export function validatePassword(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Check length
  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters long`);
  } else {
    score += 20;
  }

  if (password.length > requirements.maxLength) {
    errors.push(`Password must not exceed ${requirements.maxLength} characters`);
  }

  // Check uppercase
  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    score += 15;
  }

  // Check lowercase
  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    score += 15;
  }

  // Check numbers
  if (requirements.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (/[0-9]/.test(password)) {
    score += 15;
  }

  // Check special characters
  if (requirements.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>?/)');
  } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 15;
  }

  // Check for common passwords
  if (requirements.disallowCommonPasswords) {
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
      errors.push('Password is too common. Please choose a more unique password');
      score = Math.min(score, 30);
    }
  }

  // Bonus points for length
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Determine strength
  let strength: PasswordValidationResult['strength'];
  if (score >= 90) strength = 'very-strong';
  else if (score >= 70) strength = 'strong';
  else if (score >= 50) strength = 'good';
  else if (score >= 30) strength = 'fair';
  else strength = 'weak';

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score: Math.min(score, 100)
  };
}

/**
 * Get password strength color for UI
 */
export function getPasswordStrengthColor(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'very-strong': return 'text-green-600';
    case 'strong': return 'text-green-500';
    case 'good': return 'text-blue-500';
    case 'fair': return 'text-yellow-500';
    case 'weak': return 'text-red-500';
  }
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'very-strong': return 'Very Strong';
    case 'strong': return 'Strong';
    case 'good': return 'Good';
    case 'fair': return 'Fair';
    case 'weak': return 'Weak';
  }
}

/**
 * Check if password has been compromised (basic check)
 * In production, integrate with HaveIBeenPwned API
 */
export async function checkPasswordCompromised(password: string): Promise<boolean> {
  // Basic check against common passwords
  return COMMON_PASSWORDS.some(common => password.toLowerCase().includes(common));
}

/**
 * Generate password requirements text for UI
 */
export function getPasswordRequirementsText(requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS): string[] {
  const rules: string[] = [];
  
  rules.push(`At least ${requirements.minLength} characters long`);
  
  if (requirements.requireUppercase) {
    rules.push('Contains at least one uppercase letter (A-Z)');
  }
  
  if (requirements.requireLowercase) {
    rules.push('Contains at least one lowercase letter (a-z)');
  }
  
  if (requirements.requireNumbers) {
    rules.push('Contains at least one number (0-9)');
  }
  
  if (requirements.requireSpecialChars) {
    rules.push('Contains at least one special character (!@#$%^&*...)');
  }
  
  if (requirements.disallowCommonPasswords) {
    rules.push('Not a commonly used password');
  }
  
  return rules;
}

