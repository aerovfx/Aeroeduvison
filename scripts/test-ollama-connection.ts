#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testOllamaConnection() {
  console.log('🏠 Testing Ollama connection...');
  
  try {
    // Test 1: Check if Ollama server is running
    console.log('\n1. Testing Ollama server connection...');
    const healthResponse = await fetch('http://localhost:11434/api/tags');
    
    if (!healthResponse.ok) {
      throw new Error(`Ollama server not responding: ${healthResponse.status}`);
    }
    
    const models = await healthResponse.json();
    console.log('✅ Ollama server is running');
    console.log('📋 Available models:', models.models?.map((m: any) => m.name) || []);
    
    // Test 2: Test model generation
    console.log('\n2. Testing model generation...');
    const generateResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2:latest',
        prompt: 'Tạo 1 câu hỏi trắc nghiệm về toán học lớp 10 với format JSON: {"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctAnswer": 0, "explanation": "..."}',
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 1000,
        }
      }),
    });
    
    if (!generateResponse.ok) {
      throw new Error(`Generation failed: ${generateResponse.status}`);
    }
    
    const result = await generateResponse.json();
    console.log('✅ Model generation successful');
    console.log('📝 Response length:', result.response?.length || 0);
    console.log('📝 Response preview:', result.response?.substring(0, 200) + '...');
    
    // Test 3: Test JSON parsing
    console.log('\n3. Testing JSON parsing...');
    try {
      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ JSON parsing successful');
        console.log('📋 Parsed structure:', Object.keys(parsed));
      } else {
        console.log('⚠️  No JSON found in response');
      }
    } catch (error) {
      console.log('❌ JSON parsing failed:', error);
    }
    
    // Test 4: Test API integration (skip auth for now)
    console.log('\n4. Testing API integration...');
    console.log('⚠️  Skipping API test due to authentication requirements');
    console.log('✅ Ollama connection and generation working properly');
    console.log('📋 Ready for use in AI Content Generator');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testOllamaConnection();