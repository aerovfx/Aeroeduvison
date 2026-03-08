/**
 * k6 Load Testing Script for AeroeduVision
 * 
 * Installation:
 *   npm install -g k6
 *   or download from https://k6.io/docs/getting-started/installation/
 * 
 * Usage:
 *   k6 run load-testing/k6-script.js
 *   k6 run --vus 100 --duration 30s load-testing/k6-script.js
 *   k6 run --vus 1000 --duration 5m load-testing/k6-script.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ============================================================================
// Custom Metrics
// ============================================================================

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const successfulLogins = new Counter('successful_logins');
const failedLogins = new Counter('failed_logins');
const aiRequests = new Counter('ai_requests');

// ============================================================================
// Test Configuration
// ============================================================================

export const options = {
  // Scenarios for different load patterns
  scenarios: {
    // Light load test
    light_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },   // Ramp up to 50 users
        { duration: '3m', target: 50 },   // Stay at 50 users
        { duration: '1m', target: 0 },    // Ramp down to 0
      ],
      gracefulRampDown: '30s',
    },
    
    // Stress test
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 200 },  // Ramp up to 200 users
        { duration: '5m', target: 200 },  // Stay at 200 users
        { duration: '2m', target: 0 },    // Ramp down to 0
      ],
      gracefulRampDown: '30s',
    },
    
    // Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },   // Ramp up to 50
        { duration: '1m', target: 50 },   // Stay at 50
        { duration: '1m', target: 500 },  // Spike to 500
        { duration: '1m', target: 500 },  // Stay at 500
        { duration: '1m', target: 50 },   // Back to 50
        { duration: '1m', target: 50 },   // Stay at 50
      ],
    },
    
    // Soak test (long-running)
    soak_test: {
      executor: 'constant-vus',
      vus: 100,
      duration: '1h',
      gracefulStop: '30s',
    },
  },
  
  // Thresholds for pass/fail criteria
  thresholds: {
    http_req_duration: ['p(50)<500', 'p(90)<1000', 'p(95)<1500'], // 50% < 500ms, 90% < 1s, 95% < 1.5s
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    api_latency: ['p(95)<1000'],
    errors: ['rate<0.01'],
    successful_logins: ['count>0'],
  },
  
  // Summary trend stats
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ============================================================================
// Test Data & Setup
// ============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = __ENV.API_URL || 'http://localhost:8090';

// Test credentials (use test users in production)
const testUsers = [
  { email: 'student1@test.com', password: 'Test1234!' },
  { email: 'student2@test.com', password: 'Test1234!' },
  { email: 'teacher1@test.com', password: 'Test1234!' },
  { email: 'admin1@test.com', password: 'Test1234!' },
];

export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  console.log(`API URL: ${API_URL}`);
  return { startTime: new Date().toISOString() };
}

// ============================================================================
// Scenarios
// ============================================================================

// Scenario 1: Health Check (lightweight)
export function healthCheck() {
  const res = http.get(`${BASE_URL}/health`, {
    tags: { name: 'HealthCheck' },
  });
  
  const success = check(res, {
    'health check status is 200': (r) => r.status === 200,
    'health check latency < 100ms': (r) => r.timings.duration < 100,
  });
  
  errorRate.add(!success);
  sleep(1);
}

// Scenario 2: User Login
export function userLogin() {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  const payload = JSON.stringify({
    email: user.email,
    password: user.password,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'Login' },
  };
  
  const res = http.post(`${API_URL}/api/auth/login`, payload, params);
  
  const success = check(res, {
    'login status is 200': (r) => r.status === 200,
    'login response has user': (r) => JSON.parse(r.body).success === true,
    'login latency < 500ms': (r) => r.timings.duration < 500,
  });
  
  if (success) {
    successfulLogins.add(1);
  } else {
    failedLogins.add(1);
  }
  
  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
  sleep(2);
}

// Scenario 3: Browse Students (Teacher)
export function browseStudents() {
  const token = getAuthToken();
  
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { name: 'BrowseStudents' },
  };
  
  const res = http.get(`${API_URL}/api/teacher/students`, params);
  
  const success = check(res, {
    'browse students status is 200': (r) => r.status === 200,
    'browse students has data': (r) => JSON.parse(r.body).students !== undefined,
    'browse students latency < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
  sleep(3);
}

// Scenario 4: AI Content Generation
export function aiContentGeneration() {
  const token = getAuthToken();
  
  const payload = JSON.stringify({
    type: 'lesson',
    topic: 'Phương trình bậc hai',
    subject: 'Toán học',
    grade: '10',
    difficulty: 'medium',
  });
  
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    tags: { name: 'AIContentGeneration' },
  };
  
  const res = http.post(`${API_URL}/api/ai-content/generate`, payload, params);
  
  const success = check(res, {
    'AI generation status is 200': (r) => r.status === 200,
    'AI generation has content': (r) => JSON.parse(r.body).success === true,
    'AI generation latency < 5000ms': (r) => r.timings.duration < 5000,
  });
  
  aiRequests.add(1);
  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
  sleep(5);
}

// Scenario 5: Grading Submission
export function gradingSubmission() {
  const token = getAuthToken();
  
  const payload = JSON.stringify({
    assignment_id: 'test-assignment-1',
    submission: 'Bài làm của học sinh...',
    subject: 'Toán học',
  });
  
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    tags: { name: 'GradingSubmission' },
  };
  
  const res = http.post(`${API_URL}/api/grading/submit`, payload, params);
  
  const success = check(res, {
    'grading status is 200': (r) => r.status === 200,
    'grading has score': (r) => JSON.parse(r.body).data?.score !== undefined,
    'grading latency < 3000ms': (r) => r.timings.duration < 3000,
  });
  
  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
  sleep(3);
}

// Scenario 6: Vector Similarity
export function vectorSimilarity() {
  const payload = JSON.stringify({
    student_answer: 'Đảng Cộng sản Việt Nam ra đời năm 1930',
    model_answer: 'Đảng Cộng sản Việt Nam được thành lập vào ngày 3/2/1930',
    use_cache: true,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'VectorSimilarity' },
  };
  
  const res = http.post(`${API_URL}/api/vector-similarity`, payload, params);
  
  const success = check(res, {
    'vector similarity status is 200': (r) => r.status === 200,
    'vector similarity has result': (r) => JSON.parse(r.body).similarity !== undefined,
    'vector similarity latency < 100ms': (r) => r.timings.duration < 100,
  });
  
  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
  sleep(1);
}

// ============================================================================
// Load Test Combinations
// ============================================================================

// Default test: Mix of all scenarios
export default function() {
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    userLogin();
  } else if (scenario < 0.5) {
    browseStudents();
  } else if (scenario < 0.7) {
    aiContentGeneration();
  } else if (scenario < 0.85) {
    gradingSubmission();
  } else if (scenario < 0.95) {
    vectorSimilarity();
  } else {
    healthCheck();
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getAuthToken() {
  // In production, implement proper token management
  return 'test-jwt-token';
}

// ============================================================================
// Teardown
// ============================================================================

export function teardown(data) {
  console.log(`Load test completed at ${new Date().toISOString()}`);
  console.log(`Started at: ${data.startTime}`);
}
