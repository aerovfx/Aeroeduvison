/**
 * Test script for Nemotron-Orchestrator Local Model Integration
 * Tests the AI Agent system with local Ollama model
 */

import { getAIService } from './lib/ai/index';
import { TaskType, Priority, modelSelector } from './lib/ai/model-selector';

async function testNemotronIntegration() {
  console.log('🧪 Testing Nemotron-Orchestrator Integration\n');
  console.log('=' .repeat(60));

  // Test 1: Model Selector
  console.log('\n📋 Test 1: Model Selection for Educational Tasks\n');

  const testContexts = [
    {
      name: 'Lesson Planning',
      context: {
        taskType: TaskType.LESSON_PLANNING,
        priority: [Priority.COST, Priority.QUALITY],
        inputLength: 500,
        expectedOutputLength: 2000,
        requiresVietnamese: true,
        requiresRealtime: false,
        privacyRequired: true,
        studentAgeGroup: 'secondary' as const,
        subject: 'Mathematics',
        difficulty: 'medium' as const,
      },
    },
    {
      name: 'Code Teaching',
      context: {
        taskType: TaskType.CODE_TEACHING,
        priority: [Priority.PRIVACY, Priority.QUALITY],
        inputLength: 300,
        expectedOutputLength: 1500,
        requiresVietnamese: true,
        requiresRealtime: false,
        privacyRequired: true,
        studentAgeGroup: 'university' as const,
        subject: 'Programming',
        difficulty: 'hard' as const,
      },
    },
    {
      name: 'Explanation',
      context: {
        taskType: TaskType.EXPLANATION,
        priority: [Priority.COST, Priority.SPEED],
        inputLength: 200,
        expectedOutputLength: 800,
        requiresVietnamese: true,
        requiresRealtime: true,
        privacyRequired: false,
        studentAgeGroup: 'primary' as const,
        subject: 'Science',
        difficulty: 'easy' as const,
      },
    },
  ];

  for (const test of testContexts) {
    const result = await modelSelector.selectModel(test.context);
    console.log(`\n🎯 Task: ${test.name}`);
    console.log(`   Selected Model: ${result.selectedModel}`);
    console.log(`   Provider: ${result.provider}`);
    console.log(`   Estimated Cost: $${result.estimatedCost.toFixed(4)}`);
    console.log(`   Estimated Time: ${result.estimatedTime}s`);
    console.log(`   Score: ${result.score.toFixed(2)}`);
    console.log(`   Reason: ${result.reasoning}`);
    console.log(`   Alternatives: ${result.alternatives.map(a => a.model).join(', ')}`);
  }

  // Test 2: AI Service Orchestrator
  console.log('\n\n📋 Test 2: AI Service with Ollama Provider\n');
  console.log('=' .repeat(60));

  const aiService = getAIService({
    preferredProvider: 'ollama',
    fallbackEnabled: true,
    cacheEnabled: false, // Disable cache for testing
    rateLimitEnabled: false,
  });

  // Health check
  console.log('\n🏥 Health Check:');
  const health = await aiService.healthCheck();
  console.log(JSON.stringify(health, null, 2));

  // Test completion
  console.log('\n\n💬 Test Completion Request:\n');

  try {
    const response = await aiService.complete({
      messages: [
        {
          role: 'system',
          content: 'Bạn là một trợ lý giáo dục AI chuyên về toán học cho học sinh THCS Việt Nam.',
        },
        {
          role: 'user',
          content: 'Giải thích khái niệm phân số và cho 2 ví dụ đơn giản.',
        },
      ],
      options: {
        model: 'nemotron-orchestrator',
        temperature: 0.7,
        maxTokens: 500,
      },
    });

    console.log('✅ Response received:');
    console.log(`   Provider: ${response.provider}`);
    console.log(`   Model: ${response.model}`);
    console.log(`   Cached: ${response.cached}`);
    console.log(`   Cost: $${response.cost.toFixed(4)}`);
    console.log(`   Tokens: ${response.usage.totalTokens}`);
    console.log(`   Finish Reason: ${response.finishReason}`);
    console.log('\n📝 Content:\n');
    console.log(response.content);

  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    console.log('\n💡 Make sure:');
    console.log('   1. Ollama is running: ollama serve');
    console.log('   2. Model is installed: ollama pull nemotron-orchestrator');
    console.log('   3. Environment variables are set correctly');
  }

  // Test 3: Auto provider selection
  console.log('\n\n📋 Test 3: Auto Provider Selection\n');
  console.log('=' .repeat(60));

  const aiServiceAuto = getAIService({
    preferredProvider: 'auto',
    fallbackEnabled: true,
    cacheEnabled: false,
    rateLimitEnabled: false,
  });

  try {
    const response = await aiServiceAuto.complete({
      messages: [
        {
          role: 'user',
          content: 'Hello! What is 2+2?',
        },
      ],
      options: {
        temperature: 0.5,
        maxTokens: 100,
      },
    });

    console.log('✅ Auto-selection result:');
    console.log(`   Provider: ${response.provider}`);
    console.log(`   Model: ${response.model}`);
    console.log(`   Cost: $${response.cost.toFixed(4)}`);
    console.log(`   Content: ${response.content.substring(0, 100)}...`);

  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  // Test 4: Statistics
  console.log('\n\n📋 Test 4: Service Statistics\n');
  console.log('=' .repeat(60));

  const stats = await aiService.getStats();
  console.log(JSON.stringify(stats, null, 2));

  console.log('\n\n✅ Testing Complete!\n');
}

// Run tests
testNemotronIntegration().catch(console.error);
