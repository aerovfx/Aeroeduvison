'use client';

import { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getRedirectUrl } from '@/lib/auth-redirect';

export default function AuthTestPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testClientSideRedirect = async () => {
    setIsLoading(true);
    addResult('Testing client-side redirect...');
    
    try {
      const result = await signIn('credentials', {
        email: 'teacher@example.com',
        password: 'teacher123',
        redirect: false,
      });

      if (result?.ok) {
        addResult('✅ Login successful');
        
        // Test redirect logic
        const response = await fetch('/api/auth/session');
        const sessionData = await response.json();
        
        if (sessionData?.user?.role) {
          const redirectUrl = getRedirectUrl(sessionData.user.role);
          addResult(`✅ Redirect URL determined: ${redirectUrl}`);
          
          // Actually redirect
          router.push(redirectUrl);
        } else {
          addResult('❌ No role found in session');
        }
      } else {
        addResult(`❌ Login failed: ${result?.error}`);
      }
    } catch (error) {
      addResult(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testStudentLogin = async () => {
    setIsLoading(true);
    addResult('Testing student login...');
    
    try {
      const result = await signIn('credentials', {
        email: 'student@example.com',
        password: 'student123',
        redirect: false,
      });

      if (result?.ok) {
        addResult('✅ Student login successful');
        
        const response = await fetch('/api/auth/session');
        const sessionData = await response.json();
        
        if (sessionData?.user?.role) {
          const redirectUrl = getRedirectUrl(sessionData.user.role);
          addResult(`✅ Student redirect URL: ${redirectUrl}`);
        }
      } else {
        addResult(`❌ Student login failed: ${result?.error}`);
      }
    } catch (error) {
      addResult(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testUtilityFunctions = () => {
    addResult('Testing utility functions...');
    
    try {
      // Test getDashboardUrl
      const adminUrl = getRedirectUrl('ADMIN');
      const teacherUrl = getRedirectUrl('TEACHER');
      const studentUrl = getRedirectUrl('STUDENT');
      
      addResult(`✅ Admin URL: ${adminUrl}`);
      addResult(`✅ Teacher URL: ${teacherUrl}`);
      addResult(`✅ Student URL: ${studentUrl}`);
      
      // Test with callback URL
      const callbackUrl = getRedirectUrl('TEACHER', '/admin/dashboard');
      addResult(`✅ Teacher with callback: ${callbackUrl}`);
      
    } catch (error) {
      addResult(`❌ Utility function error: ${error}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  if (status === 'loading') {
    return <div className="p-8">Loading session...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">NextAuth.js Redirect Test Page</h1>
      
      {/* Current Session Info */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Current Session:</h2>
        {session ? (
          <div className="space-y-2">
            <p><strong>User:</strong> {session.user?.name}</p>
            <p><strong>Email:</strong> {session.user?.email}</p>
            <p><strong>Role:</strong> {session.user?.role}</p>
            <p><strong>ID:</strong> {session.user?.id}</p>
          </div>
        ) : (
          <p>Not authenticated</p>
        )}
      </div>

      {/* Test Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={testClientSideRedirect}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test Teacher Login & Redirect
        </button>
        
        <button
          onClick={testStudentLogin}
          disabled={isLoading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          Test Student Login
        </button>
        
        <button
          onClick={testUtilityFunctions}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
        >
          Test Utility Functions
        </button>
        
        <button
          onClick={clearResults}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Clear Results
        </button>
      </div>

      {/* Sign Out Button */}
      {session && (
        <div className="mb-6">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
      )}

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
      <div className="mt-8 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Test Instructions:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Click &quot;Test Teacher Login&quot; to test teacher authentication and redirect</li>
          <li>Click &quot;Test Student Login&quot; to test student authentication</li>
          <li>Click &quot;Test Utility Functions&quot; to verify redirect URL generation</li>
          <li>Check the results panel for detailed output</li>
          <li>Use &quot;Sign Out&quot; to clear the session and test again</li>
        </ul>
      </div>
    </div>
  );
}
