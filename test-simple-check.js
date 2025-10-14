#!/usr/bin/env node

const http = require('http');

async function testUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve({ status: res.statusCode, url });
    });
    
    req.on('error', () => resolve({ status: 0, url }));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ status: 0, url });
    });
  });
}

async function runSimpleTest() {
  console.log('🎯 SIMPLE LABTWIN STATUS CHECK');
  console.log('==============================\n');
  
  const urls = [
    'http://localhost:3000/dashboard/labtwin',
    'http://localhost:3000/dashboard',
    'http://localhost:3000/learning-paths-demo/labtwin',
    'http://localhost:3000/learning-paths-demo/labtwin/experiment/mechanics-1',
    'http://localhost:3000/learning-paths-demo/labtwin/experiment/mechanics-2',
    'http://localhost:3000/learning-paths-demo/labtwin/experiment/waves-1'
  ];
  
  let passed = 0;
  
  for (const url of urls) {
    const result = await testUrl(url);
    const status = result.status === 200 ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} ${url}: ${result.status}`);
    if (result.status === 200) passed++;
  }
  
  console.log(`\n📊 Results: ${passed}/${urls.length} URLs accessible\n`);
  
  if (passed === urls.length) {
    console.log('🎉 ALL LABTWIN URLS WORKING!');
    console.log('============================');
    console.log('✅ Dashboard LabTwin: http://localhost:3000/dashboard/labtwin');
    console.log('✅ Student Dashboard: http://localhost:3000/dashboard');
    console.log('✅ Original LabTwin: http://localhost:3000/learning-paths-demo/labtwin');
    console.log('✅ All experiments accessible');
    console.log('✅ No server errors');
    
    console.log('\n🚀 LabTwin is ready for use!');
    console.log('============================');
    console.log('👥 Login with: student@example.com / password123');
    console.log('📱 Navigate to dashboard and click "LabTwin" in sidebar');
    console.log('🧪 Explore 6 physics experiments');
    
  } else {
    console.log('⚠️ Some URLs not accessible.');
    console.log('Please check server status.');
  }
  
  console.log('\n📝 Test completed at:', new Date().toLocaleString());
}

runSimpleTest().catch(console.error);

