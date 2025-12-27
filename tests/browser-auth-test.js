
// Automated Browser Testing Script
// Run this in browser console or use Playwright/Puppeteer

async function testAuthentication() {
  console.log('🧪 Starting automated authentication tests...');
  
  const testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test 1: Valid Student Login
  try {
    const response = await fetch('/api/auth/signin/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'password123',
        redirect: false
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      testResults.passed++;
      testResults.tests.push({ name: 'Valid Student Login', status: 'PASS' });
    } else {
      testResults.failed++;
      testResults.tests.push({ name: 'Valid Student Login', status: 'FAIL', error: result.error });
    }
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name: 'Valid Student Login', status: 'FAIL', error: error.message });
  }
  
  // Test 2: Invalid Credentials
  try {
    const response = await fetch('/api/auth/signin/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'wrongpassword',
        redirect: false
      })
    });
    
    const result = await response.json();
    
    if (!result.ok && result.error === 'Invalid credentials') {
      testResults.passed++;
      testResults.tests.push({ name: 'Invalid Credentials Rejection', status: 'PASS' });
    } else {
      testResults.failed++;
      testResults.tests.push({ name: 'Invalid Credentials Rejection', status: 'FAIL', error: 'Expected rejection' });
    }
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name: 'Invalid Credentials Rejection', status: 'FAIL', error: error.message });
  }
  
  // Test 3: Session Check
  try {
    const response = await fetch('/api/auth/session');
    const session = await response.json();
    
    if (session && session.user) {
      testResults.passed++;
      testResults.tests.push({ name: 'Session Creation', status: 'PASS' });
    } else {
      testResults.failed++;
      testResults.tests.push({ name: 'Session Creation', status: 'FAIL', error: 'No session found' });
    }
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name: 'Session Creation', status: 'FAIL', error: error.message });
  }
  
  // Test 4: Sign Out
  try {
    const response = await fetch('/api/auth/signout', {
      method: 'POST'
    });
    
    if (response.ok) {
      testResults.passed++;
      testResults.tests.push({ name: 'Sign Out', status: 'PASS' });
    } else {
      testResults.failed++;
      testResults.tests.push({ name: 'Sign Out', status: 'FAIL', error: 'Sign out failed' });
    }
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name: 'Sign Out', status: 'FAIL', error: error.message });
  }
  
  // Print Results
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log('\n📋 Detailed Results:');
  
  testResults.tests.forEach(test => {
    const icon = test.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${test.name}: ${test.status}`);
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    }
  });
  
  return testResults;
}

// Run the tests
testAuthentication().then(results => {
  console.log('\n🎯 Testing Complete!');
  console.log(`Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
});
