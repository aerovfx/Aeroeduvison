#!/usr/bin/env node

/**
 * Script để test production build locally
 * Chạy: node scripts/test-production-build.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Testing Production Build...\n');

try {
  // 1. Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  if (fs.existsSync('.next')) {
    execSync('rm -rf .next', { stdio: 'inherit' });
  }
  
  // 2. Build for production
  console.log('\n🔨 Building for production...');
  execSync('npm run build', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  // 3. Check if build was successful
  if (fs.existsSync('.next')) {
    console.log('\n✅ Build successful!');
    console.log('📁 Build output in .next/ directory');
    
    // 4. Check for common issues
    console.log('\n🔍 Checking for potential issues...');
    
    // Check if static assets exist
    const staticPath = path.join('.next', 'static');
    if (fs.existsSync(staticPath)) {
      console.log('✅ Static assets generated');
    } else {
      console.log('❌ Static assets missing');
    }
    
    // Check standalone build
    const standalonePath = path.join('.next', 'standalone');
    if (fs.existsSync(standalonePath)) {
      console.log('✅ Standalone build generated');
    } else {
      console.log('ℹ️  No standalone build (normal for some platforms)');
    }
    
    console.log('\n🌐 To test production build locally:');
    console.log('   npm run start');
    console.log('   Then visit: http://localhost:3000');
    
  } else {
    console.log('\n❌ Build failed - .next directory not found');
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n💥 Build failed:', error.message);
  process.exit(1);
}




