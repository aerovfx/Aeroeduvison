/**
 * Comprehensive Test Suite for AI Content Generator
 * Tests: Proxy, Latency, Error Handling, Streaming, Security
 */

import { performance } from 'perf_hooks';

// ============================================================================
// 1. ENDPOINT PROXY TEST
// ============================================================================

async function testEndpointProxy() {
  console.log('\n🔍 ===== TEST 1: ENDPOINT PROXY =====\n');
  
  const testCases = [
    {
      name: 'Quiz Generation with Grok',
      payload: {
        type: 'quiz',
        subject: 'Vật lý',
        grade: '12',
        topic: 'Dao động cơ',
        duration: 30,
        difficulty: 'medium',
        aiModel: 'grok'
      }
    },
    {
      name: 'Lesson Generation with Cursor',
      payload: {
        type: 'lesson',
        subject: 'Toán học',
        grade: '10',
        topic: 'Phương trình bậc hai',
        duration: 45,
        difficulty: 'easy',
        aiModel: 'cursor'
      }
    },
    {
      name: 'Freeform with Demo',
      payload: {
        type: 'quiz',
        freeformPrompt: 'Tạo 5 câu hỏi về động lực học',
        aiModel: 'demo'
      }
    }
  ];

  for (const test of testCases) {
    console.log(`📝 Testing: ${test.name}`);
    try {
      const response = await fetch('http://localhost:3001/api/ai-content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'next-auth.session-token=test' // Will fail auth but test proxy
        },
        body: JSON.stringify(test.payload)
      });

      console.log(`   Status: ${response.status}`);
      console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Response structure valid`);
        console.log(`   Keys:`, Object.keys(data));
      } else {
        const error = await response.text();
        console.log(`   ⚠️  Error:`, error.substring(0, 100));
      }
    } catch (error: any) {
      console.log(`   ❌ Request failed:`, error.message);
    }
    console.log('');
  }
}

// ============================================================================
// 2. LATENCY TEST
// ============================================================================

async function testLatency() {
  console.log('\n⏱️  ===== TEST 2: LATENCY MEASUREMENT =====\n');
  
  const iterations = 5;
  const latencies: number[] = [];

  for (let i = 1; i <= iterations; i++) {
    console.log(`🔄 Request ${i}/${iterations}...`);
    
    const start = performance.now();
    
    try {
      const response = await fetch('http://localhost:3001/api/ai-content/generate-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'quiz',
          subject: 'Vật lý',
          grade: '12',
          topic: 'Dao động cơ',
          aiModel: 'demo'
        })
      });

      const end = performance.now();
      const latency = end - start;
      latencies.push(latency);

      console.log(`   ✅ Completed in ${latency.toFixed(2)}ms`);
      
      // Read response to complete request
      if (response.ok) {
        await response.text();
      }
    } catch (error: any) {
      console.log(`   ❌ Failed:`, error.message);
    }
  }

  console.log('\n📊 Latency Statistics:');
  console.log(`   Average: ${(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)}ms`);
  console.log(`   Min: ${Math.min(...latencies).toFixed(2)}ms`);
  console.log(`   Max: ${Math.max(...latencies).toFixed(2)}ms`);
  console.log(`   Median: ${latencies.sort((a, b) => a - b)[Math.floor(latencies.length / 2)].toFixed(2)}ms`);
}

// ============================================================================
// 3. ERROR HANDLING TEST
// ============================================================================

async function testErrorHandling() {
  console.log('\n🚨 ===== TEST 3: ERROR HANDLING =====\n');
  
  const errorTests = [
    {
      name: 'Invalid API Model',
      payload: {
        type: 'quiz',
        subject: 'Vật lý',
        grade: '12',
        topic: 'Dao động cơ',
        aiModel: 'invalid-model' // Invalid model
      },
      expectedError: true
    },
    {
      name: 'Missing Required Fields',
      payload: {
        type: 'quiz',
        // Missing subject, grade, topic
        aiModel: 'demo'
      },
      expectedError: false // Should fallback gracefully
    },
    {
      name: 'Invalid Content Type',
      payload: {
        type: 'invalid-type', // Invalid type
        subject: 'Vật lý',
        grade: '12',
        topic: 'Dao động cơ',
        aiModel: 'demo'
      },
      expectedError: true
    },
    {
      name: 'Grok without API Key',
      payload: {
        type: 'quiz',
        subject: 'Vật lý',
        grade: '12',
        topic: 'Dao động cơ',
        aiModel: 'grok' // Will fallback if no key
      },
      expectedError: false // Should fallback to demo
    }
  ];

  for (const test of errorTests) {
    console.log(`🧪 Testing: ${test.name}`);
    try {
      const response = await fetch('http://localhost:3001/api/ai-content/generate-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test.payload)
      });

      console.log(`   Status: ${response.status}`);
      
      if (test.expectedError) {
        if (!response.ok) {
          console.log(`   ✅ Correctly returned error`);
        } else {
          console.log(`   ⚠️  Expected error but got success`);
        }
      } else {
        if (response.ok) {
          console.log(`   ✅ Handled gracefully with fallback`);
        } else {
          console.log(`   ⚠️  Expected success but got error`);
        }
      }
      
      const data = await response.text();
      console.log(`   Response preview:`, data.substring(0, 100));
    } catch (error: any) {
      console.log(`   ❌ Request failed:`, error.message);
    }
    console.log('');
  }
}

// ============================================================================
// 4. STREAMING TEST
// ============================================================================

async function testStreaming() {
  console.log('\n🌊 ===== TEST 4: STREAMING =====\n');
  
  console.log('📡 Testing SSE streaming...');
  
  const start = performance.now();
  let chunkCount = 0;
  let totalBytes = 0;

  try {
    const response = await fetch('http://localhost:3001/api/ai-content/generate-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'lesson',
        subject: 'Vật lý',
        grade: '12',
        topic: 'Dao động cơ',
        aiModel: 'demo'
      })
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Headers:`, {
      'content-type': response.headers.get('content-type'),
      'transfer-encoding': response.headers.get('transfer-encoding')
    });

    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      console.log('\n   📦 Receiving chunks:');
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunkCount++;
        totalBytes += value.length;
        const chunk = decoder.decode(value);
        console.log(`   Chunk ${chunkCount}: ${chunk.length} bytes`);
      }

      const end = performance.now();
      console.log('\n   ✅ Streaming complete');
      console.log(`   Total chunks: ${chunkCount}`);
      console.log(`   Total bytes: ${totalBytes}`);
      console.log(`   Duration: ${(end - start).toFixed(2)}ms`);
      console.log(`   Throughput: ${(totalBytes / ((end - start) / 1000)).toFixed(2)} bytes/sec`);
    } else {
      console.log('   ⚠️  No response body');
    }
  } catch (error: any) {
    console.log(`   ❌ Streaming failed:`, error.message);
  }
}

// ============================================================================
// 5. SECURITY TEST
// ============================================================================

async function testSecurity() {
  console.log('\n🔒 ===== TEST 5: SECURITY =====\n');
  
  console.log('🔍 Checking for API key leakage...\n');

  // Test 1: Response doesn't contain API keys
  console.log('Test 1: API Key in Response');
  try {
    const response = await fetch('http://localhost:3001/api/ai-content/generate-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'quiz',
        subject: 'Vật lý',
        grade: '12',
        topic: 'Dao động cơ',
        aiModel: 'grok'
      })
    });

    const data = await response.text();
    const sensitivePatterns = [
      /xai-[a-zA-Z0-9]+/g,
      /sk-[a-zA-Z0-9]+/g,
      /key_[a-zA-Z0-9]+/g,
      /GROK_API_KEY/g,
      /OPENAI_API_KEY/g,
      /CURSOR_API_KEY/g
    ];

    let leaked = false;
    for (const pattern of sensitivePatterns) {
      if (pattern.test(data)) {
        console.log(`   ❌ SECURITY RISK: API key pattern found in response!`);
        leaked = true;
        break;
      }
    }

    if (!leaked) {
      console.log(`   ✅ No API keys found in response`);
    }
  } catch (error: any) {
    console.log(`   ⚠️  Test failed:`, error.message);
  }

  // Test 2: Headers don't expose sensitive info
  console.log('\nTest 2: Sensitive Headers');
  try {
    const response = await fetch('http://localhost:3001/api/ai-content/generate-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'quiz',
        subject: 'Vật lý',
        grade: '12',
        topic: 'Dao động cơ',
        aiModel: 'demo'
      })
    });

    const headers = Object.fromEntries(response.headers.entries());
    const sensitiveHeaders = ['authorization', 'x-api-key', 'api-key'];
    
    let exposed = false;
    for (const header of sensitiveHeaders) {
      if (headers[header]) {
        console.log(`   ❌ SECURITY RISK: Sensitive header exposed: ${header}`);
        exposed = true;
      }
    }

    if (!exposed) {
      console.log(`   ✅ No sensitive headers exposed`);
    }
  } catch (error: any) {
    console.log(`   ⚠️  Test failed:`, error.message);
  }

  // Test 3: CORS configuration
  console.log('\nTest 3: CORS Configuration');
  try {
    const response = await fetch('http://localhost:3001/api/ai-content/generate-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://malicious-site.com' // Test CORS
      },
      body: JSON.stringify({
        type: 'quiz',
        subject: 'Vật lý',
        grade: '12',
        topic: 'Dao động cơ',
        aiModel: 'demo'
      })
    });

    const corsHeader = response.headers.get('access-control-allow-origin');
    console.log(`   CORS Header: ${corsHeader}`);
    
    if (corsHeader === '*') {
      console.log(`   ⚠️  WARNING: CORS allows all origins (not recommended for production)`);
    } else if (corsHeader) {
      console.log(`   ✅ CORS configured with specific origin`);
    } else {
      console.log(`   ✅ No CORS header (same-origin only)`);
    }
  } catch (error: any) {
    console.log(`   ⚠️  Test failed:`, error.message);
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🧪 COMPREHENSIVE TEST SUITE FOR AI CONTENT GENERATOR   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const startTime = performance.now();

  try {
    await testEndpointProxy();
    await testLatency();
    await testErrorHandling();
    await testStreaming();
    await testSecurity();
  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error(error.stack);
  }

  const endTime = performance.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUITE COMPLETE                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n⏱️  Total execution time: ${totalTime} seconds\n`);
}

// Run tests
runAllTests().catch(console.error);
