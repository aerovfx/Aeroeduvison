const fetch = require('node-fetch');

async function testStudentLogin() {
  try {
    console.log('🧪 Testing student login...');
    
    // Test login with student credentials
    const loginResponse = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'student123',
        redirect: false,
        csrfToken: 'test-token' // This might need to be a real CSRF token
      })
    });
    
    console.log('📊 Login Response Status:', loginResponse.status);
    console.log('📊 Login Response Headers:', Object.fromEntries(loginResponse.headers.entries()));
    
    const loginData = await loginResponse.text();
    console.log('📊 Login Response Body:', loginData);
    
    // Test session check
    console.log('\n🔍 Testing session check...');
    const sessionResponse = await fetch('http://localhost:3000/api/auth/session', {
      method: 'GET',
      headers: {
        'Cookie': loginResponse.headers.get('set-cookie') || ''
      }
    });
    
    console.log('📊 Session Response Status:', sessionResponse.status);
    const sessionData = await sessionResponse.json();
    console.log('📊 Session Data:', sessionData);
    
  } catch (error) {
    console.error('❌ Error testing login:', error);
  }
}

testStudentLogin();




