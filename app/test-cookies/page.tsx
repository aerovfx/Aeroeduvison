'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function CookieTestPage() {
  const { data: session, status } = useSession();
  const [cookieInfo, setCookieInfo] = useState<any>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCookies = async () => {
    try {
      const response = await fetch('/api/test-cookies');
      const data = await response.json();
      setCookieInfo(data);
      
      if (data.success) {
        addResult('✅ Cookie test successful');
        addResult(`Session Token: ${data.cookies.sessionToken}`);
        addResult(`CSRF Token: ${data.cookies.csrfToken}`);
        addResult(`Has JWT Token: ${data.token.hasToken}`);
        if (data.token.hasToken) {
          addResult(`User Role: ${data.token.role}`);
        }
      } else {
        addResult(`❌ Cookie test failed: ${data.error}`);
      }
    } catch (error) {
      addResult(`❌ Cookie test error: ${error}`);
    }
  };

  const testLogin = async () => {
    addResult('Testing login...');
    try {
      const result = await signIn('credentials', {
        email: 'teacher@example.com',
        password: 'teacher123',
        redirect: false,
      });

      if (result?.ok) {
        addResult('✅ Login successful');
        // Test cookies after login
        setTimeout(() => testCookies(), 1000);
      } else {
        addResult(`❌ Login failed: ${result?.error}`);
      }
    } catch (error) {
      addResult(`❌ Login error: ${error}`);
    }
  };

  const testLogout = async () => {
    addResult('Testing logout...');
    try {
      await signOut({ redirect: false });
      addResult('✅ Logout successful');
      // Test cookies after logout
      setTimeout(() => testCookies(), 1000);
    } catch (error) {
      addResult(`❌ Logout error: ${error}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  useEffect(() => {
    if (status !== 'loading') {
      testCookies();
    }
  }, [status]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">NextAuth Cookie Test Page</h1>
      
      {/* Session Info */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Current Session:</h2>
        {status === 'loading' ? (
          <p>Loading...</p>
        ) : session ? (
          <div className="space-y-2">
            <p><strong>User:</strong> {session.user?.name}</p>
            <p><strong>Email:</strong> {session.user?.email}</p>
            <p><strong>Role:</strong> {session.user?.role}</p>
          </div>
        ) : (
          <p>Not authenticated</p>
        )}
      </div>

      {/* Cookie Info */}
      {cookieInfo && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3">Cookie Information:</h2>
          <div className="space-y-2">
            <p><strong>Session Token:</strong> {cookieInfo.cookies?.sessionToken}</p>
            <p><strong>CSRF Token:</strong> {cookieInfo.cookies?.csrfToken}</p>
            <p><strong>Callback URL:</strong> {cookieInfo.cookies?.callbackUrl}</p>
            <p><strong>State:</strong> {cookieInfo.cookies?.state}</p>
            <p><strong>Has JWT Token:</strong> {cookieInfo.token?.hasToken ? 'Yes' : 'No'}</p>
            {cookieInfo.token?.hasToken && (
              <>
                <p><strong>User Role:</strong> {cookieInfo.token.role}</p>
                <p><strong>Token Expires:</strong> {cookieInfo.token.exp}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Test Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={testCookies}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Test Cookies
        </button>
        
        <button
          onClick={testLogin}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Test Login
        </button>
        
        <button
          onClick={testLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Test Logout
        </button>
        
        <button
          onClick={clearResults}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Clear Results
        </button>
      </div>

      {/* Test Results */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Test Results:</h2>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500">No tests run yet. Click a test button above.</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono">
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Cookie Test Instructions:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Test Cookies:</strong> Check current cookie status</li>
          <li><strong>Test Login:</strong> Login and verify cookies are set correctly</li>
          <li><strong>Test Logout:</strong> Logout and verify cookies are cleared</li>
          <li>Check browser DevTools → Application → Cookies to see actual cookie values</li>
          <li>Verify that __Host- cookies don&apos;t have Domain attribute</li>
          <li>Verify that __Secure- cookies have Secure flag in production</li>
        </ul>
      </div>
    </div>
  );
}

