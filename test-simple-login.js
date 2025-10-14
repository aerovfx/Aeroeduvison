const fetch = require('node-fetch');

async function testSimpleLogin() {
  try {
    console.log('🧪 Testing simple login process...');
    
    // First, get CSRF token
    console.log('1. Getting CSRF token...');
    const csrfResponse = await fetch('http://localhost:3000/api/auth/csrf');
    const csrfData = await csrfResponse.json();
    console.log('📊 CSRF Token:', csrfData.csrfToken);
    
    // Test login with proper CSRF token
    console.log('2. Testing login with CSRF token...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'student@example.com',
        password: 'student123',
        csrfToken: csrfData.csrfToken,
        callbackUrl: 'http://localhost:3000',
        json: 'true'
      })
    });
    
    console.log('📊 Login Response Status:', loginResponse.status);
    console.log('📊 Login Response Headers:', Object.fromEntries(loginResponse.headers.entries()));
    
    const loginData = await loginResponse.json();
    console.log('📊 Login Response Data:', loginData);
    
    // Test session with cookies
    if (loginResponse.headers.get('set-cookie')) {
      console.log('3. Testing session with cookies...');
      const sessionResponse = await fetch('http://localhost:3000/api/auth/session', {
        method: 'GET',
        headers: {
          'Cookie': loginResponse.headers.get('set-cookie')
        }
      });
      
      console.log('📊 Session Response Status:', sessionResponse.status);
      const sessionData = await sessionResponse.json();
      console.log('📊 Session Data:', sessionData);
    }
    
  } catch (error) {
    console.error('❌ Error testing login:', error);
  }
}

testSimpleLogin();




