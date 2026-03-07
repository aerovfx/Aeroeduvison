// lib/nextauth-client.ts

// ✅ Configure NextAuth client globally
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';

/**
 * ✅ CRITICAL: Wrapper around signIn to force correct baseUrl
 * This prevents NextAuth from detecting localhost
 */
export async function signInWithCorrectUrl(
  provider: string,
  options?: any
) {
  // ✅ Force baseUrl - prioritize production domain
  let baseUrl = process.env.NEXT_PUBLIC_NEXTAUTH_URL || 'https://inphysic.com';
  
  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;
    // Only use window.location.origin if it's NOT localhost
    if (!currentOrigin.includes('localhost') && !currentOrigin.includes('127.0.0.1')) {
      baseUrl = currentOrigin;
    }
    // If it's localhost, keep production URL
  }

  console.log('🔐 [NEXTAUTH-CLIENT] signIn wrapper called');
  console.log('  - provider:', provider);
  console.log('  - baseUrl:', baseUrl);
  console.log('  - currentOrigin:', typeof window !== 'undefined' ? window.location.origin : 'server');
  console.log('  - callbackUrl:', options?.callbackUrl);
  console.log('  - NEXTAUTH_URL env:', process.env.NEXTAUTH_URL);
  console.log('  - NEXT_PUBLIC_NEXTAUTH_URL env:', process.env.NEXT_PUBLIC_NEXTAUTH_URL);

  // ✅ Override the response interceptor
  const response = await nextAuthSignIn(provider, {
    ...options,
    redirect: false,
  });

  // ✅ Clean localhost from response URL
  if (response?.url && response.url.includes('localhost')) {
    console.warn('⚠️ [NEXTAUTH-CLIENT] Response contains localhost, cleaning...');
    const originalUrl = response.url;
    response.url = response.url
      .replace(/https?:\/\/localhost(:\d+)?/g, '')
      .replace(/^\/+/, '/');
    console.log('  - Original URL:', originalUrl);
    console.log('  - Cleaned URL:', response.url);
  }

  console.log('✅ [NEXTAUTH-CLIENT] signIn response:', {
    ok: response?.ok,
    error: response?.error,
    url: response?.url,
  });

  return response;
}

/**
 * ✅ Wrapper around signOut
 */
export async function signOutWithCorrectUrl(options?: any) {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXTAUTH_URL || 'https://inphysic.com');

  console.log('🔐 [NEXTAUTH-CLIENT] signOut wrapper called');
  console.log('  - baseUrl:', baseUrl);

  return nextAuthSignOut({
    ...options,
    callbackUrl: options?.callbackUrl || '/',
  });
}

export { useSession };


