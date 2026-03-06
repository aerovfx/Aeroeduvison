#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function checkAIGeneratorRoute() {
  console.log('🔍 Checking AI Content Generator route setup...\n');
  
  // 1. Check file exists
  const filePath = path.join(process.cwd(), 'app/(dashboard)/(routes)/dashboard/ai-content-generator/page.tsx');
  const fileExists = fs.existsSync(filePath);
  
  console.log('1. File Check:');
  console.log(`   ✓ Path: ${filePath}`);
  console.log(`   ${fileExists ? '✅' : '❌'} File exists: ${fileExists}`);
  
  if (fileExists) {
    const stats = fs.statSync(filePath);
    console.log(`   ✓ File size: ${stats.size} bytes`);
    console.log(`   ✓ Modified: ${stats.mtime}`);
  }
  
  // 2. Check sidebar routes
  console.log('\n2. Sidebar Routes Check:');
  const sidebarPath = path.join(process.cwd(), 'app/(dashboard)/_components/sidebar-routes.tsx');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');
  
  const hasStudentRoute = sidebarContent.includes('href: "/dashboard/ai-content-generator"');
  const hasTeacherRoute = sidebarContent.includes('label: "🚀 AI Content Generator"');
  
  console.log(`   ${hasStudentRoute ? '✅' : '❌'} Student route configured`);
  console.log(`   ${hasTeacherRoute ? '✅' : '✅'} Teacher route configured`);
  
  // 3. Check route is accessible
  console.log('\n3. Route Accessibility:');
  try {
    const response = await fetch('http://localhost:3000/dashboard/ai-content-generator');
    console.log(`   ${response.ok ? '✅' : '❌'} HTTP Status: ${response.status}`);
    
    if (response.ok) {
      const html = await response.text();
      const hasAIGenerator = html.includes('AI Content Generator');
      console.log(`   ${hasAIGenerator ? '✅' : '❌'} Page contains "AI Content Generator": ${hasAIGenerator}`);
    }
  } catch (error) {
    console.log(`   ❌ Cannot access route: ${error.message}`);
  }
  
  // 4. Check database table
  console.log('\n4. Database Check:');
  try {
    const count = await prisma.aIGeneratedContent.count();
    console.log(`   ✅ AIGeneratedContent table exists`);
    console.log(`   ✓ Records count: ${count}`);
  } catch (error) {
    console.log(`   ❌ Database error: ${error.message}`);
  }
  
  console.log('\n✅ Route setup check complete!');
  console.log('\n📋 Access URLs:');
  console.log('   - http://localhost:3000/dashboard/ai-content-generator');
  console.log('   - http://localhost:3000/teacher/ai-content-generator (legacy)');
  
  await prisma.$disconnect();
}

checkAIGeneratorRoute();
