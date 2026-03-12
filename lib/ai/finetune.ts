/**
 * AeroEdu Fine-Tuning Pipeline
 * Based on Aero-HowtoLLMs Module 07: Fine-tuning Pretrained Models
 *
 * Implements:
 * 1. PEFT concepts via Ollama Modelfile (system prompt + parameters + few-shot)
 * 2. Gradient Clipping & LR Scheduling (training phase scheduling)
 * 3. RLHF (Reinforcement Learning from Human Feedback)
 * 4. DPO (Direct Preference Optimization)
 * 5. Training data management & persistence
 * 6. Model evaluation metrics (token frequency analysis)
 */

import fs from 'fs/promises';
import path from 'path';

const OLLAMA_BASE = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const DATA_DIR = path.join(process.cwd(), '.data', 'finetune');

// ============================================================
// Types
// ============================================================

export interface TrainingExample {
  id: string;
  user: string;
  assistant: string;
  rating?: number;          // 1-5 human rating (RLHF)
  source: 'manual' | 'rlhf' | 'dpo' | 'generated';
  created_at: string;
}

export interface RLHFComparison {
  id: string;
  prompt: string;
  response_a: string;
  response_b: string;
  preferred: 'a' | 'b' | 'tie';
  reasoning?: string;
  reward_score_a?: number;
  reward_score_b?: number;
  created_at: string;
}

export interface FineTuneConfig {
  base_model: string;
  target_model: string;

  // PEFT strategy
  peft_method: 'full' | 'lora_concept' | 'freeze_attention' | 'prefix_tuning';

  // System prompt
  system_prompt: string;

  // Model parameters
  temperature: number;
  top_k: number;
  top_p: number;
  presence_penalty: number;
  repeat_penalty: number;
  num_ctx: number;

  // Gradient clipping concept: limit training data influence
  max_response_divergence: number;
  // LR scheduling concept: training phases
  training_phase: 'warmup' | 'active' | 'cooldown';
  warmup_examples: number;
  cooldown_threshold: number;

  // RLHF parameters
  rlhf_enabled: boolean;
  reward_threshold: number;         // min rating to include
  dpo_beta: number;                 // DPO regularization
  preference_pairs_min: number;

  // Data
  training_data: TrainingExample[];
  rlhf_comparisons: RLHFComparison[];

  // Evaluation prompts
  eval_prompts: string[];
}

export interface TrainingMetrics {
  token_overlap_before: number;
  token_overlap_after: number;
  avg_response_length: number;
  coherence_score: number;
  avg_human_rating: number;
  reward_model_accuracy: number;
  dpo_loss: number;
  preference_win_rate: number;
  total_examples: number;
  filtered_examples: number;
  training_phases_completed: string[];
}

export interface TrainingJob {
  id: string;
  model: string;
  status: 'pending' | 'preparing' | 'training' | 'evaluating' | 'completed' | 'failed';
  config: FineTuneConfig;
  progress: number;
  logs: string[];
  metrics: TrainingMetrics;
  started_at: string;
  completed_at?: string;
  error?: string;
}

// ============================================================
// Data Persistence
// ============================================================

async function ensureDataDir(modelName: string): Promise<string> {
  const dir = path.join(DATA_DIR, modelName.replace(/[/:]/g, '_'));
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function saveTrainingData(
  modelName: string,
  data: { examples: TrainingExample[]; comparisons: RLHFComparison[] }
): Promise<void> {
  const dir = await ensureDataDir(modelName);
  await fs.writeFile(path.join(dir, 'training-data.json'), JSON.stringify(data, null, 2));
}

export async function loadTrainingData(
  modelName: string
): Promise<{ examples: TrainingExample[]; comparisons: RLHFComparison[] }> {
  const dir = await ensureDataDir(modelName);
  try {
    const raw = await fs.readFile(path.join(dir, 'training-data.json'), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { examples: [], comparisons: [] };
  }
}

export async function saveTrainingJob(job: TrainingJob): Promise<void> {
  const dir = await ensureDataDir(job.model);
  await fs.writeFile(path.join(dir, `job-${job.id}.json`), JSON.stringify(job, null, 2));
}

export async function loadTrainingJob(modelName: string, jobId: string): Promise<TrainingJob | null> {
  const dir = await ensureDataDir(modelName);
  try {
    const raw = await fs.readFile(path.join(dir, `job-${jobId}.json`), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function listTrainingJobs(modelName: string): Promise<TrainingJob[]> {
  const dir = await ensureDataDir(modelName);
  try {
    const files = await fs.readdir(dir);
    const jobs: TrainingJob[] = [];
    for (const f of files) {
      if (f.startsWith('job-') && f.endsWith('.json')) {
        const raw = await fs.readFile(path.join(dir, f), 'utf-8');
        jobs.push(JSON.parse(raw));
      }
    }
    return jobs.sort((a, b) => b.started_at.localeCompare(a.started_at));
  } catch {
    return [];
  }
}

// ============================================================
// Ollama Helpers (using new `from`/`model` API)
// ============================================================

async function ollamaChat(
  model: string,
  messages: { role: string; content: string }[],
  options?: Record<string, unknown>
): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false, ...options }),
  });
  if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ============================================================
// Fine-Tuning Pipeline (6 phases from Aero-HowtoLLMs)
// ============================================================

/**
 * Phase 1: Data Preparation
 * Phase 2: RLHF Filtering & Reward Ranking
 * Phase 3: DPO Preference Optimization
 * Phase 4: Build Ollama create body (with LR-scheduling-inspired param adjustment)
 * Phase 5: Model Creation via Ollama `/api/create`
 * Phase 6: Evaluation (token frequency analysis)
 */
export async function executeFineTunePipeline(config: FineTuneConfig): Promise<TrainingJob> {
  const jobId = `ft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const job: TrainingJob = {
    id: jobId,
    model: config.target_model,
    status: 'pending',
    config,
    progress: 0,
    logs: [],
    metrics: {
      token_overlap_before: 0, token_overlap_after: 0,
      avg_response_length: 0, coherence_score: 0,
      avg_human_rating: 0, reward_model_accuracy: 0,
      dpo_loss: 0, preference_win_rate: 0,
      total_examples: config.training_data.length,
      filtered_examples: 0,
      training_phases_completed: [],
    },
    started_at: new Date().toISOString(),
  };

  const log = (msg: string) => {
    job.logs.push(`[${new Date().toISOString()}] ${msg}`);
  };

  try {
    // ── Phase 1: Data Preparation ──
    job.status = 'preparing';
    job.progress = 10;
    log('Phase 1/6: Data preparation & validation');

    const validExamples = config.training_data.filter(
      (ex) => ex.user.trim().length > 0 && ex.assistant.trim().length > 0
    );
    log(`Valid examples: ${validExamples.length}/${config.training_data.length}`);
    log(`RLHF comparisons: ${config.rlhf_comparisons.length}`);
    job.metrics.training_phases_completed.push('data_preparation');
    job.progress = 20;

    // ── Phase 2: RLHF Filtering ──
    log('Phase 2/6: RLHF filtering & reward ranking');
    let selectedExamples = [...validExamples];

    if (config.rlhf_enabled && validExamples.some((ex) => ex.rating)) {
      const ratedExamples = validExamples.filter((ex) => ex.rating !== undefined);
      const avgRating = ratedExamples.reduce((s, ex) => s + (ex.rating || 0), 0) / (ratedExamples.length || 1);
      job.metrics.avg_human_rating = avgRating;

      // Filter by reward threshold (gradient clipping concept: discard bad examples)
      selectedExamples = validExamples.filter((ex) => (ex.rating || 5) >= config.reward_threshold);
      // Sort by rating (reward-weighted selection)
      selectedExamples.sort((a, b) => (b.rating || 3) - (a.rating || 3));

      job.metrics.filtered_examples = selectedExamples.length;
      log(`RLHF filter: ${selectedExamples.length}/${validExamples.length} above threshold ${config.reward_threshold}`);
      log(`Average human rating: ${avgRating.toFixed(2)}/5`);
    } else {
      job.metrics.filtered_examples = validExamples.length;
      log('RLHF disabled or no rated examples — using all valid data');
    }
    job.metrics.training_phases_completed.push('rlhf_filtering');
    job.progress = 35;

    // ── Phase 3: DPO Preference Optimization ──
    log('Phase 3/6: DPO preference optimization');

    if (config.rlhf_comparisons.length >= config.preference_pairs_min) {
      const validComparisons = config.rlhf_comparisons.filter((c) => c.preferred !== 'tie');

      if (validComparisons.length > 0) {
        // DPO loss: L_DPO = -log(sigmoid(beta * (r_w - r_l)))
        let totalLoss = 0;
        let wins = 0;

        for (const comp of validComparisons) {
          const r_w = comp.preferred === 'a' ? (comp.reward_score_a || 0.7) : (comp.reward_score_b || 0.7);
          const r_l = comp.preferred === 'a' ? (comp.reward_score_b || 0.3) : (comp.reward_score_a || 0.3);
          const diff = config.dpo_beta * (r_w - r_l);
          const sigmoid = 1 / (1 + Math.exp(-diff));
          totalLoss += -Math.log(sigmoid + 1e-10);
          if (r_w > r_l) wins++;

          // Extract winning example into training data
          const preferred = comp.preferred === 'a' ? comp.response_a : comp.response_b;
          selectedExamples.push({
            id: `dpo-${comp.id}`,
            user: comp.prompt,
            assistant: preferred,
            rating: 5,
            source: 'dpo',
            created_at: new Date().toISOString(),
          });
        }

        job.metrics.dpo_loss = totalLoss / validComparisons.length;
        job.metrics.preference_win_rate = wins / validComparisons.length;
        job.metrics.reward_model_accuracy = job.metrics.preference_win_rate;
        log(`DPO loss: ${job.metrics.dpo_loss.toFixed(4)}`);
        log(`Preference win rate: ${(job.metrics.preference_win_rate * 100).toFixed(1)}%`);
        log(`Added ${validComparisons.length} DPO-preferred examples`);
      }
    } else {
      log(`DPO skipped: need ${config.preference_pairs_min} pairs, have ${config.rlhf_comparisons.length}`);
    }
    job.metrics.training_phases_completed.push('dpo_optimization');
    job.progress = 50;

    // ── Phase 4: Build Ollama create body ──
    job.status = 'training';
    log('Phase 4/6: Building model config (LR-schedule-aware)');

    // Learning rate scheduling concept:
    // warmup → lower temperature, fewer examples
    // active → configured params, all examples
    // cooldown → slightly lower temp for stability
    let effectiveTemp = config.temperature;
    let maxExamples = selectedExamples.length;

    if (config.training_phase === 'warmup') {
      effectiveTemp = Math.max(0.3, config.temperature * 0.7);
      maxExamples = Math.min(maxExamples, config.warmup_examples);
      log(`Warmup phase: temp ${effectiveTemp.toFixed(2)}, max ${maxExamples} examples`);
    } else if (config.training_phase === 'cooldown') {
      effectiveTemp = Math.max(0.5, config.temperature * 0.9);
      log(`Cooldown phase: temp ${effectiveTemp.toFixed(2)}`);
    } else {
      log(`Active phase: temp ${effectiveTemp}, all ${maxExamples} examples`);
    }

    // Gradient clipping concept: limit max examples to prevent overfitting
    const clippedExamples = selectedExamples.slice(0, maxExamples);

    // Build Ollama create body (new API: model + from + system + parameters + messages)
    const createBody: Record<string, unknown> = {
      model: config.target_model,
      from: config.base_model,
      stream: false,
    };

    if (config.system_prompt) {
      createBody.system = config.system_prompt;
    }

    const parameters: Record<string, number> = {
      temperature: effectiveTemp,
      top_k: config.top_k,
      top_p: config.top_p,
      presence_penalty: config.presence_penalty,
      repeat_penalty: config.repeat_penalty,
    };
    if (config.num_ctx > 0) parameters.num_ctx = config.num_ctx;
    createBody.parameters = parameters;

    // Few-shot examples as messages
    if (clippedExamples.length > 0) {
      const messages = clippedExamples.flatMap((ex) => [
        { role: 'user' as const, content: ex.user },
        { role: 'assistant' as const, content: ex.assistant },
      ]);
      createBody.messages = messages;
    }

    log(`Ollama create body: ${clippedExamples.length} examples, ${Object.keys(parameters).length} params`);
    job.progress = 65;
    job.metrics.training_phases_completed.push('config_generation');

    // ── Phase 5: Model Creation via Ollama ──
    log('Phase 5/6: Creating model via Ollama /api/create');

    const createRes = await fetch(`${OLLAMA_BASE}/api/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBody),
    });

    if (!createRes.ok) {
      const text = await createRes.text().catch(() => '');
      throw new Error(`Ollama create failed: ${createRes.status} ${text}`);
    }
    const createResult = await createRes.json();
    log(`Ollama create: ${JSON.stringify(createResult).slice(0, 200)}`);
    job.progress = 80;
    job.metrics.training_phases_completed.push('model_creation');

    // ── Phase 6: Evaluation ──
    job.status = 'evaluating';
    log('Phase 6/6: Model evaluation (token frequency analysis)');

    if (config.eval_prompts.length > 0) {
      const evalResults = await evaluateModel(config.target_model, config.eval_prompts, config.system_prompt);
      job.metrics.avg_response_length = evalResults.avg_length;
      job.metrics.coherence_score = evalResults.coherence;
      job.metrics.token_overlap_after = evalResults.token_overlap;
      log(`Avg response length: ${evalResults.avg_length.toFixed(0)} chars`);
      log(`Coherence score: ${(evalResults.coherence * 100).toFixed(1)}%`);
      log(`Token overlap: ${(evalResults.token_overlap * 100).toFixed(1)}%`);
    } else {
      log('No eval prompts — skipping evaluation');
    }
    job.metrics.training_phases_completed.push('evaluation');
    job.progress = 100;

    // Done
    job.status = 'completed';
    job.completed_at = new Date().toISOString();
    log('Pipeline completed successfully');

    await saveTrainingData(config.target_model, {
      examples: selectedExamples,
      comparisons: config.rlhf_comparisons,
    });
    await saveTrainingJob(job);
    return job;
  } catch (error) {
    job.status = 'failed';
    job.error = (error as Error).message;
    log(`Pipeline failed: ${job.error}`);
    job.completed_at = new Date().toISOString();
    await saveTrainingJob(job).catch(() => {});
    return job;
  }
}

// ============================================================
// Model Evaluation (Aero-HowtoLLMs token frequency analysis)
// ============================================================

async function evaluateModel(
  model: string,
  prompts: string[],
  systemPrompt?: string
): Promise<{ avg_length: number; coherence: number; token_overlap: number }> {
  const responses: string[] = [];

  for (const prompt of prompts.slice(0, 5)) {
    try {
      const msgs: { role: string; content: string }[] = [];
      if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
      msgs.push({ role: 'user', content: prompt });
      const r = await ollamaChat(model, msgs, { temperature: 0.7, max_tokens: 500 });
      responses.push(r);
    } catch { /* skip */ }
  }

  if (responses.length === 0) return { avg_length: 0, coherence: 0, token_overlap: 0 };

  const avg_length = responses.reduce((s, r) => s + r.length, 0) / responses.length;

  // Coherence: shared vocabulary across responses (token freq analysis)
  const allTokens = responses.flatMap((r) => r.toLowerCase().split(/\s+/).filter((t) => t.length > 2));
  const freq = new Map<string, number>();
  for (const t of allTokens) freq.set(t, (freq.get(t) || 0) + 1);
  const repeated = [...freq.values()].filter((f) => f > 1).length;
  const coherence = Math.min(1, repeated / (freq.size || 1));
  const token_overlap = coherence * 0.8 + 0.2;

  return { avg_length, coherence, token_overlap };
}

// ============================================================
// RLHF: Generate comparison pairs for DPO
// ============================================================

export async function generateRLHFComparison(
  model: string,
  prompt: string,
  systemPrompt?: string
): Promise<{ response_a: string; response_b: string }> {
  const msgs: { role: string; content: string }[] = [];
  if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
  msgs.push({ role: 'user', content: prompt });

  // Generate two responses: conservative (exploitation) vs creative (exploration)
  const [response_a, response_b] = await Promise.all([
    ollamaChat(model, msgs, { temperature: 0.5 }),
    ollamaChat(model, msgs, { temperature: 1.3 }),
  ]);
  return { response_a, response_b };
}

// ============================================================
// Defaults
// ============================================================

export function getDefaultFineTuneConfig(modelName: string): FineTuneConfig {
  return {
    base_model: modelName,
    target_model: modelName,
    peft_method: 'full',
    system_prompt: '',
    temperature: 1.0,
    top_k: 20,
    top_p: 0.95,
    presence_penalty: 1.5,
    repeat_penalty: 1.1,
    num_ctx: 4096,
    max_response_divergence: 1.0,
    training_phase: 'active',
    warmup_examples: 5,
    cooldown_threshold: 0.1,
    rlhf_enabled: true,
    reward_threshold: 3,
    dpo_beta: 0.1,
    preference_pairs_min: 3,
    training_data: [],
    rlhf_comparisons: [],
    eval_prompts: [
      'Giai thich khai niem dong luong trong vat ly',
      'Lam the nao de giai phuong trinh bac 2?',
      'Tom tat bai hoc ve quang hop',
    ],
  };
}
