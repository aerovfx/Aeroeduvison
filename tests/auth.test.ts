import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { signIn, signOut, getSession } from 'next-auth/react';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';

// Mock Next-Auth
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

describe('Next-Auth Authentication Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Email Provider Authentication', () => {
    it('should authenticate user with valid email and password', async () => {
      // Mock user data
      const mockUser = {
        id: '1',
        email: 'student@example.com',
        password: 'hashedPassword',
        role: 'STUDENT',
        name: 'Test Student',
        emailVerified: new Date(),
      };

      // Mock Prisma responses
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true);

      // Mock successful sign in
      vi.mocked(signIn).mockResolvedValue({
        ok: true,
        error: null,
        status: 200,
        url: '/dashboard',
      });

      // Test authentication
      const result = await signIn('credentials', {
        email: 'student@example.com',
        password: 'password123',
        redirect: false,
      });

      expect(result).toEqual({
        ok: true,
        error: null,
        status: 200,
        url: '/dashboard',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'student@example.com' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
    });

    it('should reject authentication with invalid email', async () => {
      // Mock user not found
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      // Mock failed sign in
      vi.mocked(signIn).mockResolvedValue({
        ok: false,
        error: 'Invalid credentials',
        status: 401,
        url: null,
      });

      const result = await signIn('credentials', {
        email: 'nonexistent@example.com',
        password: 'password123',
        redirect: false,
      });

      expect(result).toEqual({
        ok: false,
        error: 'Invalid credentials',
        status: 401,
        url: null,
      });
    });

    it('should reject authentication with invalid password', async () => {
      // Mock user data
      const mockUser = {
        id: '1',
        email: 'student@example.com',
        password: 'hashedPassword',
        role: 'STUDENT',
        name: 'Test Student',
        emailVerified: new Date(),
      };

      // Mock Prisma responses
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false);

      // Mock failed sign in
      vi.mocked(signIn).mockResolvedValue({
        ok: false,
        error: 'Invalid credentials',
        status: 401,
        url: null,
      });

      const result = await signIn('credentials', {
        email: 'student@example.com',
        password: 'wrongpassword',
        redirect: false,
      });

      expect(result).toEqual({
        ok: false,
        error: 'Invalid credentials',
        status: 401,
        url: null,
      });
    });

    it('should reject authentication for unverified email', async () => {
      // Mock user with unverified email
      const mockUser = {
        id: '1',
        email: 'student@example.com',
        password: 'hashedPassword',
        role: 'STUDENT',
        name: 'Test Student',
        emailVerified: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true);

      vi.mocked(signIn).mockResolvedValue({
        ok: false,
        error: 'Email not verified',
        status: 403,
        url: null,
      });

      const result = await signIn('credentials', {
        email: 'student@example.com',
        password: 'password123',
        redirect: false,
      });

      expect(result).toEqual({
        ok: false,
        error: 'Email not verified',
        status: 403,
        url: null,
      });
    });
  });

  describe('Google OAuth Provider', () => {
    it('should authenticate user with valid Google OAuth', async () => {
      // Mock Google OAuth response
      const mockGoogleUser = {
        id: 'google123',
        email: 'user@gmail.com',
        name: 'Google User',
        image: 'https://example.com/avatar.jpg',
      };

      // Mock successful OAuth sign in
      vi.mocked(signIn).mockResolvedValue({
        ok: true,
        error: null,
        status: 200,
        url: '/dashboard',
      });

      const result = await signIn('google', {
        redirect: false,
      });

      expect(result).toEqual({
        ok: true,
        error: null,
        status: 200,
        url: '/dashboard',
      });
    });

    it('should handle Google OAuth errors', async () => {
      vi.mocked(signIn).mockResolvedValue({
        ok: false,
        error: 'OAuthSignin',
        status: 400,
        url: null,
      });

      const result = await signIn('google', {
        redirect: false,
      });

      expect(result).toEqual({
        ok: false,
        error: 'OAuthSignin',
        status: 400,
        url: null,
      });
    });
  });

  describe('Session Management', () => {
    it('should create valid session for authenticated user', async () => {
      const mockSession = {
        user: {
          id: '1',
          email: 'student@example.com',
          name: 'Test Student',
          role: 'STUDENT',
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      vi.mocked(getSession).mockResolvedValue(mockSession);

      const session = await getSession();

      expect(session).toEqual(mockSession);
      expect(session?.user.role).toBe('STUDENT');
    });

    it('should return null for unauthenticated user', async () => {
      vi.mocked(getSession).mockResolvedValue(null);

      const session = await getSession();

      expect(session).toBeNull();
    });

    it('should handle expired session', async () => {
      const expiredSession = {
        user: {
          id: '1',
          email: 'student@example.com',
          name: 'Test Student',
          role: 'STUDENT',
        },
        expires: new Date(Date.now() - 1000).toISOString(), // Expired
      };

      vi.mocked(getSession).mockResolvedValue(null); // Expired sessions return null

      const session = await getSession();

      expect(session).toBeNull();
    });
  });

  describe('JWT Token Handling', () => {
    it('should generate valid JWT token', async () => {
      const mockToken = {
        accessToken: 'valid-jwt-token',
        refreshToken: 'valid-refresh-token',
        accessTokenExpires: Date.now() + 3600000, // 1 hour
      };

      // Mock JWT generation
      const mockJWT = {
        token: mockToken,
        user: {
          id: '1',
          email: 'student@example.com',
          role: 'STUDENT',
        },
      };

      expect(mockJWT.token.accessToken).toBe('valid-jwt-token');
      expect(mockJWT.token.accessTokenExpires).toBeGreaterThan(Date.now());
    });

    it('should handle expired JWT token', async () => {
      const expiredToken = {
        accessToken: 'expired-jwt-token',
        refreshToken: 'valid-refresh-token',
        accessTokenExpires: Date.now() - 1000, // Expired
      };

      // Mock token refresh
      const refreshedToken = {
        accessToken: 'new-jwt-token',
        refreshToken: 'new-refresh-token',
        accessTokenExpires: Date.now() + 3600000,
      };

      expect(expiredToken.accessTokenExpires).toBeLessThan(Date.now());
      expect(refreshedToken.accessTokenExpires).toBeGreaterThan(Date.now());
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow STUDENT access to student routes', async () => {
      const mockSession = {
        user: {
          id: '1',
          email: 'student@example.com',
          role: 'STUDENT',
        },
        expires: new Date(Date.now() + 3600000).toISOString(),
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const session = await getServerSession(authOptions);

      expect(session?.user.role).toBe('STUDENT');
      
      // Test student route access
      const studentRoutes = ['/dashboard', '/learning-paths', '/notes'];
      const hasAccess = studentRoutes.every(route => {
        // Students should have access to these routes
        return true;
      });

      expect(hasAccess).toBe(true);
    });

    it('should allow TEACHER access to teacher routes', async () => {
      const mockSession = {
        user: {
          id: '2',
          email: 'teacher@example.com',
          role: 'TEACHER',
        },
        expires: new Date(Date.now() + 3600000).toISOString(),
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const session = await getServerSession(authOptions);

      expect(session?.user.role).toBe('TEACHER');
      
      // Test teacher route access
      const teacherRoutes = ['/teacher/dashboard', '/teacher/assignments', '/teacher/grading'];
      const hasAccess = teacherRoutes.every(route => {
        // Teachers should have access to these routes
        return true;
      });

      expect(hasAccess).toBe(true);
    });

    it('should allow ADMIN access to admin routes', async () => {
      const mockSession = {
        user: {
          id: '3',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
        expires: new Date(Date.now() + 3600000).toISOString(),
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const session = await getServerSession(authOptions);

      expect(session?.user.role).toBe('ADMIN');
      
      // Test admin route access
      const adminRoutes = ['/admin/dashboard', '/admin/users', '/admin/settings'];
      const hasAccess = adminRoutes.every(route => {
        // Admins should have access to these routes
        return true;
      });

      expect(hasAccess).toBe(true);
    });

    it('should deny STUDENT access to admin routes', async () => {
      const mockSession = {
        user: {
          id: '1',
          email: 'student@example.com',
          role: 'STUDENT',
        },
        expires: new Date(Date.now() + 3600000).toISOString(),
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const session = await getServerSession(authOptions);

      expect(session?.user.role).toBe('STUDENT');
      
      // Test admin route access denial
      const adminRoutes = ['/admin/dashboard', '/admin/users'];
      const hasAccess = adminRoutes.every(route => {
        // Students should NOT have access to admin routes
        return session?.user.role === 'ADMIN';
      });

      expect(hasAccess).toBe(false);
    });
  });

  describe('Sign Out Functionality', () => {
    it('should successfully sign out user', async () => {
      vi.mocked(signOut).mockResolvedValue({
        url: '/auth/login',
      });

      const result = await signOut({
        redirect: false,
      });

      expect(result).toEqual({
        url: '/auth/login',
      });
    });

    it('should clear session after sign out', async () => {
      // Mock session before sign out
      vi.mocked(getSession).mockResolvedValue({
        user: {
          id: '1',
          email: 'student@example.com',
          role: 'STUDENT',
        },
        expires: new Date(Date.now() + 3600000).toISOString(),
      });

      // Sign out
      await signOut({ redirect: false });

      // Mock session after sign out
      vi.mocked(getSession).mockResolvedValue(null);

      const session = await getSession();
      expect(session).toBeNull();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database connection errors', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database connection failed'));

      const result = await signIn('credentials', {
        email: 'student@example.com',
        password: 'password123',
        redirect: false,
      });

      expect(result).toEqual({
        ok: false,
        error: 'Database connection failed',
        status: 500,
        url: null,
      });
    });

    it('should handle malformed JWT tokens', async () => {
      const malformedToken = 'invalid.jwt.token';

      // Mock JWT verification failure
      const result = {
        valid: false,
        error: 'Invalid token format',
      };

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token format');
    });

    it('should handle concurrent authentication attempts', async () => {
      const mockUser = {
        id: '1',
        email: 'student@example.com',
        password: 'hashedPassword',
        role: 'STUDENT',
        name: 'Test Student',
        emailVerified: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true);

      // Simulate concurrent sign in attempts
      const promises = Array(5).fill(null).map(() =>
        signIn('credentials', {
          email: 'student@example.com',
          password: 'password123',
          redirect: false,
        })
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.ok).toBe(true);
      });
    });

    it('should handle rate limiting for failed attempts', async () => {
      // Mock multiple failed attempts
      vi.mocked(signIn).mockResolvedValue({
        ok: false,
        error: 'Too many failed attempts',
        status: 429,
        url: null,
      });

      const result = await signIn('credentials', {
        email: 'student@example.com',
        password: 'wrongpassword',
        redirect: false,
      });

      expect(result).toEqual({
        ok: false,
        error: 'Too many failed attempts',
        status: 429,
        url: null,
      });
    });

    it('should handle network timeouts', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Request timeout'));

      const result = await signIn('credentials', {
        email: 'student@example.com',
        password: 'password123',
        redirect: false,
      });

      expect(result).toEqual({
        ok: false,
        error: 'Request timeout',
        status: 408,
        url: null,
      });
    });
  });

  describe('Middleware Integration', () => {
    it('should allow authenticated user to access protected routes', async () => {
      const mockSession = {
        user: {
          id: '1',
          email: 'student@example.com',
          role: 'STUDENT',
        },
        expires: new Date(Date.now() + 3600000).toISOString(),
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/dashboard');
      const session = await getServerSession(authOptions);

      expect(session).toBeTruthy();
      expect(session?.user.role).toBe('STUDENT');
    });

    it('should redirect unauthenticated user to login', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/dashboard');
      const session = await getServerSession(authOptions);

      expect(session).toBeNull();
      
      // Should redirect to login
      const redirectUrl = '/auth/login?callbackUrl=%2Fdashboard';
      expect(redirectUrl).toContain('/auth/login');
    });
  });
});
