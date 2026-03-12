#!/usr/bin/env bun
/**
 * Audit toàn bộ API endpoints Node.js còn lại
 * Phân loại theo:
 * - Ready to migrate (đã có Rust service)
 * - To consolidate (cần gộp vào existing services)
 * - To deprecate (không cần thiết)
 * - To remove (test/debug endpoints)
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const API_DIR = join(process.cwd(), 'app/api');

// 9 Rust services hiện có
const RUST_SERVICES = {
  'aero-backend': { port: 8090, routes: ['ocr', 'llm-grading', 'assignments'] },
  'vector-sim-service': { port: 8091, routes: ['vector'] },
  'auth-service': { port: 8092, routes: ['auth'] },
  'course-service': { port: 8093, routes: ['courses'] },
  'admin-service': { port: 8094, routes: ['admin'] },
  'ai-service': { port: 8095, routes: ['ai', 'chat', 'search'] },
  'student-service': { port: 8096, routes: ['students', 'classes', 'plg', 'learning-path'] },
  'stem-service': { port: 8097, routes: ['physics', 'chemistry', 'stem', 'motion', 'lab'] },
  'media-service': { port: 8098, routes: ['documents', 'exam', 'upload', 'question'] },
};

// Endpoints cần xóa
const TO_REMOVE = [
  'test', 'test-auth', 'test-auth-cleanup', 'test-auth-edge-cases',
  'test-auth-redirects', 'test-auth-session', 'test-cookies',
  'test-credentials', 'test-db', 'test-role-access', 'test-session', 'test-user',
  'debug-auth', 'debug-db', 'debug-nextauth', 'debug-session',
  'check-env', 'checkenv',
  'mock-auth', 'mock-db', 'mock-login',
];

// Endpoints cần deprecate
const TO_DEPRECATE = [
  'content-generation', 'labtwin', 'datasim-ai', 'ollama-grading',
  'sync', 'streaming', 'teacher', 'blocking', 'uploadthing',
  'redis', 'queue', 'motion-tracking', 'kg', 'quiz', 'video', 'wfc-builder',
];

// Mapping routes to Rust services
const ROUTE_MAPPING: Record<string, string> = {
  // Admin
  'admin': 'admin-service',
  // AI
  'ai': 'ai-service',
  'ai-analytics': 'ai-service',
  'ai-chat': 'ai-service',
  'ai-content': 'ai-service',
  'ai-generate-lesson': 'ai-service',
  'ai-grade-lesson': 'ai-service',
  'ai-intelligent': 'ai-service',
  'ai-tutor-chat': 'ai-service',
  // Auth
  'auth': 'auth-service',
  // Courses
  'courses': 'course-service',
  // Documents & Exams
  'documents': 'media-service',
  'exam-matrices': 'media-service',
  'exams': 'media-service',
  // Students
  'students': 'student-service',
  'classes': 'student-service',
  'plg': 'student-service',
  'learning-path': 'student-service',
  'learning-paths': 'student-service',
  // STEM
  'stem': 'stem-service',
  'physics-motion': 'stem-service',
  'motion-sim': 'stem-service',
  'motionsim': 'stem-service',
  'projectile': 'stem-service',
  'refraction': 'stem-service',
  'harmonic-motion': 'stem-service',
  'chemistry-lab': 'stem-service',
  'chemlab': 'stem-service',
  'chemlab-3d': 'stem-service',
  'optics-lab': 'stem-service',
  'lab-completion': 'stem-service',
  'labs': 'stem-service',
  // OCR & Grading
  'ocr': 'aero-backend',
  'ocr-grading': 'aero-backend',
  'ocr-process': 'aero-backend',
  'llm-grading': 'aero-backend',
  'ollama-grading': 'aero-backend',
  'assignments': 'aero-backend',
  'grading': 'aero-backend',
  // Vector
  'vector': 'vector-sim-service',
  'vector-similarity': 'vector-sim-service',
  // Other
  'search': 'ai-service',
  'chat': 'ai-service',
  'webhook': 'admin-service',
  'xp': 'student-service',
  'question-bank': 'media-service',
  'upload': 'media-service',
  'image-signed-url': 'media-service',
  'health': 'admin-service',
  'metrics': 'admin-service',
  'cache': 'admin-service',
  'users': 'admin-service',
  'generate-daily-plan': 'ai-service',
  'generate-lesson': 'ai-service',
  'generate-lesson-grok': 'ai-service',
  // Science simulations (deprecated)
  'aerodynamics': 'TO_DEPRECATE',
  'aeroflow-3d': 'TO_DEPRECATE',
  'biogrowth': 'TO_DEPRECATE',
  'mechaforce': 'TO_DEPRECATE',
  'thermoflow': 'TO_DEPRECATE',
  'weather-sim': 'TO_DEPRECATE',
};

async function getRouteContent(dirPath: string): Promise<string> {
  try {
    const content = await readFile(join(dirPath, 'route.ts'), 'utf-8');
    return content;
  } catch {
    return '';
  }
}

function getHttpMethods(content: string): string[] {
  const methods: string[] = [];
  const methodMap: Record<string, string> = {
    'export async function GET': 'GET',
    'export async function POST': 'POST',
    'export async function PUT': 'PUT',
    'export async function DELETE': 'DELETE',
    'export async function PATCH': 'PATCH',
  };
  
  for (const [pattern, method] of Object.entries(methodMap)) {
    if (content.includes(pattern)) {
      methods.push(method);
    }
  }
  
  return methods.length > 0 ? methods : ['GET'];
}

async function auditAPIs() {
  const results: Record<string, any> = {
    toMigrate: [] as any[],
    toRemove: [] as any[],
    toDeprecate: [] as any[],
    alreadyRouted: [] as any[],
  };

  const entries = await readdir(API_DIR, { withFileTypes: true });
  
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const dirName = entry.name;
    const dirPath = join(API_DIR, dirName);
    const routeContent = await getRouteContent(dirPath);
    
    // Skip if no route.ts
    if (!routeContent) continue;
    
    const methods = getHttpMethods(routeContent);
    const lines = routeContent.split('\n').length;
    
    const item = {
      path: `/api/${dirName}`,
      methods,
      lines,
      hasContent: routeContent.length > 0,
    };
    
    // Check if should be removed
    if (TO_REMOVE.includes(dirName)) {
      results.toRemove.push(item);
      continue;
    }
    
    // Check if should be deprecated
    if (TO_DEPRECATE.includes(dirName)) {
      results.toDeprecate.push(item);
      continue;
    }
    
    // Map to Rust service
    const rustService = ROUTE_MAPPING[dirName];
    if (rustService) {
      if (rustService === 'TO_DEPRECATE') {
        results.toDeprecate.push(item);
      } else {
        results.toMigrate.push({
          ...item,
          rustService,
          rustPort: RUST_SERVICES[rustService as keyof typeof RUST_SERVICES]?.port,
        });
      }
    } else {
      // Unknown route - needs review
      results.toMigrate.push({
        ...item,
        rustService: 'REVIEW_NEEDED',
        rustPort: null,
      });
    }
  }
  
  return results;
}

async function main() {
  console.log('🔍 Auditing Node.js API endpoints...\n');
  
  const results = await auditAPIs();
  
  console.log('='.repeat(60));
  console.log('📊 AUDIT SUMMARY');
  console.log('='.repeat(60));
  console.log();
  
  console.log(`✅ To Migrate to Rust: ${results.toMigrate.length} endpoints`);
  console.log(`🗑️  To Remove: ${results.toRemove.length} endpoints`);
  console.log(`⚠️  To Deprecate: ${results.toDeprecate.length} endpoints`);
  console.log();
  
  console.log('='.repeat(60));
  console.log('📦 TO MIGRATE (by Rust service)');
  console.log('='.repeat(60));
  
  const byService: Record<string, any[]> = {};
  for (const item of results.toMigrate) {
    const service = item.rustService || 'UNKNOWN';
    if (!byService[service]) byService[service] = [];
    byService[service].push(item);
  }
  
  for (const [service, items] of Object.entries(byService)) {
    console.log(`\n${service} (${items.length} APIs):`);
    for (const item of items) {
      console.log(`  - ${item.path} [${item.methods.join(', ')}]`);
    }
  }
  
  console.log();
  console.log('='.repeat(60));
  console.log('🗑️  TO REMOVE (test/debug endpoints)');
  console.log('='.repeat(60));
  for (const item of results.toRemove) {
    console.log(`  - ${item.path}`);
  }
  
  console.log();
  console.log('='.repeat(60));
  console.log('⚠️  TO DEPRECATE (legacy/unused)');
  console.log('='.repeat(60));
  for (const item of results.toDeprecate) {
    console.log(`  - ${item.path}`);
  }
  
  console.log();
  console.log('='.repeat(60));
  console.log('📈 MIGRATION PROGRESS');
  console.log('='.repeat(60));
  
  const totalEndpoints = results.toMigrate.length + results.toRemove.length + results.toDeprecate.length;
  const alreadyMigrated = 91; // From previous migration
  const remaining = results.toMigrate.length;
  const afterCleanup = remaining - results.toDeprecate.length - results.toRemove.length;
  
  console.log(`Already migrated: ${alreadyMigrated}`);
  console.log(`Remaining to migrate: ${remaining}`);
  console.log(`After cleanup: ${afterCleanup}`);
  console.log(`Total endpoints: ${totalEndpoints + alreadyMigrated}`);
  console.log();
  
  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      toMigrate: results.toMigrate.length,
      toRemove: results.toRemove.length,
      toDeprecate: results.toDeprecate.length,
      alreadyMigrated: 91,
    },
    details: results,
  };
  
  console.log('💾 Report saved to: scripts/audit-report.json');
  await Bun.write('scripts/audit-report.json', JSON.stringify(report, null, 2));
}

main().catch(console.error);
