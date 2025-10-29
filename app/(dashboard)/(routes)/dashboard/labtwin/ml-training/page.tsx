'use client';

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Play, 
  Pause, 
  Download, 
  Trash2, 
  TrendingUp, 
  Activity,
  Database,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Info,
  Terminal,
  Link as LinkIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';

// Types
interface TrainingConfig {
  config_preset: string;
  custom_config?: {
    hf_dataset?: string;
    dataset_name?: string;
    data_source?: string;
  };
}

interface TrainingJob {
  training_id: string;
  status: string;
  created_at: string;
  config_name: string;
}

interface TrainingProgress {
  status: string;
  epoch?: number;
  total_epochs?: number;
  loss?: number;
  accuracy?: number;
  val_loss?: number;
  val_accuracy?: number;
  message?: string;
  epoch_time?: number;
  total_time?: number;
}

interface Model {
  model_id: string;
  name: string;
  created_at: string;
  config: any;
  results: any;
  file_path: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function MLTrainingPage() {
  const { t } = useLanguage();
  
  // State
  const [selectedDataset, setSelectedDataset] = useState('mnist');
  const [customHfDataset, setCustomHfDataset] = useState('');
  const [customDatasetName, setCustomDatasetName] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [currentTrainingId, setCurrentTrainingId] = useState<string | null>(null);
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [trainingJobs, setTrainingJobs] = useState<TrainingJob[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [accuracyHistory, setAccuracyHistory] = useState<number[]>([]);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Fetch models on mount
  useEffect(() => {
    fetchModels();
    fetchTrainingJobs();
  }, []);

  // Connect to WebSocket when training starts
  useEffect(() => {
    if (currentTrainingId && isTraining) {
      connectWebSocket(currentTrainingId);
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [currentTrainingId, isTraining]);

  // API Functions
  const fetchModels = async () => {
    try {
      const res = await fetch(`${API_URL}/api/ml/models`);
      if (!res.ok) {
        console.warn('ML Training API not available');
        return;
      }
      const data = await res.json();
      setModels(data.models || []);
    } catch (error) {
      console.warn('ML Training API not available:', error);
      // ML Training is disabled, this is expected
    }
  };

  const fetchTrainingJobs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/ml/train/list`);
      if (!res.ok) {
        console.warn('ML Training API not available');
        return;
      }
      const data = await res.json();
      setTrainingJobs(data.jobs || []);
    } catch (error) {
      console.warn('ML Training API not available:', error);
      // ML Training is disabled, this is expected
    }
  };

  const startTraining = async () => {
    try {
      const config: TrainingConfig = {
        config_preset: selectedDataset
      };

      // Add custom HF dataset if provided
      if (selectedDataset === 'custom' && customHfDataset) {
        config.custom_config = {
          hf_dataset: customHfDataset,
          dataset_name: customDatasetName || 'custom',
          data_source: 'huggingface'
        };
      }

      const res = await fetch(`${API_URL}/api/ml/train/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!res.ok) {
        setTrainingLogs(prev => [...prev, `[ERROR] ML Training API not available. Please install tensorflow-macos.`]);
        return;
      }

      const data = await res.json();
      
      setCurrentTrainingId(data.training_id);
      setIsTraining(true);
      setLossHistory([]);
      setAccuracyHistory([]);
      setTrainingLogs([`[${new Date().toLocaleTimeString()}] Training started with ID: ${data.training_id}`]);
      
      fetchTrainingJobs();
    } catch (error) {
      console.warn('ML Training API not available:', error);
      setTrainingLogs(prev => [...prev, `[ERROR] ML Training is currently disabled. See warning banner above.`]);
    }
  };

  const stopTraining = async () => {
    if (!currentTrainingId) return;
    
    try {
      await fetch(`${API_URL}/api/ml/train/stop/${currentTrainingId}`, {
        method: 'POST'
      });
      
      setIsTraining(false);
      if (wsRef.current) {
        wsRef.current.close();
      }
    } catch (error) {
      console.error('Error stopping training:', error);
    }
  };

  const connectWebSocket = (trainingId: string) => {
    const ws = new WebSocket(`${API_URL.replace('http', 'ws')}/api/ml/ws/training/${trainingId}`);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setTrainingProgress(data);
      
      // Add detailed logs
      const timestamp = new Date().toLocaleTimeString();
      if (data.status === 'loading_data') {
        setTrainingLogs(prev => [...prev, `[${timestamp}] 📥 Loading dataset...`]);
      } else if (data.status === 'building_model') {
        setTrainingLogs(prev => [...prev, `[${timestamp}] 🏗️  Building model architecture...`]);
      } else if (data.status === 'training' && data.epoch) {
        const log = `[${timestamp}] Epoch ${data.epoch}/${data.total_epochs} - loss: ${data.loss?.toFixed(4)} - acc: ${(data.accuracy * 100).toFixed(2)}% - val_loss: ${data.val_loss?.toFixed(4)} - val_acc: ${(data.val_accuracy * 100).toFixed(2)}%`;
        setTrainingLogs(prev => [...prev, log]);
      } else if (data.message) {
        setTrainingLogs(prev => [...prev, `[${timestamp}] ${data.message}`]);
      }
      
      // Update history for charts
      if (data.loss !== undefined) {
        setLossHistory(prev => [...prev, data.loss]);
      }
      if (data.accuracy !== undefined) {
        setAccuracyHistory(prev => [...prev, data.accuracy * 100]);
      }
      
      // Check if training completed
      if (data.status === 'completed' || data.status === 'failed') {
        setIsTraining(false);
        setTrainingLogs(prev => [...prev, `[${timestamp}] ${data.status === 'completed' ? '✅ Training completed!' : '❌ Training failed!'}`]);
        fetchModels();
        fetchTrainingJobs();
      }
      
      // Auto-scroll logs
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket closed');
    };
    
    wsRef.current = ws;
  };

  const downloadModel = async (modelId: string, format: string = 'h5') => {
    typeof window !== 'undefined' && window.open(`${API_URL}/api/ml/models/${modelId}/download?format=${format}`, '_blank');
  };

  const deleteModel = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;
    
    try {
      await fetch(`${API_URL}/api/ml/models/${modelId}`, {
        method: 'DELETE'
      });
      fetchModels();
    } catch (error) {
      console.error('Error deleting model:', error);
    }
  };

  const exportModelAllFormats = async (modelId: string) => {
    try {
      await fetch(`${API_URL}/api/ml/models/${modelId}/export`, {
        method: 'POST'
      });
      alert('Model exported to all formats successfully!');
    } catch (error) {
      console.error('Error exporting model:', error);
    }
  };

  // Render
  return (
    <div className="p-6 space-y-6">
      {/* ML Training Unavailable Warning */}
      <Card className="border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-yellow-500 rounded-lg">
              <Info className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                ⚠️ ML Training Currently Unavailable
              </h3>
              <p className="text-sm text-yellow-800 mb-3">
                TensorFlow is not compatible with macOS Apple Silicon by default. 
                To enable ML Training, please install the macOS-specific version:
              </p>
              <div className="bg-slate-900 p-3 rounded-lg font-mono text-xs text-green-400 mb-3">
                <div>pip3 uninstall tensorflow -y</div>
                <div>pip3 install tensorflow-macos tensorflow-metal</div>
                <div className="text-slate-500 mt-2"># Then set ML_TRAINING_ENABLED = True in main.py</div>
              </div>
              <p className="text-sm text-yellow-700">
                <strong>Alternative:</strong> Use <a href="https://colab.research.google.com" target="_blank" className="underline">Google Colab</a> (Free GPU) to train models, 
                then download and use them in this app.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
              <Brain className="h-8 w-8 text-white" />
            </div>
            ML Model Training
          
              </h1>
          <p className="text-muted-foreground mt-2">
            Train handwriting recognition models with real-time visualization
          </p>
        </div>
        
        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-4 py-2">
          ⚠️ Temporarily Unavailable
        </Badge>
      </div>

      <Tabs defaultValue="train" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="train">
            <Play className="h-4 w-4 mr-2" />
            Training
          </TabsTrigger>
          <TabsTrigger value="progress">
            <Activity className="h-4 w-4 mr-2" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="models">
            <Database className="h-4 w-4 mr-2" />
            Models
          </TabsTrigger>
        </TabsList>

        {/* Training Tab */}
        <TabsContent value="train" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuration Panel */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuration
                </CardTitle>
                <CardDescription>
                  Select dataset and model parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Dataset</label>
                  <Select
                    value={selectedDataset}
                    onValueChange={setSelectedDataset}
                    disabled={isTraining}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mnist">
                        <div className="flex items-center gap-2">
                          <span>🔢</span>
                          <div>
                            <div className="font-medium">MNIST Digits</div>
                            <div className="text-xs text-muted-foreground">Handwritten 0-9</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="emnist">
                        <div className="flex items-center gap-2">
                          <span>🔤</span>
                          <div>
                            <div className="font-medium">EMNIST Letters</div>
                            <div className="text-xs text-muted-foreground">Handwritten A-Z</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="custom">
                        <div className="flex items-center gap-2">
                          <span>✍️</span>
                          <div>
                            <div className="font-medium">Custom Dataset</div>
                            <div className="text-xs text-muted-foreground">62 classes</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Hugging Face Dataset Input */}
                {selectedDataset === 'custom' && (
                  <div className="space-y-3 p-3 border-2 border-dashed border-purple-200 rounded-lg bg-purple-50/50">
                    <div className="flex items-center gap-2 text-purple-700">
                      <LinkIcon className="h-4 w-4" />
                      <span className="text-sm font-semibold">Hugging Face Dataset</span>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="hf-dataset" className="text-xs">Dataset Name/Link</Label>
                      <Input
                        id="hf-dataset"
                        placeholder="e.g., mnist, fashion_mnist, or HF URL"
                        value={customHfDataset}
                        onChange={(e) => setCustomHfDataset(e.target.value)}
                        disabled={isTraining}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter Hugging Face dataset name or full URL
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="dataset-name" className="text-xs">Display Name (Optional)</Label>
                      <Input
                        id="dataset-name"
                        placeholder="e.g., My Custom Dataset"
                        value={customDatasetName}
                        onChange={(e) => setCustomDatasetName(e.target.value)}
                        disabled={isTraining}
                        className="text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Model Architecture</label>
                  <Select defaultValue="cnn" disabled={isTraining}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cnn">CNN (Fast)</SelectItem>
                      <SelectItem value="resnet">ResNet (Better)</SelectItem>
                      <SelectItem value="efficientnet">EfficientNet (Best)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 space-y-2">
                  {!isTraining ? (
                    <Button
                      onClick={startTraining}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                      size="lg"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Training
                    </Button>
                  ) : (
                    <Button
                      onClick={stopTraining}
                      variant="destructive"
                      className="w-full"
                      size="lg"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Stop Training
                    </Button>
                  )}
                </div>

                {/* Dataset Info */}
                <div className="pt-4 border-t space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Dataset Info
                  </h4>
                  {selectedDataset === 'mnist' && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• 60,000 training images</p>
                      <p>• 10,000 test images</p>
                      <p>• 28x28 grayscale</p>
                      <p>• 10 classes (0-9)</p>
                    </div>
                  )}
                  {selectedDataset === 'emnist' && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• 145,000 training images</p>
                      <p>• 24,000 test images</p>
                      <p>• 28x28 grayscale</p>
                      <p>• 26 classes (A-Z)</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Training Jobs */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Training History</CardTitle>
                <CardDescription>
                  Recent training jobs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {trainingJobs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No training jobs yet</p>
                      <p className="text-sm">Start your first training to see it here</p>
                    </div>
                  ) : (
                    trainingJobs.slice(0, 5).map((job) => (
                      <div
                        key={job.training_id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {job.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : job.status === 'failed' ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{job.config_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(job.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            job.status === 'completed' ? 'default' :
                            job.status === 'failed' ? 'destructive' :
                            'secondary'
                          }
                        >
                          {job.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          {!isTraining && !trainingProgress ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No active training</p>
                <p className="text-sm text-muted-foreground">Start a training job to see progress here</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Progress Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Epoch</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {trainingProgress?.epoch || 0} / {trainingProgress?.total_epochs || 10}
                    </div>
                    <Progress
                      value={((trainingProgress?.epoch || 0) / (trainingProgress?.total_epochs || 10)) * 100}
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Loss</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {trainingProgress?.loss?.toFixed(4) || '0.0000'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Val: {trainingProgress?.val_loss?.toFixed(4) || 'N/A'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {((trainingProgress?.accuracy || 0) * 100).toFixed(2)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Val: {trainingProgress?.val_accuracy ? (trainingProgress.val_accuracy * 100).toFixed(2) + '%' : 'N/A'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className="text-sm">
                      {trainingProgress?.status || 'idle'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      {trainingProgress?.message || 'Waiting...'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Training Logs - Like Colab */}
              <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-green-600" />
                    <span className="text-green-700">Training Logs</span>
                    <Badge className="bg-green-500 text-white">Real-time</Badge>
                  </CardTitle>
                  <CardDescription>
                    Detailed training progress (like Google Colab)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64 w-full rounded-lg border-2 border-green-300 bg-slate-900 p-4">
                    <div className="font-mono text-xs text-green-400 space-y-1">
                      {trainingLogs.length === 0 ? (
                        <div className="text-slate-500">Waiting for training to start...</div>
                      ) : (
                        trainingLogs.map((log, idx) => (
                          <div key={idx} className="leading-relaxed">
                            {log}
                          </div>
                        ))
                      )}
                      <div ref={logsEndRef} />
                    </div>
                  </ScrollArea>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>📊 Total logs: {trainingLogs.length}</span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setTrainingLogs([])}
                      className="h-7"
                    >
                      Clear Logs
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Loss History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-end justify-between gap-1">
                      {lossHistory.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          Waiting for training data...
                        </div>
                      ) : (
                        lossHistory.map((loss, idx) => (
                          <div
                            key={idx}
                            className="flex-1 bg-gradient-to-t from-red-500 to-red-300 rounded-t"
                            style={{
                              height: `${Math.max(5, (1 - loss) * 100)}%`,
                              transition: 'height 0.3s ease'
                            }}
                            title={`Epoch ${idx + 1}: ${loss.toFixed(4)}`}
                          />
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Accuracy History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-end justify-between gap-1">
                      {accuracyHistory.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          Waiting for training data...
                        </div>
                      ) : (
                        accuracyHistory.map((acc, idx) => (
                          <div
                            key={idx}
                            className="flex-1 bg-gradient-to-t from-green-500 to-green-300 rounded-t"
                            style={{
                              height: `${Math.max(5, acc)}%`,
                              transition: 'height 0.3s ease'
                            }}
                            title={`Epoch ${idx + 1}: ${acc.toFixed(2)}%`}
                          />
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trained Models</CardTitle>
              <CardDescription>
                Download, export, or delete trained models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {models.length === 0 ? (
                  <div className="text-center py-12">
                    <Database className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No models yet</p>
                    <p className="text-sm text-muted-foreground">Train your first model to see it here</p>
                  </div>
                ) : (
                  models.map((model) => (
                    <div
                      key={model.model_id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold">{model.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(model.created_at).toLocaleString()}
                        </p>
                        {model.results && (
                          <div className="flex gap-4 mt-2 text-xs">
                            <Badge variant="outline">
                              Acc: {(model.results.val_accuracy * 100).toFixed(2)}%
                            </Badge>
                            <Badge variant="outline">
                              Loss: {model.results.val_loss.toFixed(4)}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadModel(model.model_id, 'h5')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          H5
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadModel(model.model_id, 'tflite')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          TFLite
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportModelAllFormats(model.model_id)}
                        >
                          Export All
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteModel(model.model_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

