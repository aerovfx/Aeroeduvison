/**
 * Stress Test for AI Content Generator API
 * Uses autocannon for high-performance load testing
 */

const autocannon = require('autocannon');
const { performance } = require('perf_hooks');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         🔥 STRESS TEST - AI CONTENT GENERATOR            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Test configuration
const tests = [
  {
    name: 'Light Load - Demo Mode',
    connections: 10,
    duration: 10,
    pipelining: 1,
    body: JSON.stringify({
      type: 'quiz',
      subject: 'Vật lý',
      grade: '12',
      topic: 'Dao động cơ',
      aiModel: 'demo'
    })
  },
  {
    name: 'Medium Load - Demo Mode',
    connections: 50,
    duration: 10,
    pipelining: 1,
    body: JSON.stringify({
      type: 'quiz',
      subject: 'Vật lý',
      grade: '12',
      topic: 'Dao động cơ',
      aiModel: 'demo'
    })
  },
  {
    name: 'Heavy Load - Demo Mode',
    connections: 100,
    duration: 10,
    pipelining: 1,
    body: JSON.stringify({
      type: 'quiz',
      subject: 'Vật lý',
      grade: '12',
      topic: 'Dao động cơ',
      aiModel: 'demo'
    })
  }
];

async function runTest(testConfig) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔥 Running: ${testConfig.name}`);
    console.log(`   Connections: ${testConfig.connections}`);
    console.log(`   Duration: ${testConfig.duration}s`);
    console.log(`   Pipelining: ${testConfig.pipelining}\n`);

    const instance = autocannon({
      url: 'http://localhost:3001/api/ai-content/generate-stream',
      connections: testConfig.connections,
      duration: testConfig.duration,
      pipelining: testConfig.pipelining,
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: testConfig.body
    }, (err, result) => {
      if (err) {
        console.error(`   ❌ Test failed:`, err.message);
        reject(err);
      } else {
        console.log(`\n   ✅ Test completed!`);
        console.log(`   📊 Results:`);
        console.log(`      Total Requests: ${result.requests.total}`);
        console.log(`      Requests/sec: ${result.requests.average}`);
        console.log(`      Throughput: ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/sec`);
        console.log(`      Latency (avg): ${result.latency.mean.toFixed(2)}ms`);
        console.log(`      Latency (p50): ${result.latency.p50}ms`);
        console.log(`      Latency (p90): ${result.latency.p90}ms`);
        console.log(`      Latency (p99): ${result.latency.p99}ms`);
        console.log(`      Errors: ${result.errors}`);
        console.log(`      Timeouts: ${result.timeouts}`);
        console.log(`      2xx responses: ${result['2xx']}`);
        console.log(`      4xx responses: ${result['4xx']}`);
        console.log(`      5xx responses: ${result['5xx']}`);
        resolve(result);
      }
    });

    // Track progress
    autocannon.track(instance, {
      renderProgressBar: true,
      renderResultsTable: false
    });
  });
}

async function runAllTests() {
  const startTime = performance.now();
  const results = [];

  for (const test of tests) {
    try {
      const result = await runTest(test);
      results.push({
        name: test.name,
        success: true,
        result
      });
      
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      results.push({
        name: test.name,
        success: false,
        error: error.message
      });
    }
  }

  const endTime = performance.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    STRESS TEST SUMMARY                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name}`);
    if (result.success) {
      console.log(`   ✅ Success`);
      console.log(`   Requests: ${result.result.requests.total}`);
      console.log(`   Avg Latency: ${result.result.latency.mean.toFixed(2)}ms`);
      console.log(`   Req/sec: ${result.result.requests.average}`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
    console.log('');
  });

  console.log(`⏱️  Total execution time: ${totalTime} seconds\n`);

  // Performance assessment
  const successfulTests = results.filter(r => r.success);
  if (successfulTests.length > 0) {
    const avgLatency = successfulTests.reduce((sum, r) => sum + r.result.latency.mean, 0) / successfulTests.length;
    const avgReqPerSec = successfulTests.reduce((sum, r) => sum + r.result.requests.average, 0) / successfulTests.length;
    
    console.log('📊 Overall Performance:');
    console.log(`   Average Latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`   Average Req/sec: ${avgReqPerSec.toFixed(2)}`);
    
    if (avgLatency < 100) {
      console.log('   🎉 Excellent latency!');
    } else if (avgLatency < 500) {
      console.log('   ✅ Good latency');
    } else {
      console.log('   ⚠️  High latency - consider optimization');
    }
  }
}

runAllTests().catch(console.error);
