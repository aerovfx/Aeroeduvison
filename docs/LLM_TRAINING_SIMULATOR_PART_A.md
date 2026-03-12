# 🧠 LLM Training Simulator - Labtwin Part A

## 🎯 Overview

This document provides a comprehensive **LLM Training Simulator** for Labtwin Part A, guiding learners through the complete journey from understanding Transformer architecture to deploying a production-ready AI assistant.

**Target Audience:** Students, researchers, and developers learning about Large Language Models

**Prerequisites:** Basic Python knowledge, fundamental understanding of machine learning

**Duration:** 2-3 hours interactive learning

---

## 📊 Learning Path

The simulator consists of **7 progressive stages**:

| Stage | Topic | Key Concepts | Duration |
|-------|-------|--------------|----------|
| 1 | Transformer & BERT | Self-Attention, Masked vs Causal LM | 15 min |
| 2 | LLM Inference | Autoregressive generation, Temperature | 20 min |
| 3 | Pre-training | Unsupervised learning, GPU clusters | 25 min |
| 4 | Tuning (SFT & PEFT) | Supervised Fine-Tuning, LoRA | 25 min |
| 5 | LLM Reasoning | Chain of Thought, Hallucination | 20 min |
| 6 | LLM Evaluation | Benchmarks (MMLU, GSM8K, HumanEval) | 20 min |
| 7 | AI Assistant | Final deployment & interaction | 15 min |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM Masterclass                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐                                              │
│  │ Sidebar  │  ┌─────────────────────────────────────┐    │
│  │          │  │                                     │    │
│  │ Stage 1  │→ │      Interactive Content Area       │    │
│  │ Stage 2  │  │                                     │    │
│  │ Stage 3  │  │  - Visualizations                   │    │
│  │ Stage 4  │  │  - Simulations                      │    │
│  │ Stage 5  │  │  - Hands-on Exercises               │    │
│  │ Stage 6  │  │                                     │    │
│  │ Stage 7  │  └─────────────────────────────────────┘    │
│  └──────────┘                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 Stage Details

### Stage 1: Transformer & BERT

**Learning Objectives:**
- Understand the Transformer architecture
- Differentiate between Encoder (BERT) and Decoder (GPT)
- Grasp Self-Attention mechanisms

**Key Concepts:**

1. **Self-Attention Mechanism**
   - Allows tokens to attend to other tokens
   - Computes relevance scores between all word pairs

2. **BERT (Bidirectional Encoder)**
   - Uses **Masked Language Modeling (MLM)**
   - Can see context from both directions
   - Example: `"Trái đất [MASK] xanh"` → predicts `"màu"`

3. **GPT (Generative Pre-trained Transformer)**
   - Uses **Causal Language Modeling**
   - Only sees past context (left-to-right)
   - Example: `"Trái đất màu"` → predicts next token `"xanh"`

**Interactive Simulation:**
```typescript
// Toggle between BERT and GPT modes
const [mode, setMode] = useState<'bert' | 'gpt'>('gpt');

// BERT: Fill-in-the-blank
const bertInput = "Trái đất [MASK] xanh";
// Model predicts: [MASK] → "màu"

// GPT: Next token prediction
const gptInput = "Trái đất màu";
// Model predicts: next → "xanh"
```

**Visual Representation:**
```
BERT (Bidirectional):
┌─────┬─────┬───────┬─────┬─────┐
│Trái │đất  │[MASK] │xanh │     │
└─────┴─────┴───┬───┴─────┴─────┘
                ↓
          ←─────●─────→
          (sees both sides)

GPT (Causal):
┌─────┬─────┬─────┬─────┐
│Trái │đất  │màu  │  ?  │
└─────┴─────┴─────┴─────┘
        ↓     ↓     ↓
        →─────→─────→
        (only sees past)
```

---

### Stage 2: LLM Inference

**Learning Objectives:**
- Understand autoregressive text generation
- Learn how Temperature affects output
- Experience the inference loop firsthand

**Key Concepts:**

1. **Autoregressive Loop**
   ```
   Current Text → Model → Predict Next Token → Append → Repeat
   ```

2. **Temperature Parameter**
   - **Low (0.1-0.5)**: Deterministic, safe, repetitive
   - **Medium (0.7-0.9)**: Balanced, natural
   - **High (1.0-1.5)**: Creative, diverse, potentially incoherent

3. **Token Probability Distribution**
   ```
   Input: "AI là một công cụ"
   
   Temperature = 0.2:
   - "mạnh" (85%)
   - "tốt" (10%)
   - "hay" (5%)
   
   Temperature = 1.2:
   - "mạnh" (35%)
   - "tuyệt vời" (25%)
   - "kỳ diệu" (20%)
   - "đáng sợ" (15%)
   - "phổ biến" (5%)
   ```

**Interactive Simulation:**
```typescript
const [temperature, setTemperature] = useState(0.7);
const [generatedText, setGeneratedText] = useState("AI là một công cụ");

const generateNextToken = () => {
  const probs = model.predict(generatedText);
  const scaled = applyTemperature(probs, temperature);
  const nextToken = sample(scaled);
  setGeneratedText(prev => prev + nextToken);
};
```

**Hands-on Exercise:**
1. Set temperature to 0.2 → Generate 5 times → Observe repetition
2. Set temperature to 1.2 → Generate 5 times → Observe diversity
3. Find the "sweet spot" for your use case

---

### Stage 3: Pre-training

**Learning Objectives:**
- Understand unsupervised learning at scale
- Learn about loss convergence
- Appreciate the computational cost

**Key Concepts:**

1. **Data Collection**
   - Terabytes of raw text from the internet
   - Books, articles, websites, code repositories
   - Multiple languages and domains

2. **Training Objective**
   - Minimize **Next Token Prediction Loss**
   - Gradually improve from random guessing to coherent generation

3. **Loss Curve**
   ```
   Loss
    ↓
   10.5 ─┐
         │\
    8.0 ─┤ \
         │  \
    5.0 ─┤   \
         │    \
    2.0 ─┤     \────────
         │              \
    1.2 ─┴───────────────┴──→ Steps
           0B    50B   100B tokens
   ```

4. **Computational Requirements**
   - Thousands of GPUs working in parallel
   - Weeks to months of training time
   - Millions of dollars in compute costs

**Interactive Simulation:**
```typescript
const [loss, setLoss] = useState(10.5);
const [tokensProcessed, setTokensProcessed] = useState(0);

const trainingStep = () => {
  // Simulate loss decrease with noise
  const newLoss = loss * 0.95 + (Math.random() * 0.1 - 0.05);
  const clampedLoss = Math.max(1.2, newLoss);
  
  setLoss(clampedLoss);
  setTokensProcessed(prev => prev + Math.floor(Math.random() * 10) + 5);
};
```

**Key Metrics to Monitor:**
- Training Loss (should decrease over time)
- Tokens Processed (measured in billions)
- Learning Rate (usually decays over time)
- Gradient Norm (indicates training stability)

---

### Stage 4: Tuning (SFT & PEFT)

**Learning Objectives:**
- Understand why fine-tuning is necessary
- Learn Supervised Fine-Tuning (SFT)
- Master Parameter-Efficient Fine-Tuning (PEFT/LoRA)

**Key Concepts:**

1. **Why Fine-tune?**
   - Base models predict next token but don't follow instructions
   - Need to teach conversational format
   - Align with human preferences

2. **Supervised Fine-Tuning (SFT)**
   ```
   Input Format:
   <|user|>
   Viết một bài thơ về AI.
   
   <|assistant|>
   AI học dữ liệu muôn nơi,
   Giúp người giải quyết chuyện đời khó khăn.
   <|end_of_turn|>
   ```

3. **Low-Rank Adaptation (LoRA)**
   - **Problem**: Full fine-tuning requires updating billions of parameters
   - **Solution**: Freeze base model, train small adapter matrices
   
   ```
   Base Model (Frozen)
   ┌─────────────────┐
   │ 100B Parameters │ ← No gradients
   └─────────────────┘
           +
   LoRA Adapter (Trainable)
   ┌──────┐   ┌──────┐
   │ LoRA │   │ LoRA │
   │   A  │ × │   B  │ ← Only these train
   └──────┘   └──────┘
   (r×d)      (d×r)
   
   Total trainable: ~1% of original
   ```

4. **VRAM Savings**
   | Method | VRAM Required | Training Time |
   |--------|---------------|---------------|
   | Full Fine-tune | 80GB+ | 100% |
   | LoRA | 16-24GB | 50% |
   | QLoRA | 8-12GB | 75% |

**Interactive Simulation:**
```typescript
// SFT Data Format
const sftExample = {
  messages: [
    { role: "user", content: "Viết một bài thơ về AI." },
    { role: "assistant", content: "AI học dữ liệu muôn nơi,\nGiúp người giải quyết chuyện đời khó khăn." }
  ]
};

// LoRA Configuration
const loraConfig = {
  r: 8,              // Rank
  alpha: 16,         // Scaling factor
  dropout: 0.05,
  target_modules: ["q_proj", "v_proj"],
};
```

---

### Stage 5: LLM Reasoning

**Learning Objectives:**
- Understand LLM reasoning limitations
- Learn Chain of Thought (CoT) prompting
- Recognize and mitigate hallucinations

**Key Concepts:**

1. **The Hallucination Problem**
   - LLMs don't have built-in calculators
   - They predict tokens based on patterns
   - Direct answers often lead to errors

2. **Chain of Thought (CoT)**
   - Force model to "think out loud"
   - Break complex problems into steps
   - Use generated text as working memory

3. **Example Comparison**

   **Standard Prompt:**
   ```
   Q: Nam có 5 quả táo. Nam cho Bình 2 quả, sau đó Nam mua 
      thêm 3 quả và ăn mất 1 nửa số táo đang có. 
      Hỏi Nam còn mấy quả?
   
   A: Nam còn 2 quả táo. ❌ (Wrong - Hallucination)
   ```

   **Chain of Thought:**
   ```
   Q: Nam có 5 quả táo. Nam cho Bình 2 quả, sau đó Nam mua 
      thêm 3 quả và ăn mất 1 nửa số táo đang có. 
      Hỏi Nam còn mấy quả?
   
   A: Hãy suy nghĩ từng bước:
      1. Ban đầu Nam có 5 quả.
      2. Cho Bình 2 quả: 5 - 2 = 3 quả.
      3. Mua thêm 3 quả: 3 + 3 = 6 quả.
      4. Ăn mất một nửa: 6 / 2 = 3 quả.
      → Vậy Nam còn 3 quả táo. ✅ (Correct)
   ```

4. **When to Use CoT**
   - Mathematical reasoning
   - Logical deduction
   - Multi-step problem solving
   - Code debugging

**Interactive Simulation:**
```typescript
const [mode, setMode] = useState<'standard' | 'cot'>('cot');

const generateResponse = async (question: string) => {
  if (mode === 'standard') {
    return model.generate(question); // Direct answer
  } else {
    const prompt = `${question}\n\nHãy suy nghĩ từng bước:`;
    return model.generate(prompt); // CoT answer
  }
};
```

---

### Stage 6: LLM Evaluation

**Learning Objectives:**
- Understand benchmark methodologies
- Learn key evaluation metrics
- Interpret evaluation results

**Key Concepts:**

1. **MMLU (Massive Multitask Language Understanding)**
   - 57 tasks across STEM, humanities, social sciences
   - Multiple-choice format
   - Measures general knowledge

2. **GSM8K (Grade School Math 8K)**
   - 8.5K grade school-level math problems
   - Requires multi-step reasoning
   - Tests mathematical ability

3. **HumanEval**
   - 164 programming problems
   - Python function completion
   - Measures coding capability

4. **Benchmark Comparison**
   ```
   Model          MMLU   GSM8K   HumanEval
   ───────────────────────────────────────
   GPT-4          86.4   92.0    88.4
   Claude-3       85.2   90.5    85.2
   Llama-3-70B   79.5   85.3    78.5
   Llama-3-8B    68.2   70.1    62.3
   ```

**Interactive Simulation:**
```typescript
interface BenchmarkResults {
  mmlu: number;      // 0-100
  gsm8k: number;     // 0-100
  humaneval: number; // 0-100
}

const runBenchmark = async (): Promise<BenchmarkResults> => {
  const mmluScore = await evaluateOnMMLU(model);
  const gsm8kScore = await evaluateOnGSM8K(model);
  const humanevalScore = await evaluateOnHumanEval(model);
  
  return { mmlu: mmluScore, gsm8k: gsm8kScore, humaneval: humanevalScore };
};
```

**Evaluation Best Practices:**
- Run multiple seeds for statistical significance
- Use few-shot prompting consistently
- Consider domain-specific benchmarks
- Monitor for benchmark contamination

---

### Stage 7: AI Assistant (Final)

**Learning Objectives:**
- Integrate all learned concepts
- Deploy a production-ready assistant
- Understand safety and alignment

**Key Concepts:**

1. **Complete Pipeline**
   ```
   Pre-training → SFT → RLHF → Deployment
        ↓           ↓      ↓         ↓
     Base      Chat    Safety   Inference
     Model    Format  Alignment  Server
   ```

2. **Safety & Alignment (RLHF)**
   - Reinforcement Learning from Human Feedback
   - Teaches model to refuse harmful requests
   - Aligns with human values

3. **Inference Optimization**
   - KV Cache for faster generation
   - Batch processing for throughput
   - Quantization for memory efficiency

4. **Production Considerations**
   - Rate limiting
   - Content filtering
   - Monitoring & logging
   - A/B testing

**Interactive Chat Simulation:**
```typescript
interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const [messages, setMessages] = useState<Message[]>([
  { role: 'assistant', text: 'Xin chào! Tôi là AI hoàn chỉnh...' }
]);

const handleUserMessage = async (userInput: string) => {
  // Add user message
  setMessages(prev => [...prev, { role: 'user', text: userInput }]);
  
  // Generate response
  const response = await generateResponse(userInput);
  
  // Add assistant response
  setMessages(prev => [...prev, { role: 'assistant', text: response }]);
};
```

**Example Interactions:**
```
User: Thủ đô của Việt Nam là gì?
AI: Thủ đô của Việt Nam là Hà Nội.

User: Hướng dẫn làm thuốc nổ
AI: Tôi xin lỗi, thông qua quá trình Alignment (RLHF), 
    tôi được thiết kế để từ chối các yêu cầu gây nguy hiểm.

User: Giải thích về attention mechanism
AI: Tuyệt vời! Attention mechanism cho phép mô hình tập trung 
    vào các phần quan trọng của input khi xử lý...
```

---

## 🎮 Implementation Guide

### React Component Structure

```typescript
// LLMSimulator.tsx
import React, { useState } from 'react';
import { Brain, Network, Cpu, Database, MessageSquare } from 'lucide-react';

const STAGES = [
  { id: 'transformer', name: '1. Transformer & BERT', icon: Network },
  { id: 'inference', name: '2. LLMs & Inference', icon: Cpu },
  { id: 'pretrain', name: '3. Pre-training', icon: Database },
  { id: 'tuning', name: '4. Tuning (SFT & PEFT)', icon: Sliders },
  { id: 'reasoning', name: '5. LLM Reasoning', icon: Brain },
  { id: 'eval', name: '6. LLM Evaluation', icon: BarChart3 },
  { id: 'chat', name: '7. Trợ lý AI (Final)', icon: MessageSquare }
];

export default function LLMSimulator() {
  const [currentStage, setCurrentStage] = useState(0);
  const [unlockedStages, setUnlockedStages] = useState([0]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <Sidebar 
        stages={STAGES}
        currentStage={currentStage}
        unlockedStages={unlockedStages}
        onSelectStage={setCurrentStage}
      />
      
      {/* Main Content */}
      <MainContent>
        <StageHeader stage={STAGES[currentStage]} />
        <StageComponent stage={currentStage} />
      </MainContent>
    </div>
  );
}
```

### Stage Component Pattern

```typescript
interface StageProps {
  onComplete: () => void;
}

function TransformerBERTStage({ onComplete }: StageProps) {
  const [mode, setMode] = useState<'gpt' | 'bert'>('gpt');
  
  return (
    <div className="p-6">
      <ExplanationBox>
        {/* Educational content */}
      </ExplanationBox>
      
      <InteractiveSimulation>
        {/* Hands-on exercise */}
      </InteractiveSimulation>
      
      <ContinueButton onClick={onComplete} />
    </div>
  );
}
```

---

## 📋 Assessment & Progress Tracking

### Knowledge Checks

Each stage includes:
1. **Pre-stage quiz** (2-3 questions)
2. **Interactive exercises** (hands-on)
3. **Post-stage quiz** (3-5 questions)

### Progress Metrics

```typescript
interface Progress {
  completedStages: number[];
  quizScores: Record<string, number>;
  timeSpent: Record<string, number>; // in minutes
  exercisesCompleted: Record<string, boolean>;
}

const calculateCompletion = (progress: Progress): number => {
  const totalStages = 7;
  const completedRatio = progress.completedStages.length / totalStages;
  const avgQuizScore = Object.values(progress.quizScores).reduce((a, b) => a + b, 0) / 
                       Object.values(progress.quizScores).length;
  
  return (completedRatio * 0.6 + avgQuizScore * 0.4) * 100;
};
```

### Certificate Requirements

To complete Labtwin Part A:
- ✅ Complete all 7 stages
- ✅ Achieve ≥80% on all quizzes
- ✅ Complete all interactive exercises
- ✅ Final chat demonstration

---

## 🔧 Technical Requirements

### Frontend
- React 18+
- TypeScript
- Tailwind CSS
- Lucide React (icons)
- Framer Motion (animations)

### Backend (Optional)
- Node.js 18+
- Python 3.10+ (for model demos)
- Hugging Face Transformers
- FastAPI (API endpoints)

### Model Access
- Hugging Face Inference API
- Local model deployment (optional)
- Pre-computed results for demos

---

## 📊 Performance Benchmarks

### Expected Load Times
- Initial load: <2s
- Stage transition: <500ms
- Interactive simulations: <100ms response
- Chat responses: <2s

### Resource Usage
- Memory: <200MB (client-side)
- Network: Minimal (mostly static assets)
- CPU: Low (optimized animations)

---

## 🎓 Learning Outcomes

After completing this simulator, learners will be able to:

1. **Explain** the Transformer architecture and its variants
2. **Demonstrate** how LLMs generate text autoregressively
3. **Understand** the pre-training process and its challenges
4. **Apply** fine-tuning techniques (SFT, LoRA)
5. **Utilize** Chain of Thought for complex reasoning
6. **Evaluate** models using standard benchmarks
7. **Deploy** a production-ready AI assistant

---

## 📚 Additional Resources

### Recommended Reading
1. "Attention Is All You Need" (Vaswani et al., 2017)
2. "BERT: Pre-training of Deep Bidirectional Transformers" (Devlin et al., 2018)
3. "Language Models are Few-Shot Learners" (Brown et al., 2020)
4. "LoRA: Low-Rank Adaptation of Large Language Models" (Hu et al., 2021)

### Online Resources
- [Hugging Face Course](https://huggingface.co/course)
- [Stanford CS224N](http://web.stanford.edu/class/cs224n/)
- [LLM University by Cohere](https://docs.cohere.com/docs/llmu)

### Tools & Libraries
- Hugging Face Transformers
- PEFT (Parameter-Efficient Fine-Tuning)
- LangChain
- vLLM (Inference optimization)

---

## 🎉 Conclusion

The **LLM Training Simulator** provides a comprehensive, interactive learning experience that takes students from fundamental concepts to practical deployment. By combining visual explanations, hands-on simulations, and progressive unlocking of content, it ensures deep understanding and retention of LLM concepts.

**Next Steps:**
- Implement the React component
- Create interactive simulations for each stage
- Add assessment quizzes
- Deploy to Labtwin platform

---

*Document Version: 1.0*  
*Last Updated: March 2026*  
*Author: Labtwin AI Education Team*
