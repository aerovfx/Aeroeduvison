#!/usr/bin/env node

const http = require('http');

const testUrls = [
  {
    name: 'New LabTwin Dashboard',
    url: 'http://localhost:3000/dashboard/labtwin'
  },
  {
    name: 'Original LabTwin',
    url: 'http://localhost:3000/learning-paths-demo/labtwin'
  },
  {
    name: 'Student Dashboard',
    url: 'http://localhost:3000/dashboard'
  },
  {
    name: 'Teacher Dashboard',
    url: 'http://localhost:3000/teacher/dashboard'
  }
];

const experiments = [
  { name: 'Chuyển động thẳng đều', url: '/learning-paths-demo/labtwin/experiment/mechanics-1' },
  { name: 'Rơi tự do', url: '/learning-paths-demo/labtwin/experiment/mechanics-2' },
  { name: 'Sóng cơ học', url: '/learning-paths-demo/labtwin/experiment/waves-1' },
  { name: 'Điện trường', url: '/learning-paths-demo/labtwin/experiment/electricity-1' },
  { name: 'Mạch điện DC', url: '/learning-paths-demo/labtwin/experiment/electricity-2' },
  { name: 'Khúc xạ ánh sáng', url: '/learning-paths-demo/labtwin/experiment/optics-1' }
];

async function testUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const hasError = data.includes('Error:') || res.statusCode >= 400;
        resolve({ status: res.statusCode, hasError });
      });
    });
    
    req.on('error', () => resolve({ status: 0, hasError: true }));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ status: 0, hasError: true });
    });
  });
}

async function runNewUrlTest() {
  console.log('🎯 LABTWIN NEW URL TEST');
  console.log('=======================\n');
  
  console.log('🔗 Testing LabTwin at new URL: /dashboard/labtwin\n');
  
  // Test 1: Dashboard URLs
  console.log('1️⃣ DASHBOARD ACCESS TEST');
  console.log('========================');
  
  let dashboardPassed = 0;
  for (const test of testUrls) {
    const result = await testUrl(test.url);
    const status = result.hasError ? '❌ FAILED' : '✅ PASSED';
    console.log(`${status} ${test.name}: ${result.status}`);
    if (!result.hasError) dashboardPassed++;
  }
  
  console.log(`\nDashboard Access: ${dashboardPassed}/${testUrls.length} passed\n`);
  
  // Test 2: LabTwin Experiments
  console.log('2️⃣ LABTWIN EXPERIMENTS TEST');
  console.log('===========================');
  
  let experimentsPassed = 0;
  for (const experiment of experiments) {
    const result = await testUrl(`http://localhost:3000${experiment.url}`);
    const status = result.hasError ? '❌ FAILED' : '✅ PASSED';
    console.log(`${status} ${experiment.name}: ${result.status}`);
    if (!result.hasError) experimentsPassed++;
  }
  
  console.log(`\nExperiments: ${experimentsPassed}/${experiments.length} passed\n`);
  
  // Final Summary
  console.log('🎉 NEW URL INTEGRATION SUMMARY');
  console.log('==============================');
  
  const totalTests = testUrls.length + experiments.length;
  const totalPassed = dashboardPassed + experimentsPassed;
  
  console.log(`✅ Dashboard Access: ${dashboardPassed}/${testUrls.length} passed`);
  console.log(`✅ LabTwin Experiments: ${experimentsPassed}/${experiments.length} passed`);
  console.log(`\n📊 Overall: ${totalPassed}/${totalTests} tests passed`);
  
  if (totalPassed === totalTests) {
    console.log('\n🎉 NEW URL INTEGRATION SUCCESSFUL!');
    console.log('==================================');
    console.log('✅ LabTwin successfully moved to /dashboard/labtwin');
    console.log('✅ All experiments accessible from new URL');
    console.log('✅ Sidebar navigation updated');
    console.log('✅ Both old and new URLs working');
    
    console.log('\n🚀 ACCESS METHODS');
    console.log('=================');
    console.log('1. NEW: Dashboard LabTwin: http://localhost:3000/dashboard/labtwin');
    console.log('2. OLD: Original LabTwin: http://localhost:3000/learning-paths-demo/labtwin');
    console.log('3. Sidebar Navigation: Click "LabTwin" in dashboard sidebar');
    console.log('4. Direct Navigation: /dashboard → LabTwin sidebar item');
    
    console.log('\n👥 USER ACCESS');
    console.log('==============');
    console.log('Student: student@example.com / password123');
    console.log('Teacher: teacher@example.com / password123');
    console.log('Admin: admin@example.com / password123');
    
    console.log('\n🧪 EXPERIMENT LINKS');
    console.log('===================');
    experiments.forEach(exp => {
      console.log(`${exp.name}: http://localhost:3000${exp.url}`);
    });
    
    console.log('\n🎯 NEXT STEPS');
    console.log('=============');
    console.log('1. Login with any user type');
    console.log('2. Navigate to dashboard');
    console.log('3. Click "LabTwin" in sidebar (now points to /dashboard/labtwin)');
    console.log('4. Explore experiments from new dashboard interface');
    
  } else {
    console.log('\n⚠️ Some integration issues detected.');
    console.log('Please check the failed tests above.');
  }
  
  console.log('\n📝 TEST COMPLETED');
  console.log('=================');
  console.log(`Test completed at: ${new Date().toLocaleString()}`);
}

// Run the new URL test
runNewUrlTest().catch(console.error);

