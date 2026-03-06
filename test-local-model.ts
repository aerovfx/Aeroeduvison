import { modelSelector, TaskType, Priority } from './lib/ai/model-selector';
import { OpenAIProvider } from './lib/ai/providers/openai-provider';

// Mock environment variables
process.env.OPENAI_API_KEY = 'ollama';
process.env.OPENAI_BASE_URL = 'http://localhost:11434/v1';

async function testModelSelection() {
    console.log('Testing Model Selection for nemotron-orchestrator...');

    // 1. Check if model is in the list
    const models = (modelSelector as any).models; // Access private property for testing
    const nemotron = models.find((m: any) => m.name === 'nemotron-orchestrator');

    if (nemotron) {
        console.log('✅ nemotron-orchestrator found in model list');
        console.log('   Endpoint:', nemotron.endpoint);
    } else {
        console.error('❌ nemotron-orchestrator NOT found in model list');
        process.exit(1);
    }

    // 2. Test Selection Logic
    const context = {
        taskType: TaskType.CHAT_SUPPORT,
        priority: [Priority.COST, Priority.PRIVACY], // High priority for cost (0) and privacy
        inputLength: 100,
        expectedOutputLength: 200,
        requiresVietnamese: true,
        requiresRealtime: false,
        privacyRequired: true,
        studentAgeGroup: 'university' as const,
    };

    try {
        const selection = await modelSelector.selectModel(context);
        console.log(`Selected Model: ${selection.selectedModel}`);

        if (selection.selectedModel === 'nemotron-orchestrator') {
            console.log('✅ Correctly selected nemotron-orchestrator based on Cost/Privacy');
        } else {
            console.warn(`⚠️ Selected ${selection.selectedModel} instead. Check scoring logic.`);
        }

    } catch (error) {
        console.error('❌ Error selecting model:', error);
    }

    // 3. Test Provider Availability Logic
    const provider = new OpenAIProvider('ollama', 'http://localhost:11434/v1');
    const isAvailable = await provider.isAvailable();
    console.log(`Provider configured with 'ollama' key and local baseurl isAvailable: ${isAvailable}`);

    if (isAvailable) {
        console.log('✅ Provider validation relaxed successfully');
    } else {
        console.log('❌ Provider validation failed');
    }

}

testModelSelection();
