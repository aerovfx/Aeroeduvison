const fetch = require('node-fetch');

async function testLoginThroughBrowser() {
  try {
    console.log('🌐 Testing login through browser simulation...');
    
    // Step 1: Get CSRF token
    console.log('1. Getting CSRF token...');
    const csrfResponse = await fetch('http://localhost:3000/api/auth/csrf');
    const csrfData = await csrfResponse.json();
    console.log('✅ CSRF Token:', csrfData.csrfToken);
    
    // Step 2: Test login with proper form data
    console.log('2. Testing login...');
    const formData = new URLSearchParams();
    formData.append('email', 'student@example.com');
    formData.append('password', 'student123');
    formData.append('csrfToken', csrfData.csrfToken);
    formData.append('callbackUrl', 'http://localhost:3000');
    formData.append('json', 'true');
    
    const loginResponse = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });
    
    console.log('📊 Login Response Status:', loginResponse.status);
    console.log('📊 Login Response Headers:', Object.fromEntries(loginResponse.headers.entries()));
    
    const loginData = await loginResponse.json();
    console.log('📊 Login Response Data:', loginData);
    
    // Step 3: Check session with cookies
    const cookies = loginResponse.headers.get('set-cookie');
    if (cookies) {
      console.log('3. Testing session with cookies...');
      console.log('🍪 Cookies:', cookies);
      
      const sessionResponse = await fetch('http://localhost:3000/api/auth/session', {
        method: 'GET',
        headers: {
          'Cookie': cookies
        }
      });
      
      console.log('📊 Session Response Status:', sessionResponse.status);
      const sessionData = await sessionResponse.json();
      console.log('📊 Session Data:', sessionData);
    } else {
      console.log('❌ No cookies received');
    }
    
  } catch (error) {
    console.error('❌ Error testing login:', error);
  }
}

testLoginThroughBrowser();




