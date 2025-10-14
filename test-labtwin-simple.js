#!/usr/bin/env node

const http = require('http');

const testUrls = [
  'http://localhost:3000',
  'http://localhost:3000/sign-in',
  'http://localhost:3000/learning-paths-demo',
  'http://localhost:3000/learning-paths-demo/labtwin',
  'http://localhost:3000/learning-paths-demo/labtwin/experiment/mechanics-1',
  'http://localhost:3000/learning-paths-demo/labtwin/experiment/mechanics-2',
  'http://localhost:3000/learning-paths-demo/labtwin/experiment/waves-1',
  'http://localhost:3000/learning-paths-demo/labtwin/experiment/electricity-1',
  'http://localhost:3000/learning-paths-demo/labtwin/experiment/electricity-2',
  'http://localhost:3000/learning-paths-demo/labtwin/experiment/optics-1'
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

async function runTests() {
  console.log('🧪 LabTwin URL Test Suite\n');
  console.log('Testing all LabTwin URLs for accessibility...\n');
  
  const results = [];
  
  for (const url of testUrls) {
    console.log(`Testing: ${url}`);
    const result = await testUrl(url);
    results.push(result);
    
    if (result.hasError) {
      console.log(`❌ FAILED - ${result.errorType} (Status: ${result.status})`);
    } else {
      console.log(`✅ PASSED - Status: ${result.status}`);
    }
    console.log('');
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => !r.hasError).length;
  const failed = results.filter(r => r.hasError).length;
  
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed URLs:');
    results.filter(r => r.hasError).forEach(r => {
      console.log(`  - ${r.url}: ${r.errorType}`);
    });
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('1. If all tests pass, LabTwin is ready for manual testing');
  console.log('2. Test login with different users (student, teacher, admin)');
  console.log('3. Test experiment interactions and animations');
  console.log('4. Verify data collection features');
  
  if (passed === results.length) {
    console.log('\n🎉 All tests passed! LabTwin is ready for use.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the errors above.');
  }
}

runTests().catch(console.error);


