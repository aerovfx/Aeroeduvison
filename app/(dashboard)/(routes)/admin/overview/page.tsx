'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  TrendingUp, Users, Award, AlertTriangle, Brain,
  Activity, Heart, Zap, ArrowUp, ArrowDown,
  CheckCircle, Clock, RefreshCw, Eye, ChevronRight
} from 'lucide-react';

interface KPICard {
  label: string;
  value: string | number;
  change: number; // percentage
  trend: 'up' | 'down' | 'stable';
  icon: any;
  color: string;
}

interface AIInsight {
  id: string;
  type: 'alert' | 'opportunity' | 'warning' | 'info';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  confidence: number;
  affectedCount: number;
  action: string;
  timestamp: string;
}

export default function AdminOverviewPage() {
  const { t } = useLanguage();
  
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  // Fix hydration mismatch - only render time on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Event Handlers
  const handleTimeRangeChange = (range: 'today' | 'week' | 'month') => {
    console.log(`📊 [Admin Overview] Time range changed to: ${range}`);
    setTimeRange(range);
    // TODO: Fetch new data for this time range
    console.log(`🔄 [Admin Overview] Fetching data for: ${range}`);
  };

  const handleAutoRefreshToggle = () => {
    const newState = !autoRefresh;
    console.log(`🔄 [Admin Overview] Auto-refresh ${newState ? 'enabled' : 'disabled'}`);
    setAutoRefresh(newState);
    if (newState) {
      console.log('⏰ [Admin Overview] Starting auto-refresh (5 min interval)');
    } else {
      console.log('⏸️  [Admin Overview] Auto-refresh paused');
    }
  };

  const handleInsightAction = (insight: AIInsight) => {
    console.log(`🎯 [Admin Overview] Action triggered for insight: ${insight.id}`);
    console.log(`   Type: ${insight.type}`);
    console.log(`   Priority: ${insight.priority}`);
    console.log(`   Action: ${insight.action}`);
    console.log(`   Affected: ${insight.affectedCount} students/teachers`);
    console.log(`   Confidence: ${Math.round(insight.confidence * 100)}%`);
    
    alert(`🚀 Action: ${insight.action}\n\nInsight: ${insight.title}\nAffected: ${insight.affectedCount}\nConfidence: ${Math.round(insight.confidence * 100)}%\n\nThis would trigger the corresponding API endpoint.`);
    
    // TODO: Call actual API based on action type
    switch (insight.action) {
      case 'Review Student Details':
        console.log('→ Navigating to /admin/students with risk filter...');
        // router.push('/admin/students?risk=high');
        break;
      case 'Adjust Learning Path':
        console.log('→ Opening learning path adjustment modal...');
        break;
      case 'Contact Teachers':
        console.log('→ Opening teacher contact form...');
        break;
      default:
        console.log(`→ Executing: ${insight.action}`);
    }
  };

  const handleViewAllInsights = () => {
    console.log('📋 [Admin Overview] View All Insights clicked');
    console.log('→ Would navigate to: /admin/insights');
    alert('📋 View All Insights\n\nWould navigate to a dedicated insights page showing all AI-generated recommendations.');
  };

  const handleManualRefresh = async () => {
    console.log('🔄 [Admin Overview] Manual refresh triggered');
    await fetchData();
    console.log(`⏰ [Admin Overview] Data refreshed at: ${new Date().toLocaleTimeString()}`);
    alert('✅ Data refreshed!\n\nAll KPIs and insights have been updated with the latest data from database.');
  };

  // Mock data for charts (emotion, teacher response) - these would also come from API in production
  const emotionData = [
    { emotion: 'Excited', value: 25, color: 'bg-yellow-400' },
    { emotion: t('emotion.focused'), value: 40, color: 'bg-blue-500' },
    { emotion: 'Confused', value: 15, color: 'bg-purple-400' },
    { emotion: 'Frustrated', value: 8, color: 'bg-red-400' },
    { emotion: 'Bored', value: 7, color: 'bg-gray-400' },
    { emotion: 'Anxious', value: 5, color: 'bg-orange-400' }
  ];

  const teacherResponse = [
    { teacher: 'Ms. Sarah', time: 2.3, interventions: 12 },
    { teacher: 'Mr. John', time: 4.5, interventions: 8 },
    { teacher: 'Ms. Emily', time: 1.8, interventions: 15 },
    { teacher: 'Mr. David', time: 6.2, interventions: 5 },
    { teacher: 'Ms. Lisa', time: 3.1, interventions: 10 }
  ];

  // State for API data
  const [kpiData, setKpiData] = useState<KPICard[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [xpGrowthData, setXpGrowthData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data from API
  const fetchData = async () => {
    try {
      console.log(`🔄 [Admin Overview] Fetching data for: ${timeRange}`);
      const response = await fetch(`/api/admin/overview?range=${timeRange}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      console.log('✅ [Admin Overview] Data fetched:', data);

      // Transform KPI data
      const transformedKPIs: KPICard[] = [
        {
          label: 'Active Students',
          value: `${data.kpis.activeStudents.value}/${data.kpis.activeStudents.total}`,
          change: data.kpis.activeStudents.change,
          trend: data.kpis.activeStudents.trend,
          icon: Users,
          color: 'text-blue-600'
        },
        {
          label: 'Avg Mastery',
          value: `${data.kpis.avgMastery.value}%`,
          change: data.kpis.avgMastery.change,
          trend: data.kpis.avgMastery.trend,
          icon: Award,
          color: 'text-green-600'
        },
        {
          label: t('vision.engagement'),
          value: `${data.kpis.engagement.value}%`,
          change: data.kpis.engagement.change,
          trend: data.kpis.engagement.trend,
          icon: Activity,
          color: 'text-orange-600'
        },
        {
          label: 'Alerts Today',
          value: data.kpis.alertsToday.value,
          change: data.kpis.alertsToday.change,
          trend: data.kpis.alertsToday.trend,
          icon: AlertTriangle,
          color: 'text-red-600'
        }
      ];

      setKpiData(transformedKPIs);
      setAiInsights(data.insights);
      setXpGrowthData(data.xpGrowthData);
      setLastUpdate(new Date(data.metadata.lastUpdated));
      setIsLoading(false);

    } catch (error) {
      console.error('❌ [Admin Overview] Error fetching data:', error);
      setIsLoading(false);
    }
  };

  // Fetch data on mount and when timeRange changes
  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 5 minutes if enabled
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      console.log('🔄 [Admin] Auto-refresh: Fetching latest data...');
      fetchData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [timeRange, autoRefresh]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 border-red-300 text-red-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'low': return 'bg-blue-100 border-blue-300 text-blue-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'opportunity': return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'warning': return <Clock className="w-5 h-5 text-orange-500" />;
      default: return <Brain className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              System Overview
            </h1>
            <p className="text-gray-600 mt-2">AI-Driven Education · Real-time Insights</p>
          
              </div>

          <div className="flex items-center gap-4">
            {/* Time Range Selector */}
            <div className="flex bg-white rounded-lg shadow-sm border p-1">
              {(['today', 'week', 'month'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => handleTimeRangeChange(range)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    timeRange === range
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>

            {/* Auto Refresh Toggle */}
            <button
              onClick={handleAutoRefreshToggle}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                autoRefresh
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-gray-50 border-gray-300 text-gray-600'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">
                {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
              </span>
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={handleManualRefresh}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all"
              title="Refresh data now"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>

            {mounted && (
              <div className="text-xs text-gray-500">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${
                  index === 0 ? 'from-blue-100 to-blue-200' :
                  index === 1 ? 'from-green-100 to-green-200' :
                  index === 2 ? 'from-orange-100 to-orange-200' :
                  'from-red-100 to-red-200'
                }`}>
                  <Icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  kpi.trend === 'up' ? 'text-green-600' : 
                  kpi.trend === 'down' ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  {kpi.trend === 'up' ? <ArrowUp className="w-4 h-4" /> : 
                   kpi.trend === 'down' ? <ArrowDown className="w-4 h-4" /> : null}
                  {Math.abs(kpi.change)}%
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">{kpi.label}</h3>
              <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* AI Insights - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">AI Insights</h2>
                <p className="text-sm text-gray-500">Top 3 insights today</p>
              </div>
            </div>
            <button 
              onClick={handleViewAllInsights}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {aiInsights.map((insight) => (
              <div
                key={insight.id}
                className={`border rounded-lg p-4 ${getPriorityColor(insight.priority)}`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getTypeIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-900">{insight.title}</h3>
                      <span className="text-xs bg-white px-2 py-1 rounded-full">
                        {insight.affectedCount} affected
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{insight.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {Math.round(insight.confidence * 100)}% confidence
                        </span>
                        <span>{insight.timestamp}</span>
                      </div>
                      <button 
                        onClick={() => handleInsightAction(insight)}
                        className="px-3 py-1 bg-white text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
                      >
                        {insight.action}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Why am I seeing this?</p>
                <p className="text-xs text-gray-600 mt-1">
                  AI analyzes student behavior, XP trends, and emotion patterns to surface actionable insights.
                  Click any insight for detailed explainability.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* XP Growth Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">XP Growth</h3>
          <div className="space-y-3">
            {xpGrowthData.map((data, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-12">{data.date}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-end px-2"
                    style={{ width: `${(data.avgXP / 1300) * 100}%` }}
                  >
                    <span className="text-xs text-white font-medium">{data.avgXP}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emotion Stability */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-pink-100 to-pink-200 rounded-lg">
              <Heart className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Emotion Distribution</h3>
              <p className="text-sm text-gray-500">Real-time student emotions</p>
            </div>
          </div>
          <div className="space-y-3">
            {emotionData.map((emotion, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{emotion.emotion}</span>
                  <span className="text-gray-600">{emotion.value}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={`${emotion.color} h-3 rounded-full transition-all`}
                    style={{ width: `${emotion.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Teacher Response Time */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-green-100 to-green-200 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Teacher Response Time</h3>
              <p className="text-sm text-gray-500">Avg hours to respond</p>
            </div>
          </div>
          <div className="space-y-4">
            {teacherResponse.map((teacher, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold">
                    {teacher.teacher.split(' ')[1].charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{teacher.teacher}</p>
                    <p className="text-xs text-gray-500">{teacher.interventions} interventions</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  teacher.time < 3 ? 'bg-green-100 text-green-700' :
                  teacher.time < 5 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {teacher.time}h
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

