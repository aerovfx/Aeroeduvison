'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Network, Database, UserCheck, MessageSquare, Cpu, Play, CheckCircle, 
  ArrowRight, ChevronRight, Send, Lock, FileText, Tag, Sliders, Brain, BarChart3, ShieldCheck,
  Activity, TrendingUp, Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

const STAGES = [
  { id: 'transformer', name: '1. Transformer & BERT', icon: Network, desc: 'Hiểu về cơ chế Self-Attention, sự khác biệt giữa BERT (Masked LM) và GPT (Causal LM).' },
  { id: 'inference', name: '2. LLMs & Inference', icon: Cpu, desc: 'Quá trình Suy luận: Cách LLM sinh văn bản từng từ một và vai trò của Temperature.' },
  { id: 'pretrain', name: '3. Pre-training', icon: Database, desc: 'Học Không Giám Sát: Huấn luyện Base Model trên cụm GPU khổng lồ.' },
  { id: 'tuning', name: '4. Tuning (SFT & PEFT)', icon: Sliders, desc: 'Tinh chỉnh mô hình với Dữ liệu có dán nhãn (SFT) và tối ưu hóa phần cứng với LoRA (PEFT).' },
  { id: 'reasoning', name: '5. LLM Reasoning', icon: Brain, desc: 'Kích hoạt khả năng tư duy logic của AI thông qua Chain of Thought (Suy nghĩ từng bước).' },
  { id: 'eval', name: '6. LLM Evaluation', icon: BarChart3, desc: 'Đánh giá năng lực của LLM qua các bộ Benchmark tiêu chuẩn (MMLU, HumanEval).' },
  { id: 'chat', name: '7. Trợ lý AI (Final)', icon: MessageSquare, desc: 'Tương tác với mô hình hoàn chỉnh sau tất cả các bước.' }
];

export default function LLMTrainingSimulator() {
  const [currentStage, setCurrentStage] = useState(0);
  const [unlockedStages, setUnlockedStages] = useState([0]);
  const [completedStages, setCompletedStages] = useState<number[]>([]);

  const unlockNext = () => {
    if (currentStage < STAGES.length - 1) {
      if (!completedStages.includes(currentStage)) {
        setCompletedStages(prev => [...prev, currentStage]);
      }
      setUnlockedStages(prev => Array.from(new Set([...prev, currentStage + 1])));
      setCurrentStage(currentStage + 1);
    }
  };

  const progress = ((completedStages.length + (unlockedStages.length > completedStages.length ? 0.5 : 0)) / STAGES.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col md:flex-row font-sans text-slate-800">
      {/* Sidebar */}
      <div className="w-full md:w-80 bg-white border-r border-slate-200 shadow-lg flex flex-col z-10 shrink-0">
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-800 to-indigo-900 text-white">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-300" />
            LLM Masterclass
          </h1>
          <p className="text-xs mt-2 text-blue-100 opacity-90 leading-relaxed">
            Từ Kiến trúc Transformer đến Kỹ thuật Suy luận (Inference), PEFT & Đánh giá (Evaluation).
          </p>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span>Tiến độ</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-blue-900/30" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {STAGES.map((stage, index) => {
            const isUnlocked = unlockedStages.includes(index);
            const isActive = currentStage === index;
            const isCompleted = completedStages.includes(index);
            const Icon = stage.icon;
            return (
              <button
                key={stage.id}
                onClick={() => isUnlocked && setCurrentStage(index)}
                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-50 border-2 border-blue-300 text-blue-700 shadow-md' 
                    : isUnlocked 
                      ? 'hover:bg-slate-100 text-slate-700 border border-transparent hover:shadow-sm' 
                      : 'opacity-50 cursor-not-allowed text-slate-400 grayscale border border-transparent'
                }`}
              >
                <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>
                  {isUnlocked ? (isCompleted ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Icon className="w-4 h-4" />) : <Lock className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm leading-tight">{stage.name}</div>
                  {isCompleted && <div className="text-xs text-green-600">✓ Hoàn thành</div>}
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-blue-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            {/* Stage Header */}
            <div className="mb-6 bg-white p-6 rounded-2xl shadow-md border border-slate-200 flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 rounded-xl mt-1 shadow-inner">
                {React.createElement(STAGES[currentStage].icon, { className: "w-7 h-7" })}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">{STAGES[currentStage].name}</h2>
                <p className="text-slate-600 text-sm md:text-base leading-relaxed">{STAGES[currentStage].desc}</p>
              </div>
            </div>

            {/* Stage Content */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
              {currentStage === 0 && <TransformerBERTStage onComplete={unlockNext} />}
              {currentStage === 1 && <InferenceStage onComplete={unlockNext} />}
              {currentStage === 2 && <PretrainingStage onComplete={unlockNext} />}
              {currentStage === 3 && <TuningStage onComplete={unlockNext} />}
              {currentStage === 4 && <ReasoningStage onComplete={unlockNext} />}
              {currentStage === 5 && <EvaluationStage onComplete={unlockNext} />}
              {currentStage === 6 && <ChatStage />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   STAGE 1: TRANSFORMER & BERT
   ========================================= */
function TransformerBERTStage({ onComplete }: { onComplete: () => void }) {
  const [mode, setMode] = useState<'gpt' | 'bert'>('gpt');
  const inputText = mode === 'gpt' ? "Trái đất màu" : "Trái đất [MASK] xanh";
  const tokens = inputText.split(/\s+/);
  
  return (
    <div className="p-6 flex flex-col h-full bg-slate-50/50">
      <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl mb-6 text-sm flex gap-3 border border-indigo-100">
        <Network className="w-5 h-5 flex-shrink-0 mt-0.5 text-indigo-600" />
        <div>
          <strong>Transformer Tricks:</strong> Kiến trúc Transformer có thể được dùng theo 2 cách chính. 
          <strong> BERT (Encoder)</strong> có thể nhìn thấy cả từ phía trước và phía sau để "điền vào chỗ trống". 
          <strong> GPT (Decoder)</strong> bị "che" (Masked Attention) chỉ được nhìn từ quá khứ để "dự đoán từ tương lai". LLM hiện đại đa số dùng GPT.
        </div>
      </div>

      <div className="flex gap-4 mb-6 justify-center">
        <button 
          onClick={() => setMode('gpt')}
          className={`px-6 py-3 rounded-lg font-bold transition-all ${mode === 'gpt' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
        >
          Mô hình GPT (Causal LM)
        </button>
        <button 
          onClick={() => setMode('bert')}
          className={`px-6 py-3 rounded-lg font-bold transition-all ${mode === 'bert' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
        >
          Mô hình BERT (Masked LM)
        </button>
      </div>

      <div className="flex-1 border border-slate-200 rounded-xl bg-white p-8 flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
        <h3 className="font-bold text-slate-700 mb-6 text-xl">
          {mode === 'gpt' ? 'Dự đoán từ tiếp theo (Autoregressive)' : 'Điền vào chỗ trống (Bidirectional)'}
        </h3>
        
        <div className="flex gap-4 items-center mb-8 flex-wrap justify-center">
          {tokens.map((t, i) => (
             <div key={i} className={`px-5 py-3 rounded-xl font-bold text-lg border-2 ${t === '[MASK]' ? 'bg-purple-100 border-purple-400 text-purple-700 border-dashed' : 'bg-slate-100 border-slate-300 text-slate-700'}`}>
               {t}
             </div>
          ))}
          {mode === 'gpt' && (
            <div className="px-5 py-3 rounded-xl font-bold text-lg border-2 border-dashed border-blue-400 bg-blue-50 text-blue-600 animate-pulse">
               ? (xanh)
            </div>
          )}
        </div>

        <div className="max-w-lg text-center text-slate-600 bg-slate-50 p-6 rounded-xl border border-slate-200">
          {mode === 'gpt' ? (
            <p><strong>Causal Attention:</strong> Chữ "màu" chỉ được phép nhìn thấy "Trái" và "đất". Nó không được nhìn thấy từ tương lai. Nhiệm vụ của nó là dự đoán từ tiếp theo (sinh ra chữ "xanh").</p>
          ) : (
            <p><strong>Bidirectional Attention:</strong> Token `[MASK]` được phép nhìn thấy cả "Trái đất" ở phía trước và "xanh" ở phía sau. Nhờ vậy nó dễ dàng đoán ra từ bị che là "màu". Rất tốt để hiểu ngữ nghĩa, nhưng không thể sinh văn bản dài liên tục.</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={onComplete} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-transform hover:scale-105">
          Khám phá quá trình Suy luận <ArrowRight className="w-5 h-5"/>
        </Button>
      </div>
    </div>
  );
}

/* =========================================
   STAGE 2: INFERENCE (Suy luận & Temperature)
   ========================================= */
function InferenceStage({ onComplete }: { onComplete: () => void }) {
  const [temperature, setTemperature] = useState(0.7);
  const [generatedText, setGeneratedText] = useState("AI là một công cụ");
  const [isGenerating, setIsGenerating] = useState(false);

  const wordsHighTemp = [" tuyệt vời,", " đáng sợ,", " kỳ diệu,", " mang tính", " giúp ích"];
  const wordsLowTemp = [" rất", " mạnh", " phổ", " hữu", " quan"];

  const handleGenerate = () => {
    setIsGenerating(true);
    let currentText = "AI là một công cụ";
    setGeneratedText(currentText);
    
    let steps = 0;
    const interval = setInterval(() => {
      steps++;
      const wordList = temperature > 0.5 ? wordsHighTemp : wordsLowTemp;
      const nextWord = wordList[Math.floor(Math.random() * wordList.length)];
      currentText += nextWord;
      setGeneratedText(currentText);
      
      if (steps > 5) {
        clearInterval(interval);
        setIsGenerating(false);
      }
    }, 400);
  };

  return (
    <div className="p-6 flex flex-col h-full bg-slate-50/50">
      <div className="bg-cyan-50 text-cyan-900 p-4 rounded-xl mb-6 text-sm flex gap-3 border border-cyan-200">
        <Cpu className="w-5 h-5 flex-shrink-0 mt-0.5 text-cyan-600" />
        <div>
          <strong>LLM Inference (Quá trình Suy luận):</strong> Khi sử dụng ChatGPT, AI sinh ra văn bản bằng cách liên tục lặp lại vòng lặp: <br/>
          <code>Văn bản hiện tại -&gt; Mô hình -&gt; Đoán từ tiếp theo -&gt; Thêm từ đó vào văn bản -&gt; Lặp lại.</code><br/>
          Chỉ số <strong>Temperature (Nhiệt độ)</strong> kiểm soát sự sáng tạo. Temp thấp = An toàn/Lặp lại. Temp cao = Sáng tạo/Bay bổng.
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6">
        {/* Controls */}
        <div className="w-full md:w-1/3 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-center shadow-sm">
          <label className="font-bold text-slate-700 mb-2 flex justify-between">
            <span>Temperature</span>
            <span className="text-cyan-600">{temperature.toFixed(1)}</span>
          </label>
          <input 
            type="range" 
            min="0.0" max="1.5" step="0.1" 
            value={temperature} 
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-cyan-600 mb-6"
            disabled={isGenerating}
          />
          <div className="flex justify-between text-xs text-slate-500 mb-6 font-medium">
            <span>0.0 (Chính xác)</span>
            <span>1.5 (Bay bổng)</span>
          </div>
          
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-cyan-600 hover:bg-cyan-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md"
          >
            {isGenerating ? <Cpu className="w-5 h-5 animate-spin"/> : <Play className="w-5 h-5"/>} 
            Sinh văn bản
          </Button>
        </div>

        {/* Output */}
        <div className="w-full md:w-2/3 bg-slate-900 rounded-xl p-6 font-mono text-cyan-400 text-lg shadow-inner relative overflow-hidden flex items-start leading-relaxed">
           {generatedText}
           {isGenerating && <span className="w-3 h-6 bg-cyan-400 ml-1 animate-pulse"></span>}
           
           {!isGenerating && generatedText.length > 20 && (
             <div className="absolute bottom-4 right-4 bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-md border border-slate-700 opacity-80">
               Autoregressive Loop Finished
             </div>
           )}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={onComplete} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-transform hover:scale-105">
          Sang bước Pre-training <ArrowRight className="w-5 h-5"/>
        </Button>
      </div>
    </div>
  );
}

/* =========================================
   STAGE 3: PRE-TRAINING
   ========================================= */
function PretrainingStage({ onComplete }: { onComplete: () => void }) {
  const [loss, setLoss] = useState(10.5);
  const [tokensProcessed, setTokensProcessed] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const lossHistory = useRef([10.5]);

  const startPretrain = () => {
    setIsTraining(true);
    let currentLoss = 10.5;
    let tokens = 0;
    
    const interval = setInterval(() => {
      currentLoss = currentLoss * 0.95 + (Math.random() * 0.1 - 0.05);
      if (currentLoss < 1.2) currentLoss = 1.2 + (Math.random() * 0.05);
      tokens += Math.floor(Math.random() * 10) + 5;
      
      setLoss(currentLoss);
      setTokensProcessed(tokens);
      lossHistory.current.push(currentLoss);
      
      if (tokens >= 100) {
        clearInterval(interval);
        setIsTraining(false);
      }
    }, 200);
  };

  return (
    <div className="p-6 flex flex-col h-full bg-slate-50/50">
      <div className="bg-blue-50 text-blue-800 p-4 rounded-xl mb-6 text-sm flex gap-3 border border-blue-100">
        <Database className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
        <div>
          <strong>Pre-training (Học Tự Giám Sát):</strong> Giai đoạn cốt lõi và tốn kém nhất. Thu thập hàng Terabyte văn bản thô từ Internet. Mô hình học cách nén toàn bộ tri thức nhân loại vào các tham số (Weights) bằng cách liên tục đoán từ tiếp theo.
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center border border-slate-200 rounded-xl bg-white p-6 shadow-sm">
        
        <div className="grid grid-cols-2 gap-6 w-full max-w-md mb-8">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center shadow-sm">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1"><Activity className="w-3 h-3"/> Training Loss</div>
            <div className={`text-4xl font-mono font-bold ${loss < 2 ? 'text-green-600' : 'text-blue-600'}`}>{loss.toFixed(3)}</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center shadow-sm">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1"><Database className="w-3 h-3"/> Tokens Processed</div>
            <div className="text-4xl font-mono font-bold text-slate-700">{tokensProcessed}B</div>
          </div>
        </div>

        <div className="w-full max-w-md h-24 border-b-2 border-l-2 border-slate-300 relative flex items-end mb-8 p-1 gap-[2px]">
          {lossHistory.current.map((l, i) => (
             <div key={i} className="bg-blue-500 w-full rounded-t-sm opacity-80" style={{ height: `${(l / 11) * 100}%` }}></div>
          ))}
          {lossHistory.current.length <= 1 && <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">Biểu đồ Loss</div>}
        </div>

        {!isTraining && tokensProcessed === 0 && (
          <Button onClick={startPretrain} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:scale-105 transition-transform">
            <Play className="w-5 h-5"/> Khởi chạy Cụm 10,000 GPU
          </Button>
        )}

        {isTraining && (
          <div className="flex flex-col items-center text-blue-600 animate-pulse">
            <Cpu className="w-8 h-8 mb-2 animate-spin-slow" />
            <span className="font-medium">Đang lan truyền ngược (Backpropagation)...</span>
          </div>
        )}

        {!isTraining && tokensProcessed >= 100 && (
          <div className="text-center animate-in zoom-in-95">
            <div className="inline-flex items-center gap-2 text-green-600 font-bold mb-4 bg-green-50 px-4 py-2 rounded-full border border-green-200">
              <CheckCircle className="w-5 h-5"/> Thu được "Base Model"
            </div>
            <Button onClick={onComplete} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold mx-auto transition-transform hover:scale-105">
              Sang bước Tuning <ArrowRight className="w-5 h-5"/>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================
   STAGE 4: TUNING (SFT & PEFT/LoRA)
   ========================================= */
function TuningStage({ onComplete }: { onComplete: () => void }) {
  const [tab, setTab] = useState<'sft' | 'peft'>('sft');
  
  return (
    <div className="p-6 flex flex-col h-full bg-slate-50/50">
      <div className="bg-purple-50 text-purple-900 p-4 rounded-xl mb-6 text-sm flex gap-3 border border-purple-200">
        <Sliders className="w-5 h-5 flex-shrink-0 mt-0.5 text-purple-600" />
        <div>
          <strong>LLM Tuning:</strong> Base Model chỉ biết nối đuôi chữ, chưa biết làm Trợ lý. Ta cần <strong>SFT</strong> (Tạo dữ liệu hỏi đáp chuẩn) và tối ưu chi phí huấn luyện bằng kỹ thuật <strong>PEFT / LoRA</strong>.
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('sft')} className={`px-5 py-2.5 rounded-lg font-bold transition-all ${tab === 'sft' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>1. SFT (Chat Format)</button>
        <button onClick={() => setTab('peft')} className={`px-5 py-2.5 rounded-lg font-bold transition-all ${tab === 'peft' ? 'bg-pink-600 text-white shadow-md' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>2. PEFT (LoRA Trick)</button>
      </div>

      <div className="flex-1 border border-slate-200 rounded-xl bg-white p-6 shadow-sm flex flex-col items-center justify-center">
        {tab === 'sft' && (
          <div className="w-full max-w-2xl animate-in fade-in">
             <h3 className="font-bold text-slate-700 mb-3 text-center">Supervised Fine-Tuning (SFT)</h3>
             <p className="text-sm text-slate-600 mb-4 text-center">Dạy mô hình làm quen với thẻ "User" và "Assistant".</p>
             <div className="bg-slate-900 text-slate-300 p-5 rounded-xl font-mono text-sm shadow-xl">
               <span className="text-blue-400 font-bold">&lt;|user|&gt;</span><br/>
               Viết một bài thơ về AI.<br/>
               <span className="text-green-400 font-bold mt-3 block">&lt;|assistant|&gt;</span>
               AI học dữ liệu muôn nơi,<br/>
               Giúp người giải quyết chuyện đời khó khăn.<span className="bg-green-900/50 px-1 ml-1">&lt;|end_of_turn|&gt;</span>
             </div>
          </div>
        )}

        {tab === 'peft' && (
          <div className="w-full max-w-2xl text-center animate-in fade-in">
             <h3 className="font-bold text-slate-700 mb-3">Low-Rank Adaptation (LoRA)</h3>
             <p className="text-sm text-slate-600 mb-6">Thay vì cập nhật 100 Tỷ tham số gốc (cần siêu máy tính), LoRA "đóng băng" não bộ chính, chỉ gắn thêm một mô-đun siêu nhỏ (Adapter) để huấn luyện. Tiết kiệm 99% VRAM!</p>
             
             <div className="flex items-center justify-center gap-6">
                <div className="bg-slate-200 border-2 border-slate-300 rounded-xl w-40 h-40 flex flex-col items-center justify-center shadow-inner relative">
                  <Lock className="w-6 h-6 text-slate-400 mb-1"/>
                  <span className="font-bold text-slate-600">Base Model</span>
                  <span className="text-xs text-slate-500">100 Tỷ Params</span>
                  <div className="absolute -bottom-3 bg-slate-700 text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-widest">Frozen</div>
                </div>
                
                <div className="text-3xl font-bold text-slate-400">+</div>
                
                <div className="flex flex-col gap-2">
                  <div className="bg-pink-100 border-2 border-pink-400 rounded-lg w-24 h-16 flex flex-col items-center justify-center text-pink-700 shadow-md">
                    <span className="font-bold text-sm">LoRA A</span>
                  </div>
                  <div className="bg-pink-100 border-2 border-pink-400 rounded-lg w-24 h-16 flex flex-col items-center justify-center text-pink-700 shadow-md">
                    <span className="font-bold text-sm">LoRA B</span>
                  </div>
                  <div className="bg-pink-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold text-center mt-1">Trainable (1% Params)</div>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={onComplete} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-transform hover:scale-105">
          Sang bước Suy luận Logic <ArrowRight className="w-5 h-5"/>
        </Button>
      </div>
    </div>
  );
}

/* =========================================
   STAGE 5: REASONING (Chain of Thought)
   ========================================= */
function ReasoningStage({ onComplete }: { onComplete: () => void }) {
  const [mode, setMode] = useState<'standard' | 'cot'>('standard');
  const [output, setOutput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const problem = "Nam có 5 quả táo. Nam cho Bình 2 quả, sau đó Nam mua thêm 3 quả và ăn mất 1 nửa số táo đang có. Hỏi Nam còn mấy quả?";

  const handlePrompt = () => {
    setIsThinking(true);
    setOutput("");
    setTimeout(() => {
      if (mode === 'standard') {
        setOutput("Nam còn 2 quả táo."); // Hallucination/Wrong answer
      } else {
        setOutput("Hãy suy nghĩ từng bước:\n1. Ban đầu Nam có 5 quả.\n2. Cho Bình 2 quả: 5 - 2 = 3 quả.\n3. Mua thêm 3 quả: 3 + 3 = 6 quả.\n4. Ăn mất một nửa: 6 / 2 = 3 quả.\n=> Vậy Nam còn 3 quả táo.");
      }
      setIsThinking(false);
    }, 1500);
  };

  return (
    <div className="p-6 flex flex-col h-full bg-slate-50/50">
      <div className="bg-orange-50 text-orange-900 p-4 rounded-xl mb-6 text-sm flex gap-3 border border-orange-200">
        <Brain className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-600" />
        <div>
          <strong>LLM Reasoning:</strong> LLM không có máy tính bỏ túi bên trong. Nếu bắt nó trả lời ngay (Zero-shot), nó hay đoán mò (Hallucination). Kỹ thuật <strong>Chain of Thought (CoT)</strong> ép LLM phải "nghĩ lớn tiếng" từng bước, sử dụng chính các từ vừa sinh ra làm bộ nhớ tạm để tính toán chính xác hơn.
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800 text-white p-5 rounded-t-2xl shadow-md">
          <span className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-1 block">Câu hỏi Toán học</span>
          <p className="font-medium text-lg">{problem}</p>
        </div>

        <div className="border-x-2 border-b-2 border-slate-200 rounded-b-2xl bg-white p-6 shadow-sm flex-1 flex flex-col gap-6">
          <div className="flex gap-4">
            <button onClick={() => {setMode('standard'); setOutput("");}} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-colors ${mode === 'standard' ? 'bg-slate-100 border-slate-800 text-slate-800' : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}>Standard Prompt</button>
            <button onClick={() => {setMode('cot'); setOutput("");}} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-colors flex items-center justify-center gap-2 ${mode === 'cot' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}>
              <Brain className="w-4 h-4"/> Chain of Thought (CoT)
            </button>
          </div>

          <div className="flex justify-center">
            <Button onClick={handlePrompt} disabled={isThinking} className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-md disabled:opacity-50">
              {isThinking ? <Activity className="w-5 h-5 animate-pulse"/> : <Play className="w-5 h-5"/>} Chạy Model
            </Button>
          </div>

          <div className={`flex-1 rounded-xl p-5 border-2 ${output ? (mode === 'standard' ? 'border-red-300 bg-red-50 text-red-800' : 'border-green-300 bg-green-50 text-green-800') : 'border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400'}`}>
            {isThinking ? <div className="flex items-center gap-2 text-slate-500"><Activity className="animate-spin w-5 h-5"/> Đang tính toán ma trận...</div> : 
              output ? (
                <div className="whitespace-pre-line font-medium">
                  {output}
                  {mode === 'standard' && <div className="mt-4 text-xs font-bold bg-red-200 text-red-900 inline-block px-2 py-1 rounded">Sai: Ảo giác (Hallucination)</div>}
                  {mode === 'cot' && <div className="mt-4 text-xs font-bold bg-green-200 text-green-900 inline-block px-2 py-1 rounded">Đúng: Logic từng bước</div>}
                </div>
              ) : "Kết quả sẽ hiện ở đây"}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={onComplete} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-transform hover:scale-105">
          Sang bước Đánh Giá (Eval) <ArrowRight className="w-5 h-5"/>
        </Button>
      </div>
    </div>
  );
}

/* =========================================
   STAGE 6: EVALUATION (Đánh giá)
   ========================================= */
function EvaluationStage({ onComplete }: { onComplete: () => void }) {
  const [running, setRunning] = useState(false);
  const [scores, setScores] = useState({ mmlu: 0, gsm8k: 0, humaneval: 0 });

  const runBenchmark = () => {
    setRunning(true);
    setScores({ mmlu: 0, gsm8k: 0, humaneval: 0 });
    
    let progress = 0;
    const int = setInterval(() => {
      progress += 5;
      setScores({
        mmlu: Math.min(85.4, progress * 0.85),
        gsm8k: Math.min(92.1, progress * 0.92),
        humaneval: Math.min(78.5, progress * 0.78)
      });
      if (progress >= 100) {
        clearInterval(int);
        setRunning(false);
      }
    }, 100);
  };

  return (
    <div className="p-6 flex flex-col h-full bg-slate-50/50">
      <div className="bg-emerald-50 text-emerald-900 p-4 rounded-xl mb-6 text-sm flex gap-3 border border-emerald-200">
        <BarChart3 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
        <div>
          <strong>LLM Evaluation:</strong> Làm sao biết AI này giỏi hơn AI kia? Các nhà nghiên cứu dùng các bộ Benchmark tiêu chuẩn.
          <strong> MMLU</strong> (Kiến thức đa ngành), <strong>GSM8K</strong> (Toán học tiểu học), <strong>HumanEval</strong> (Lập trình Python).
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center border border-slate-200 rounded-xl bg-white p-8 shadow-sm">
        <Button 
          onClick={runBenchmark} disabled={running || scores.mmlu > 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg mb-10 disabled:opacity-50 transition-transform hover:scale-105"
        >
          {running ? <Activity className="w-5 h-5 animate-spin"/> : <Play className="w-5 h-5"/>} Chạy Test Suite
        </Button>

        <div className="w-full max-w-lg space-y-6">
          <div>
            <div className="flex justify-between font-bold text-slate-700 mb-2"><span>MMLU (Kiến thức chung)</span> <span>{scores.mmlu.toFixed(1)}%</span></div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden"><div className="bg-blue-500 h-4 rounded-full transition-all duration-75" style={{width: `${scores.mmlu}%`}}></div></div>
          </div>
          <div>
            <div className="flex justify-between font-bold text-slate-700 mb-2"><span>GSM8K (Toán học)</span> <span>{scores.gsm8k.toFixed(1)}%</span></div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden"><div className="bg-orange-500 h-4 rounded-full transition-all duration-75" style={{width: `${scores.gsm8k}%`}}></div></div>
          </div>
          <div>
            <div className="flex justify-between font-bold text-slate-700 mb-2"><span>HumanEval (Code)</span> <span>{scores.humaneval.toFixed(1)}%</span></div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden"><div className="bg-emerald-500 h-4 rounded-full transition-all duration-75" style={{width: `${scores.humaneval}%`}}></div></div>
          </div>
        </div>
        
        {!running && scores.mmlu > 0 && (
           <div className="mt-8 text-center animate-in zoom-in">
              <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-2"/>
              <h3 className="font-bold text-xl text-slate-800">Mô hình đạt tiêu chuẩn SOTA!</h3>
           </div>
        )}
      </div>

      {!running && scores.mmlu > 0 && (
        <div className="mt-6 flex justify-end animate-in fade-in">
          <Button onClick={onComplete} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-transform hover:scale-105">
            Hoàn thành! Mở App Chat <ArrowRight className="w-5 h-5"/>
          </Button>
        </div>
      )}
    </div>
  );
}

/* =========================================
   STAGE 7: CHAT (ỨNG DỤNG)
   ========================================= */
function ChatStage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Xin chào! Tôi là AI hoàn chỉnh. Nhờ Pre-training tôi hiểu ngôn ngữ, nhờ SFT tôi biết trò chuyện, nhờ CoT tôi biết suy luận logic. Hãy hỏi tôi bất cứ điều gì!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      let reply = "";
      const lower = userMsg.toLowerCase();
      
      if (lower.includes('thủ đô của việt nam')) {
        reply = "Thủ đô của Việt Nam là Hà Nội.";
      } else if (lower.includes('thuốc nổ') || lower.includes('độc hại')) {
        reply = "Tôi xin lỗi, thông qua quá trình Alignment (RLHF), tôi được thiết kế để từ chối các yêu cầu gây nguy hiểm.";
      } else {
         reply = `Tuyệt vời! Câu hỏi của bạn đã được mã hóa thành các Token, xử lý qua ma trận Self-Attention của hàng tỷ tham số, và đây là kết quả văn bản sinh ra bằng phương pháp Autoregressive (Dự đoán từ tiếp theo).`;
      }

      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-[650px] bg-white">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">AI</div>
          <div>
            <div className="font-bold text-slate-800">Master AI Model</div>
            <div className="text-xs text-green-600 flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Đã triển khai Inference</div>
          </div>
        </div>
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          <CheckCircle className="w-3 h-3 mr-1" />
          All Stages Complete
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] md:max-w-[70%] p-4 rounded-2xl shadow-sm ${
              msg.role === 'user' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
            }`}>
              <div className="text-sm md:text-base whitespace-pre-line leading-relaxed">{msg.text}</div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-4 rounded-2xl bg-white border border-slate-200 text-slate-800 rounded-tl-sm flex items-center gap-1.5 shadow-sm">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        <div className="relative flex items-center max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Giao tiếp với mô hình bạn vừa chế tạo..."
            className="w-full pl-5 pr-14 py-4 rounded-full border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 text-slate-800 shadow-sm"
          />
          <button 
            onClick={handleSend} disabled={!input.trim() || isTyping}
            className="absolute right-2 p-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-full hover:from-indigo-700 hover:to-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-md"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
