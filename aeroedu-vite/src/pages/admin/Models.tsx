import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Edit2, Trash2, Brain, Eye, Cpu, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEMO_MODELS = [
  { id: 1, name: 'Student Performance Predictor', type: 'nlp' as const, version: '2.3.1', status: 'active' as const, accuracy: 94.2, latency: 145, lastUpdated: '2024-04-05', description: 'Predicts student performance based on assessment history' },
  { id: 2, name: 'Exam Proctoring Vision', type: 'vision' as const, version: '3.1.0', status: 'active' as const, accuracy: 96.8, latency: 230, lastUpdated: '2024-04-03', description: 'Detects cheating and suspicious behavior during exams' },
  { id: 3, name: 'Course Recommendation Engine', type: 'recommendation' as const, version: '1.8.2', status: 'active' as const, accuracy: 88.5, latency: 120, lastUpdated: '2024-04-01', description: 'Recommends courses based on student interests' },
  { id: 4, name: 'Document Analysis NLP', type: 'nlp' as const, version: '2.2.0', status: 'training' as const, accuracy: 92.1, latency: 156, lastUpdated: '2024-03-28', description: 'Analyzes student submissions and essays' },
  { id: 5, name: 'Emotion Detection Model', type: 'vision' as const, version: '1.5.1', status: 'training' as const, accuracy: 85.3, latency: 187, lastUpdated: '2024-03-25', description: 'Detects student emotions during class' },
  { id: 6, name: 'Legacy NLP V1', type: 'nlp' as const, version: '1.0.0', status: 'deprecated' as const, accuracy: 78.9, latency: 201, lastUpdated: '2023-12-10', description: 'Old text analysis model' },
];

const MODEL_TYPES = ['nlp', 'vision', 'recommendation'];

const PERFORMANCE_DATA = [
  { version: 'v1.0', accuracy: 78.9 },
  { version: 'v1.5', accuracy: 82.1 },
  { version: 'v2.0', accuracy: 88.5 },
  { version: 'v2.2', accuracy: 91.3 },
  { version: 'v2.3', accuracy: 94.2 },
];

interface Model {
  id: number;
  name: string;
  type: 'nlp' | 'vision' | 'recommendation';
  version: string;
  status: 'active' | 'training' | 'deprecated';
  accuracy: number;
  latency: number;
  lastUpdated: string;
  description: string;
}

export default function Models() {
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const filteredModels = DEMO_MODELS.filter((model) => {
    const matchesStatus = !filterStatus || model.status === filterStatus;
    const matchesType = !filterType || model.type === filterType;
    return matchesStatus && matchesType;
  });

  const stats = {
    activeModels: DEMO_MODELS.filter((m) => m.status === 'active').length,
    trainingModels: DEMO_MODELS.filter((m) => m.status === 'training').length,
    deprecatedModels: DEMO_MODELS.filter((m) => m.status === 'deprecated').length,
  };

  const getModelIcon = (type: string) => {
    switch (type) {
      case 'nlp':
        return Brain;
      case 'vision':
        return Eye;
      case 'recommendation':
        return Cpu;
      default:
        return Brain;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
      case 'training':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
      case 'deprecated':
        return 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'nlp':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
      case 'vision':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300';
      case 'recommendation':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">AI Model Management</h1>
          <p className="text-muted-foreground">Deploy and manage machine learning models</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Upload className="w-5 h-5" />
          Upload Model
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Active Models</p>
          <p className="text-2xl font-bold text-green-600">{stats.activeModels}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Training</p>
          <p className="text-2xl font-bold text-blue-600">{stats.trainingModels}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Deprecated</p>
          <p className="text-2xl font-bold text-gray-600">{stats.deprecatedModels}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="training">Training</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Model Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {MODEL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredModels.map((model) => {
          const IconComponent = getModelIcon(model.type);
          return (
            <div key={model.id} className="bg-card border border-border rounded-xl p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{model.name}</h3>
                    <p className="text-xs text-muted-foreground">v{model.version}</p>
                  </div>
                </div>
                <span className={cn('px-2 py-1 rounded text-xs font-semibold', getStatusColor(model.status))}>
                  {model.status.charAt(0).toUpperCase() + model.status.slice(1)}
                </span>
              </div>

              {/* Type Badge */}
              <div className="mb-4">
                <span className={cn('inline-block px-2 py-1 rounded text-xs font-semibold', getTypeColor(model.type))}>
                  {model.type.toUpperCase()}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-4">{model.description}</p>

              {/* Metrics */}
              <div className="space-y-2 mb-4 pb-4 border-b border-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Accuracy</span>
                  <span className="text-sm font-bold text-foreground">{model.accuracy}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-500 h-full rounded-full" style={{ width: `${model.accuracy}%` }} />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm text-muted-foreground">Avg Latency</span>
                  <span className="text-sm font-bold text-foreground">{model.latency}ms</span>
                </div>
              </div>

              {/* Last Updated */}
              <p className="text-xs text-muted-foreground mb-4">Updated: {model.lastUpdated}</p>

              {/* Actions */}
              <div className="flex gap-2">
                {model.status === 'active' ? (
                  <button className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors">
                    Undeploy
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedModel(model);
                      setShowDeployModal(true);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                  >
                    Deploy
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance Chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Performance Over Versions</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={PERFORMANCE_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="version" stroke="#888" />
            <YAxis stroke="#888" domain={[70, 100]} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
            <Legend />
            <Line type="monotone" dataKey="accuracy" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 5 }} activeDot={{ r: 7 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Deploy Modal */}
      {showDeployModal && selectedModel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Deploy Model</h2>
              <button onClick={() => setShowDeployModal(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to deploy <span className="font-semibold text-foreground">{selectedModel.name}</span> (v{selectedModel.version})?
              </p>
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <span className="font-semibold">Accuracy:</span> {selectedModel.accuracy}%
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <span className="font-semibold">Avg Latency:</span> {selectedModel.latency}ms
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeployModal(false)}
                className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeployModal(false);
                  setSelectedModel(null);
                }}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Deploy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Model Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Upload New Model</h2>
              <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Model Name"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Type</option>
                {MODEL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Version (e.g., 1.0.0)"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground mb-1">Click to upload model file</p>
                <p className="text-xs text-muted-foreground">or drag and drop</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
