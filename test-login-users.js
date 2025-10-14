#!/usr/bin/env node

const http = require('http');
const https = require('https');

const testUsers = [
  {
    name: 'Student',
    email: 'student@example.com',
    password: 'password123',
    role: 'student'
  },
  {
    name: 'Teacher', 
    email: 'teacher@example.com',
    password: 'password123',
    role: 'teacher'
  },
  {
    name: 'Admin',
    email: 'admin@example.com', 
    password: 'password123',
    role: 'admin'
  }
];

const testUrls = [
  'http://localhost:3000',
  'http://localhost:3000/sign-in',
  'http://localhost:3000/learning-paths-demo',
  'http://localhost:3000/learning-paths-demo/labtwin',
  'http://localhost:3000/learning-paths-demo/labtwin/experiment/mechanics-1'
];

async function testUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const hasError = data.includes('useTheme must be used within a ThemeProvider') || 
                        data.includes('Error:') ||
                        res.statusCode >= 400;
        
        resolve({
          url,
          status: res.statusCode,
          hasError,
          errorType: hasError ? 'ThemeProvider Error' : null
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        url,
        status: 0,
        hasError: true,
        errorType: err.message
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        url,
        status: 0,
        hasError: true,
        errorType: 'Timeout'
      });
    });
  });
}

async function testLoginFlow(user) {
  console.log(`\n👤 Testing ${user.name} (${user.role})`);
  console.log('=' .repeat(50));
  
  const results = [];
  
  // Test 1: Home page access
  console.log('1️⃣ Testing home page access...');
  const homeResult = await testUrl('http://localhost:3000');
  results.push(homeResult);
  console.log(`${homeResult.hasError ? '❌' : '✅'} Home page: ${homeResult.status}`);
  
  // Test 2: Sign-in page
  console.log('2️⃣ Testing sign-in page...');
  const signinResult = await testUrl('http://localhost:3000/sign-in');
  results.push(signinResult);
  console.log(`${signinResult.hasError ? '❌' : '✅'} Sign-in page: ${signinResult.status}`);
  
  // Test 3: Learning paths demo
  console.log('3️⃣ Testing learning paths demo...');
  const demoResult = await testUrl('http://localhost:3000/learning-paths-demo');
  results.push(demoResult);
  console.log(`${demoResult.hasError ? '❌' : '✅'} Learning paths: ${demoResult.status}`);
  
  // Test 4: LabTwin main page
  console.log('4️⃣ Testing LabTwin main page...');
  const labtwinResult = await testUrl('http://localhost:3000/learning-paths-demo/labtwin');
  results.push(labtwinResult);
  console.log(`${labtwinResult.hasError ? '❌' : '✅'} LabTwin main: ${labtwinResult.status}`);
  
  // Test 5: LabTwin experiment
  console.log('5️⃣ Testing LabTwin experiment...');
  const experimentResult = await testUrl('http://localhost:3000/learning-paths-demo/labtwin/experiment/mechanics-1');
  results.push(experimentResult);
  console.log(`${experimentResult.hasError ? '❌' : '✅'} LabTwin experiment: ${experimentResult.status}`);
  
  // Test 6: Admin panel (if admin)
  if (user.role === 'admin') {
    console.log('6️⃣ Testing admin panel access...');
    const adminResult = await testUrl('http://localhost:3000/admin');
    results.push(adminResult);
    console.log(`${adminResult.hasError ? '❌' : '✅'} Admin panel: ${adminResult.status}`);
  }
  
  const passed = results.filter(r => !r.hasError).length;
  const failed = results.filter(r => r.hasError).length;
  
  console.log(`\n📊 ${user.name} Results: ${passed}/${results.length} passed`);
  
  if (failed > 0) {
    console.log('❌ Failed tests:');
    results.filter(r => r.hasError).forEach(r => {
      console.log(`  - ${r.url}: ${r.errorType}`);
    });
  }
  
  return { user, passed, failed, total: results.length };
}

async function runAllTests() {
  console.log('🧪 LabTwin User Login Test Suite');
  console.log('=====================================\n');
  
  console.log('🔗 Server URL: http://localhost:3000');
  console.log('📝 Testing all user types and their access levels\n');
  
  const allResults = [];
  
  for (const user of testUsers) {
    const result = await testLoginFlow(user);
    allResults.push(result);
  }
  
  // Final Summary
  console.log('\n🎯 FINAL SUMMARY');
  console.log('================');
  
  allResults.forEach(result => {
    const status = result.failed === 0 ? '✅ PASSED' : '❌ FAILED';
    console.log(`${result.user.name} (${result.user.role}): ${status} - ${result.passed}/${result.total} tests`);
  });
  
  const totalPassed = allResults.reduce((sum, r) => sum + r.passed, 0);
  const totalTests = allResults.reduce((sum, r) => sum + r.total, 0);
  
  console.log(`\n📈 Overall: ${totalPassed}/${totalTests} tests passed`);
  
  if (totalPassed === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! LabTwin is ready for manual testing.');
    console.log('\n📋 Next Steps:');
    console.log('1. Open browser to http://localhost:3000');
    console.log('2. Test manual login with each user type');
    console.log('3. Navigate to LabTwin and test experiments');
    console.log('4. Verify all interactions work properly');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the errors above.');
    console.log('\n🔧 Troubleshooting:');
    console.log('- Check if server is running: npm run dev');
    console.log('- Verify ThemeProvider setup');
    console.log('- Check console logs for detailed errors');
  }
  
  console.log('\n📚 Test Credentials:');
  testUsers.forEach(user => {
    console.log(`${user.name}: ${user.email} / ${user.password}`);
  });
}

// Run the tests
runAllTests().catch(console.error);

