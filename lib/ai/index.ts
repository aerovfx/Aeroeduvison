/**
 * AI Service Module - Main Export
 * Centralized access to all AI services
 */

// Core Services
export { AIServiceOrchestrator, getAIService } from './ai-service-orchestrator';
export { ContentGeneratorService } from './services/content-generator';
export { SmartGradingService } from './services/smart-grading';
export { CostTracker, getCostTracker } from './monitoring/cost-tracker';
export { AICacheManager, createAICacheManager } from './cache/ai-cache-manager';
export { AIRateLimiter, createAIRateLimiter } from './rate-limiter';

// Week 3-4: Enhanced Services
export { GradingValidator, createGradingValidator } from './services/grading-validator';
export { HumanReviewWorkflow, createHumanReviewWorkflow } from './services/human-review-workflow';
export { ContentQualityScorer, createContentQualityScorer } from './quality/content-quality-scorer';

// Testing & Benchmarking
export { ABTestingFramework, createABTestingFramework } from './testing/ab-testing-framework';
export { PerformanceBenchmark } from './testing/performance-benchmark';

// Types - Core
export type { AIServiceConfig, AIRequest, AIResponse } from './ai-service-orchestrator';
export type { ContentRequest, GeneratedLesson, GeneratedQuiz, GeneratedSlides } from './services/content-generator';
export type { GradingRequest, GradingResult, GradingRubric } from './services/smart-grading';
export type { CostEntry, CostSummary, CostAlert } from './monitoring/cost-tracker';
export type { CacheConfig, CacheStats } from './cache/ai-cache-manager';
export type { RateLimitConfig, RateLimitStatus } from './rate-limiter';

// Types - Enhanced Services
export type { ValidationResult, ValidationIssue, GradingConsistencyCheck } from './services/grading-validator';
export type { ReviewTask, ReviewerStats } from './services/human-review-workflow';
export type { QualityScore, QualityIssue } from './quality/content-quality-scorer';

// Types - Testing
export type { ABTestConfig, ABVariant, ABTestResult, ABTestSummary } from './testing/ab-testing-framework';
export type { BenchmarkConfig, BenchmarkResult } from './testing/performance-benchmark';

// Provider exports
export type { AIProvider, AIMessage, AICompletionOptions, AICompletionResponse } from './providers/base-provider';
export { OpenAIProvider } from './providers/openai-provider';
export { GeminiProvider } from './providers/gemini-provider';
export { OllamaProvider } from './providers/ollama-provider';
export { OllamaProvider } from './providers/ollama-provider';

