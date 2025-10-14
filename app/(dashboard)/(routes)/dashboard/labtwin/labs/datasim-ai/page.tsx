"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Brain, Star, Play, Loader2, Info, BookOpen, Sparkles, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { MLScatterPlot } from "@/components/simulations/ml-scatter-plot";
import { MLLossCurve } from "@/components/simulations/ml-loss-curve";

export default function DataSimAIPage() {
  const [data, setData] = useState<any>(null);
  const [manifest, setManifest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [currentResult, setCurrentResult] = useState<any>(null);
  
  // Training config
  const [modelType, setModelType] = useState('logistic_regression');
  const [datasetType, setDatasetType] = useState('classification_2d');
  const [nSamples, setNSamples] = useState(200);
  const [noise, setNoise] = useState(0.1);
  const [nClasses, setNClasses] = useState(2);

  const API_ENDPOINT = "http://localhost:8009";

  useEffect(() => {
    const loadData = async () => {
      try {
        const [simData, manifestData] = await Promise.all([
          fetch('/labs/datasim-ai/data.json').then(r => r.json()),
          fetch('/labs/datasim-ai/manifest.json').then(r => r.json())
        ]);
        
        setData(simData);
        setManifest(manifestData);
        
        // Set first sample as default
        if (simData.samples && simData.samples.length > 0) {
          setCurrentResult(simData.samples[0].data);
        }
      } catch (error) {
        console.error('Error loading DataSim.AI data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const trainModel = async () => {
    setTraining(true);

    try {
      const config = {
        dataset_type: datasetType,
        model_type: modelType,
        n_samples: nSamples,
        noise: noise,
        n_classes: nClasses
      };

      const response = await fetch(`${API_ENDPOINT}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) throw new Error('Training failed');

      const result = await response.json();
      setCurrentResult(result);
    } catch (error) {
      console.error('Training error:', error);
      alert('Không thể kết nối đến API. Chạy: cd python-simulations/datasim-ai && python api.py');
    } finally {
      setTraining(false);
    }
  };

  const loadSample = (sampleId: string) => {
    const sample = data.samples.find((s: any) => s.id === sampleId);
    if (sample) {
      setCurrentResult(sample.data);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải DataSim.AI...</p>
        </div>
      </div>
    );
  }

  if (!data || !manifest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Không thể tải dữ liệu</p>
          <Link href="/dashboard/labtwin/labs" className="text-purple-600 hover:text-purple-700 mt-2 inline-block">
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/labtwin/labs" className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-4 font-medium">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại Labs
          </Link>
          
          <div className="flex items-start gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-xl text-white shadow-lg">
              <Brain className="h-10 w-10" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-2">
                🤖 {manifest.nameVi || manifest.name}
              </h1>
              <p className="text-gray-600 text-lg mb-3">
                {manifest.descriptionVi || manifest.description}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className="bg-gradient-to-r from-purple-400 to-pink-400 text-white border-0">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Machine Learning
                </Badge>
                <Badge className="bg-gradient-to-r from-blue-400 to-cyan-400 text-white border-0">
                  scikit-learn + PyTorch
                </Badge>
                <Badge className="bg-gradient-to-r from-green-400 to-emerald-400 text-white border-0">
                  Real Models
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="playground" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/80 p-1">
            <TabsTrigger value="playground">🎮 Playground</TabsTrigger>
            <TabsTrigger value="samples">📚 Samples</TabsTrigger>
            <TabsTrigger value="theory">📖 Lý thuyết</TabsTrigger>
          </TabsList>

          {/* Playground Tab */}
          <TabsContent value="playground" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Controls */}
              <Card className="bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Training Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Dataset */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dataset</label>
                    <Select value={datasetType} onValueChange={setDatasetType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linear">📈 Linear</SelectItem>
                        <SelectItem value="polynomial">📊 Polynomial</SelectItem>
                        <SelectItem value="classification_2d">🎯 2D Classification</SelectItem>
                        <SelectItem value="circles">⭕ Circles</SelectItem>
                        <SelectItem value="moons">🌙 Moons</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Model */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Model</label>
                    <Select value={modelType} onValueChange={setModelType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linear_regression">📏 Linear Regression</SelectItem>
                        <SelectItem value="logistic_regression">📊 Logistic Regression</SelectItem>
                        <SelectItem value="knn">👥 K-Nearest Neighbors</SelectItem>
                        <SelectItem value="decision_tree">🌳 Decision Tree</SelectItem>
                        <SelectItem value="svm">🎯 SVM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Samples */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Samples: {nSamples}</label>
                    <Slider
                      value={[nSamples]}
                      onValueChange={(v) => setNSamples(v[0])}
                      min={50}
                      max={500}
                      step={50}
                    />
                  </div>

                  {/* Noise */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Noise: {noise.toFixed(2)}</label>
                    <Slider
                      value={[noise * 100]}
                      onValueChange={(v) => setNoise(v[0] / 100)}
                      min={0}
                      max={50}
                      step={5}
                    />
                  </div>

                  {/* Train Button */}
                  <Button
                    onClick={trainModel}
                    disabled={training}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    size="lg"
                  >
                    {training ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Training...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Train Model
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Results */}
              <div className="lg:col-span-2 space-y-6">
                {currentResult && (
                  <>
                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                        <CardContent className="p-4 text-center">
                          <div className="text-3xl mb-2">📊</div>
                          <div className="text-2xl font-bold text-blue-700">
                            {(currentResult.train_score * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-blue-600">Train Accuracy</div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
                        <CardContent className="p-4 text-center">
                          <div className="text-3xl mb-2">✅</div>
                          <div className="text-2xl font-bold text-green-700">
                            {(currentResult.test_score * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-green-600">Test Accuracy</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Visualization */}
                    {currentResult.predictions && currentResult.predictions.test && (
                      <MLScatterPlot
                        data={currentResult.predictions.test}
                        title="Test Set Predictions"
                        decisionBoundary={currentResult.decision_boundary}
                        showBoundary={true}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Samples Tab */}
          <TabsContent value="samples" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.samples?.map((sample: any) => (
                <Card 
                  key={sample.id}
                  className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50"
                  onClick={() => loadSample(sample.id)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-4xl mb-3">🎯</div>
                    <h3 className="font-bold text-gray-900 mb-2">{sample.name}</h3>
                    <Badge className="bg-gradient-to-r from-purple-400 to-pink-400 text-white">
                      View Result
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Theory Tab */}
          <TabsContent value="theory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Machine Learning Basics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold mb-2">Supervised Learning</h3>
                  <p className="text-gray-700">
                    Model học từ dữ liệu có label (X, y) để dự đoán output cho input mới.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Classification vs Regression</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li><strong>Classification</strong>: Dự đoán category (class 0, 1, 2...)</li>
                    <li><strong>Regression</strong>: Dự đoán số liên tục (giá, nhiệt độ...)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


