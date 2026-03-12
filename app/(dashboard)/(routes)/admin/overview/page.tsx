'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import '@/styles/neumorphic-theme.css';
import {
  TrendingUp, Users, Award, AlertTriangle, Brain,
  Activity, Heart, Zap, ArrowUp, ArrowDown,
  CheckCircle, Clock, RefreshCw, Eye, ChevronRight,
  School, LayoutDashboard
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

// ============================================
// Neumorphic Components
// ============================================

interface NeuCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

const NeuCard: React.FC<NeuCardProps> = ({ children, className = '', hover = true, onClick }) => (
  <div
    className={`neu-card ${hover ? 'neu-bento-item' : ''} ${className}`}
    onClick={onClick}
    style={{
      background: 'var(--neu-card-bg)',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: '10px 10px 20px var(--neu-shadow-dark), -10px -10px 20px var(--neu-shadow-light), inset 1px 1px 2px var(--neu-shadow-inset-dark)',
      border: '1px solid var(--neu-border)',
      transition: 'all 0.3s ease',
      ...(hover && {
        cursor: 'pointer',
      })
    }}
  >
    {children}
  </div>
);

interface NeuBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const NeuBadge: React.FC<NeuBadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const variantStyles = {
    default: { background: 'var(--neu-card-bg)', color: 'var(--neu-text-primary)' },
    success: { background: 'var(--neu-accent-success)', color: '#ffffff' },
    warning: { background: 'var(--neu-accent-warning)', color: '#ffffff' },
    danger: { background: 'var(--neu-accent-danger)', color: '#ffffff' },
    info: { background: 'var(--neu-accent-info)', color: '#ffffff' },
  };

  return (
    <span
      className={`neu-badge ${className}`}
      style={{
        ...variantStyles[variant],
        padding: '4px 12px',
        borderRadius: '8px',
        fontSize: '0.75rem',
        fontWeight: '600',
        boxShadow: '2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light)',
        display: 'inline-block',
      }}
    >
      {children}
    </span>
  );
};

interface NeuButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'success' | 'danger';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const NeuButton: React.FC<NeuButtonProps> = ({
  children,
  onClick,
  variant = 'default',
  className = '',
  size = 'md',
  disabled = false,
}) => {
  const sizeStyles = {
    sm: { padding: '10px 18px', fontSize: '0.8rem' },
    md: { padding: '14px 28px', fontSize: '0.9rem' },
    lg: { padding: '18px 36px', fontSize: '1rem' },
  };

  const variantStyles = {
    default: {
      background: 'var(--neu-button-bg)',
      color: 'var(--neu-text-primary)',
      boxShadow: '8px 8px 16px var(--neu-shadow-dark), -8px -8px 16px var(--neu-shadow-light), inset 1px 1px 2px var(--neu-shadow-inset-dark)',
    },
    primary: {
      background: 'var(--neu-button-primary-bg)',
      color: 'var(--neu-text-inverse)',
      boxShadow: '8px 8px 16px rgba(102, 126, 234, 0.4), -6px -6px 12px var(--neu-shadow-light), inset 2px 2px 4px rgba(0, 0, 0, 0.1)',
    },
    success: {
      background: 'var(--neu-button-success-bg)',
      color: 'var(--neu-text-inverse)',
    },
    danger: {
      background: 'var(--neu-button-danger-bg)',
      color: 'var(--neu-text-inverse)',
    },
  };

  return (
    <button
      className={`neu-button ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variantStyles[variant],
        ...sizeStyles[size],
        border: 'none',
        borderRadius: '16px',
        fontWeight: '600',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
};

interface NeuStatBoxProps {
  label: string;
  value: string | number;
  icon: any;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
  color: string;
  gradientFrom: string;
  gradientTo: string;
}

const NeuStatBox: React.FC<NeuStatBoxProps> = ({
  label,
  value,
  icon: Icon,
  trend,
  change,
  color,
  gradientFrom,
  gradientTo,
}) => (
  <NeuCard hover={false}>
    <div className="flex items-center justify-between mb-4">
      <div
        className="flex items-center justify-center"
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
          boxShadow: '6px 6px 12px rgba(102, 126, 234, 0.4), -4px -4px 8px var(--neu-shadow-light), inset 2px 2px 4px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Icon className="w-6 h-6" style={{ color: '#ffffff' }} />
      </div>
      {change !== undefined && (
        <div
          className="flex items-center gap-1 text-sm font-medium"
          style={{
            color: trend === 'up' ? 'var(--neu-accent-success)' : trend === 'down' ? 'var(--neu-accent-danger)' : 'var(--neu-text-secondary)',
          }}
        >
          {trend === 'up' ? <ArrowUp className="w-4 h-4" /> : trend === 'down' ? <ArrowDown className="w-4 h-4" /> : null}
          {Math.abs(change)}%
        </div>
      )}
    </div>
    <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--neu-text-secondary)', fontSize: '0.85rem' }}>
      {label}
    </h3>
    <p className="text-3xl font-bold" style={{ color: 'var(--neu-text-primary)' }}>{value}</p>
  </NeuCard>
);

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
    { emotion: 'Excited', value: 25, color: '#fbbf24' },
    { emotion: t('emotion.focused'), value: 40, color: '#3b82f6' },
    { emotion: 'Confused', value: 15, color: '#a78bfa' },
    { emotion: 'Frustrated', value: 8, color: '#f87171' },
    { emotion: 'Bored', value: 7, color: '#9ca3af' },
    { emotion: 'Anxious', value: 5, color: '#fb923c' }
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
      case 'high': return { bg: 'rgba(245, 101, 101, 0.15)', border: 'rgba(245, 101, 101, 0.4)', text: 'var(--neu-accent-danger)' };
      case 'medium': return { bg: 'rgba(237, 137, 54, 0.15)', border: 'rgba(237, 137, 54, 0.4)', text: 'var(--neu-accent-warning)' };
      case 'low': return { bg: 'rgba(66, 153, 225, 0.15)', border: 'rgba(66, 153, 225, 0.4)', text: 'var(--neu-accent-info)' };
      default: return { bg: 'var(--neu-card-bg)', border: 'var(--neu-border)', text: 'var(--neu-text-primary)' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="w-5 h-5" style={{ color: 'var(--neu-accent-danger)' }} />;
      case 'opportunity': return <Zap className="w-5 h-5" style={{ color: 'var(--neu-accent-warning)' }} />;
      case 'warning': return <Clock className="w-5 h-5" style={{ color: 'var(--neu-accent-warning)' }} />;
      default: return <Brain className="w-5 h-5" style={{ color: 'var(--neu-accent-info)' }} />;
    }
  };

  return (
    <div
      className="neumorphic-theme"
      style={{
        background: 'linear-gradient(135deg, var(--neu-bg-gradient-start) 0%, var(--neu-bg-gradient-mid) 50%, var(--neu-bg-gradient-end) 100%)',
        backgroundSize: '200% 200%',
        animation: 'gradientShift 15s ease infinite',
        minHeight: '100vh',
        padding: '24px',
      }}
    >
      {/* Header */}
      <div className="neu-header" style={{ marginBottom: '32px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center"
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)',
                boxShadow: '8px 8px 16px rgba(102, 126, 234, 0.4), -6px -6px 12px var(--neu-shadow-light), inset 2px 2px 4px rgba(0, 0, 0, 0.1)',
              }}
            >
              <LayoutDashboard className="w-7 h-7" style={{ color: '#ffffff' }} />
            </div>
            <div>
              <h1
                className="text-4xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-1px',
                }}
              >
                System Overview
              </h1>
              <p className="text-gray-600 mt-2" style={{ color: 'var(--neu-text-secondary)', fontSize: '0.95rem', fontWeight: '500' }}>
                AI-Driven Education · Real-time Insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Time Range Selector */}
            <div
              className="flex rounded-lg p-1"
              style={{
                background: 'var(--neu-card-bg)',
                boxShadow: 'inset 6px 6px 12px var(--neu-shadow-inset-dark), inset -6px -6px 12px var(--neu-shadow-inset-light)',
                border: '1px solid var(--neu-border)',
              }}
            >
              {(['today', 'week', 'month'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => handleTimeRangeChange(range)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    timeRange === range ? 'neu-button-primary' : ''
                  }`}
                  style={{
                    ...(timeRange === range
                      ? {
                          background: 'var(--neu-button-primary-bg)',
                          color: '#ffffff',
                          boxShadow: '6px 6px 12px rgba(102, 126, 234, 0.4), -4px -4px 8px var(--neu-shadow-light)',
                        }
                      : {
                          background: 'transparent',
                          color: 'var(--neu-text-secondary)',
                        }
                    ),
                    border: 'none',
                    borderRadius: '12px',
                  }}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>

            {/* Auto Refresh Toggle */}
            <NeuButton
              onClick={handleAutoRefreshToggle}
              variant={autoRefresh ? 'success' : 'default'}
              size="sm"
            >
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">
                  {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
                </span>
              </div>
            </NeuButton>

            {/* Manual Refresh Button */}
            <NeuButton onClick={handleManualRefresh} size="sm" variant="default">
              <RefreshCw className="w-4 h-4" />
            </NeuButton>

            {mounted && (
              <div className="text-xs" style={{ color: 'var(--neu-text-muted)' }}>
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiData.map((kpi, index) => {
          const gradientColors = [
            { from: '#3b82f6', to: '#2563eb' },
            { from: '#22c55e', to: '#16a34a' },
            { from: '#f97316', to: '#ea580c' },
            { from: '#ef4444', to: '#dc2626' },
          ];
          return (
            <NeuStatBox
              key={index}
              label={kpi.label}
              value={kpi.value}
              icon={kpi.icon}
              trend={kpi.trend}
              change={kpi.change}
              color={kpi.color}
              gradientFrom={gradientColors[index]?.from || '#667eea'}
              gradientTo={gradientColors[index]?.to || '#764ba2'}
            />
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* AI Insights - Takes 2 columns */}
        <div className="lg:col-span-2" style={{ background: 'var(--neu-card-bg)', borderRadius: '24px', padding: '24px', boxShadow: '10px 10px 20px var(--neu-shadow-dark), -10px -10px 20px var(--neu-shadow-light), inset 1px 1px 2px var(--neu-shadow-inset-dark)', border: '1px solid var(--neu-border)' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)',
                  boxShadow: '6px 6px 12px rgba(102, 126, 234, 0.4), -4px -4px 8px var(--neu-shadow-light), inset 2px 2px 4px rgba(0, 0, 0, 0.1)',
                }}
              >
                <Brain className="w-6 h-6" style={{ color: '#ffffff' }} />
              </div>
              <div>
                <h2
                  className="text-xl font-bold"
                  style={{
                    background: 'linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  AI Insights
                </h2>
                <p className="text-sm" style={{ color: 'var(--neu-text-muted)', fontSize: '0.85rem' }}>Top 3 insights today</p>
              </div>
            </div>
            <button
              onClick={handleViewAllInsights}
              className="text-sm font-medium flex items-center gap-1"
              style={{
                color: 'var(--neu-accent-primary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {aiInsights.map((insight) => {
              const priorityColors = getPriorityColor(insight.priority);
              return (
                <div
                  key={insight.id}
                  className="border rounded-lg p-4"
                  style={{
                    background: priorityColors.bg,
                    borderColor: priorityColors.border,
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: 'inset 3px 3px 6px var(--neu-shadow-inset-dark), inset -3px -3px 6px var(--neu-shadow-inset-light)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getTypeIcon(insight.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold" style={{ color: 'var(--neu-text-primary)' }}>{insight.title}</h3>
                        <NeuBadge variant={insight.priority === 'high' ? 'danger' : insight.priority === 'medium' ? 'warning' : 'info'}>
                          {insight.affectedCount} affected
                        </NeuBadge>
                      </div>
                      <p className="text-sm mb-3" style={{ color: 'var(--neu-text-secondary)' }}>{insight.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--neu-text-secondary)' }}>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" style={{ color: 'var(--neu-accent-success)' }} />
                            {Math.round(insight.confidence * 100)}% confidence
                          </span>
                          <span>{insight.timestamp}</span>
                        </div>
                        <NeuButton
                          onClick={() => handleInsightAction(insight)}
                          size="sm"
                          variant="primary"
                        >
                          {insight.action}
                        </NeuButton>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="mt-6 p-4 rounded-lg border"
            style={{
              background: 'linear-gradient(135deg, rgba(66, 153, 225, 0.1) 0%, rgba(129, 140, 248, 0.1) 100%)',
              borderColor: 'rgba(66, 153, 225, 0.3)',
              borderRadius: '16px',
              padding: '16px',
            }}
          >
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5" style={{ color: 'var(--neu-accent-primary)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--neu-text-primary)' }}>Why am I seeing this?</p>
                <p className="text-xs mt-1" style={{ color: 'var(--neu-text-secondary)' }}>
                  AI analyzes student behavior, XP trends, and emotion patterns to surface actionable insights.
                  Click any insight for detailed explainability.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* XP Growth Chart */}
        <div style={{ background: 'var(--neu-card-bg)', borderRadius: '24px', padding: '24px', boxShadow: '10px 10px 20px var(--neu-shadow-dark), -10px -10px 20px var(--neu-shadow-light), inset 1px 1px 2px var(--neu-shadow-inset-dark)', border: '1px solid var(--neu-border)' }}>
          <h3
            className="text-lg font-bold mb-4"
            style={{
              background: 'linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            XP Growth
          </h3>
          <div className="space-y-3">
            {xpGrowthData.map((data, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-sm" style={{ color: 'var(--neu-text-secondary)', width: '48px' }}>{data.date}</span>
                <div className="flex-1" style={{ background: 'var(--neu-bg-secondary)', borderRadius: '12px', height: '24px', overflow: 'hidden', boxShadow: 'inset 3px 3px 6px var(--neu-shadow-inset-dark), inset -3px -3px 6px var(--neu-shadow-inset-light)' }}>
                  <div
                    className="h-full rounded-full flex items-center justify-end px-2"
                    style={{
                      width: `${(data.avgXP / 1300) * 100}%`,
                      background: 'linear-gradient(90deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)',
                      borderRadius: '12px',
                    }}
                  >
                    <span className="text-xs font-medium" style={{ color: '#ffffff' }}>{data.avgXP}</span>
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
        <div style={{ background: 'var(--neu-card-bg)', borderRadius: '24px', padding: '24px', boxShadow: '10px 10px 20px var(--neu-shadow-dark), -10px -10px 20px var(--neu-shadow-light), inset 1px 1px 2px var(--neu-shadow-inset-dark)', border: '1px solid var(--neu-border)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div
              className="flex items-center justify-center"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                boxShadow: '6px 6px 12px rgba(236, 72, 153, 0.4), -4px -4px 8px var(--neu-shadow-light), inset 2px 2px 4px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Heart className="w-6 h-6" style={{ color: '#ffffff' }} />
            </div>
            <div>
              <h3
                className="text-lg font-bold"
                style={{
                  background: 'linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Emotion Distribution
              </h3>
              <p className="text-sm" style={{ color: 'var(--neu-text-muted)', fontSize: '0.85rem' }}>Real-time student emotions</p>
            </div>
          </div>
          <div className="space-y-3">
            {emotionData.map((emotion, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium" style={{ color: 'var(--neu-text-primary)' }}>{emotion.emotion}</span>
                  <span style={{ color: 'var(--neu-text-secondary)' }}>{emotion.value}%</span>
                </div>
                <div className="w-full" style={{ background: 'var(--neu-bg-secondary)', borderRadius: '8px', height: '12px', boxShadow: 'inset 2px 2px 4px var(--neu-shadow-inset-dark), inset -2px -2px 4px var(--neu-shadow-inset-light)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${emotion.value}%`,
                      background: emotion.color,
                      borderRadius: '8px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Teacher Response Time */}
        <div style={{ background: 'var(--neu-card-bg)', borderRadius: '24px', padding: '24px', boxShadow: '10px 10px 20px var(--neu-shadow-dark), -10px -10px 20px var(--neu-shadow-light), inset 1px 1px 2px var(--neu-shadow-inset-dark)', border: '1px solid var(--neu-border)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div
              className="flex items-center justify-center"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                boxShadow: '6px 6px 12px rgba(34, 197, 94, 0.4), -4px -4px 8px var(--neu-shadow-light), inset 2px 2px 4px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Clock className="w-6 h-6" style={{ color: '#ffffff' }} />
            </div>
            <div>
              <h3
                className="text-lg font-bold"
                style={{
                  background: 'linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Teacher Response Time
              </h3>
              <p className="text-sm" style={{ color: 'var(--neu-text-muted)', fontSize: '0.85rem' }}>Avg hours to respond</p>
            </div>
          </div>
          <div className="space-y-4">
            {teacherResponse.map((teacher, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                      color: '#ffffff',
                      boxShadow: '4px 4px 8px rgba(96, 165, 250, 0.4), -4px -4px 8px var(--neu-shadow-light)',
                    }}
                  >
                    {teacher.teacher.split(' ')[1].charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--neu-text-primary)' }}>{teacher.teacher}</p>
                    <p className="text-xs" style={{ color: 'var(--neu-text-muted)' }}>{teacher.interventions} interventions</p>
                  </div>
                </div>
                <NeuBadge
                  variant={teacher.time < 3 ? 'success' : teacher.time < 5 ? 'warning' : 'danger'}
                >
                  {teacher.time}h
                </NeuBadge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
