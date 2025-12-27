// Authentication Response Types

/**
 * NextAuth SignIn Response
 * Returned by signIn() function
 */
export interface LoginResponse {
  /**
   * Whether the sign in was successful
   */
  ok: boolean;
  
  /**
   * HTTP status code
   */
  status?: number;
  
  /**
   * Error message if sign in failed
   */
  error?: string | null;
  
  /**
   * Redirect URL after successful sign in
   * Should NOT contain invalid characters like extra quotes
   */
  url?: string;
}

/**
 * Authenticated User
 * Extended from NextAuth User type
 */
export interface AuthUser {
  /**
   * User ID from database
   */
  id: string;
  
  /**
   * User email (required)
   */
  email: string;
  
  /**
   * User display name
   */
  name: string | null;
  
  /**
   * User role
   */
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  
  /**
   * User avatar image URL
   */
  image?: string | null;
}

/**
 * Login Form Data
 */
export interface LoginFormData {
  email: string;
  password: string;
}

/**
 * Signup Form Data
 */
export interface SignupFormData {
  email: string;
  password: string;
  name: string;
}

/**
 * Auth Callback Response
 * Used in NextAuth callbacks
 */
export interface AuthCallbackResponse {
  /**
   * Redirect URL (must be validated)
   */
  url: string;
  
  /**
   * Base URL of the application
   */
  baseUrl: string;
}

/**
 * Validate URL format
 * @param url - URL string to validate
 * @returns true if valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate redirect URL
 * Ensures URL is safe for redirect
 * @param url - URL to validate
 * @param baseUrl - Expected base URL
 * @returns validated URL or fallback
 */
export function validateRedirectUrl(url: string, baseUrl: string): string {
  // Handle relative URLs
  if (url.startsWith('/')) {
    // Never redirect to auth pages
    if (url.startsWith('/auth/') || url.startsWith('/sign-in')) {
      return `${baseUrl}/dashboard`;
    }
    return `${baseUrl}${url}`;
  }
  
  // Handle absolute URLs
  try {
    const urlObj = new URL(url);
    const baseUrlObj = new URL(baseUrl);
    
    // Only allow same origin
    if (urlObj.origin === baseUrlObj.origin) {
      // But not auth pages
      if (urlObj.pathname.startsWith('/auth/') || urlObj.pathname.startsWith('/sign-in')) {
        return `${baseUrl}/dashboard`;
      }
      return url;
    }
  } catch (e) {
    // Invalid URL format
    console.error('Invalid URL format:', e);
  }
  
  // Default fallback
  return `${baseUrl}/dashboard`;
}

/**
 * Clean localhost from URL
 * Removes localhost references for production
 * @param url - URL to clean
 * @returns cleaned URL
 */
export function cleanLocalhostFromUrl(url: string): string {
  return url
    .replace(/https?:\/\/localhost(:\d+)?/g, '')
    .replace(/^\/+/, '/');
}

