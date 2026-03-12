#!/usr/bin/env bun
/**
 * Benchmark Rust services vs Node.js
 * Usage: bun run scripts/benchmark-rust-services.ts
 */

const SERVICES = [
  { name: 'aero-backend', port: 8090, endpoints: ['/health'] },
  { name: 'vector-sim-service', port: 8091, endpoints: ['/health'] },
  { name: 'auth-service', port: 8092, endpoints: ['/health'] },
  { name: 'course-service', port: 8093, endpoints: ['/health'] },
  { name: 'admin-service', port: 8094, endpoints: ['/health'] },
  { name: 'ai-service', port: 8095, endpoints: ['/health'] },
  { name: 'student-service', port: 8096, endpoints: ['/health'] },
  { name: 'stem-service', port: 8097, endpoints: ['/health'] },
  { name: 'media-service', port: 8098, endpoints: ['/health'] },
];

async function checkHealth(service: typeof SERVICES[0]) {
  const start = Date.now();
  try {
    const response = await fetch(`http://127.0.0.1:${service.port}${service.endpoints[0]}`, {
      signal: AbortSignal.timeout(5000),
    });
    const duration = Date.now() - start;
    return {
      name: service.name,
      port: service.port,
      status: response.ok ? '✅ Healthy' : '❌ Unhealthy',
      duration: `${duration}ms`,
      statusCode: response.status,
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    return {
      name: service.name,
      port: service.port,
      status: '❌ Error',
      duration: `${duration}ms`,
      error: error.message,
    };
  }
}

async function main() {
  console.log('🔍 Checking Rust services health...\n');
  
  const results = [];
  for (const service of SERVICES) {
    const result = await checkHealth(service);
    results.push(result);
    console.log(`${result.name.padEnd(20)} (port ${result.port}): ${result.status} - ${result.duration}`);
  }
  
  const healthy = results.filter(r => r.status.includes('✅')).length;
  const unhealthy = results.filter(r => r.status.includes('❌')).length;
  
  console.log('\n' + '='.repeat(60));
  console.log(`Summary: ${healthy} healthy, ${unhealthy} unhealthy`);
  console.log('='.repeat(60));
  
  if (healthy === SERVICES.length) {
    console.log('\n🎉 All Rust services are running and healthy!');
  } else {
    console.log('\n⚠️  Some services are not running. Start them with: bun run rust:all');
  }
}

main().catch(console.error);
