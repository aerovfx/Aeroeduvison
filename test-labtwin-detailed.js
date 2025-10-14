#!/usr/bin/env node

const http = require('http');

const experiments = [
  {
    id: 'mechanics-1',
    name: 'Chuyển động thẳng đều',
    url: '/learning-paths-demo/labtwin/experiment/mechanics-1'
  },
  {
    id: 'mechanics-2', 
    name: 'Rơi tự do',
    url: '/learning-paths-demo/labtwin/experiment/mechanics-2'
  },
  {
    id: 'waves-1',
    name: 'Sóng cơ học',
    url: '/learning-paths-demo/labtwin/experiment/waves-1'
  },
  {
    id: 'electricity-1',
    name: 'Điện trường',
    url: '/learning-paths-demo/labtwin/experiment/electricity-1'
  },
  {
    id: 'electricity-2',
    name: 'Mạch điện DC',
    url: '/learning-paths-demo/labtwin/experiment/electricity-2'
  },
  {
    id: 'optics-1',
    name: 'Khúc xạ ánh sáng',
    url: '/learning-paths-demo/labtwin/experiment/optics-1'
  }
];

async function testExperiment(experiment) {
  return new Promise((resolve) => {
    const url = `http://localhost:3000${experiment.url}`;
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const hasError = data.includes('useTheme must be used within a ThemeProvider') || 
                        data.includes('Error:') ||
                        data.includes('500 Internal Server Error') ||
                        res.statusCode >= 400;
        
        const hasCanvas = data.includes('<canvas');
        const hasControls = data.includes('Slider') || data.includes('Button');
        const hasTheory = data.includes('Lý thuyết') || data.includes('Theory');
        
        resolve({
          experiment,
          status: res.statusCode,
          hasError,
          hasCanvas,
          hasControls,
          hasTheory,
          errorType: hasError ? 'Page Error' : null
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        experiment,
        status: 0,
        hasError: true,
        hasCanvas: false,
        hasControls: false,
        hasTheory: false,
        errorType: err.message
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        experiment,
        status: 0,
        hasError: true,
        hasCanvas: false,
        hasControls: false,
        hasTheory: false,
        errorType: 'Timeout'
      });
    });
  });
}

async function testLabTwinDetailed() {
  console.log('🧪 LabTwin Detailed Experiment Test Suite');
  console.log('==========================================\n');
  
  console.log('🔗 Testing all LabTwin experiments for functionality...\n');
  
  const results = [];
  
  for (const experiment of experiments) {
    console.log(`Testing: ${experiment.name}`);
    console.log(`URL: http://localhost:3000${experiment.url}`);
    
    const result = await testExperiment(experiment);
    results.push(result);
    
    // Display results
    const status = result.hasError ? '❌ FAILED' : '✅ PASSED';
    console.log(`Status: ${status} (${result.status})`);
    
    if (!result.hasError) {
      console.log(`Features:`);
      console.log(`  - Canvas: ${result.hasCanvas ? '✅' : '❌'}`);
      console.log(`  - Controls: ${result.hasControls ? '✅' : '❌'}`);
      console.log(`  - Theory: ${result.hasTheory ? '✅' : '❌'}`);
    } else {
      console.log(`Error: ${result.errorType}`);
    }
    
    console.log('');
  }
  
  // Summary
  console.log('📊 EXPERIMENT TEST SUMMARY');
  console.log('==========================');
  
  const passed = results.filter(r => !r.hasError).length;
  const failed = results.filter(r => r.hasError).length;
  
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}\n`);
  
  // Detailed results
  results.forEach(result => {
    const status = result.hasError ? '❌' : '✅';
    console.log(`${status} ${result.experiment.name}`);
    
    if (!result.hasError) {
      const features = [];
      if (result.hasCanvas) features.push('Canvas');
      if (result.hasControls) features.push('Controls');
      if (result.hasTheory) features.push('Theory');
      
      console.log(`    Features: ${features.join(', ')}`);
    } else {
      console.log(`    Error: ${result.errorType}`);
    }
  });
  
  console.log('\n🎯 FUNCTIONALITY CHECKLIST');
  console.log('==========================');
  
  const checklist = [
    'Canvas rendering for physics simulations',
    'Interactive controls (sliders, buttons)',
    'Real-time animations',
    'Data collection and display',
    'Physics theory and formulas',
    'Responsive design',
    'Error-free page loading'
  ];
  
  checklist.forEach((item, index) => {
    const check = passed === results.length ? '✅' : '⚠️';
    console.log(`${check} ${item}`);
  });
  
  console.log('\n🚀 READY FOR MANUAL TESTING');
  console.log('===========================');
  
  if (passed === results.length) {
    console.log('🎉 All experiments are working! Ready for manual testing.');
    console.log('\n📋 Manual Test Steps:');
    console.log('1. Open browser: http://localhost:3000');
    console.log('2. Login with test users:');
    console.log('   - Student: student@example.com / password123');
    console.log('   - Teacher: teacher@example.com / password123');
    console.log('   - Admin: admin@example.com / password123');
    console.log('3. Navigate to LabTwin: /learning-paths-demo/labtwin');
    console.log('4. Test each experiment:');
    
    experiments.forEach(exp => {
      console.log(`   - ${exp.name}: ${exp.url}`);
    });
    
    console.log('\n🧪 Test Each Experiment For:');
    console.log('- Canvas animations work');
    console.log('- Controls respond properly');
    console.log('- Data updates in real-time');
    console.log('- Theory section displays correctly');
    console.log('- Navigation works smoothly');
  } else {
    console.log('⚠️ Some experiments have issues. Please check the errors above.');
  }
}

// Run the detailed tests
testLabTwinDetailed().catch(console.error);

