'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import '@/styles/neumorphic-theme.css';
import {
  Search, Filter, Users, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, Clock, Brain, Heart, Zap,
  Eye, MessageSquare, ChevronRight, Activity, Award, Target
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  class: string;
  currentXP: number;
  xpChange: number;
  masteryPercentage: number;
  emotionScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastActive: string;
  avatar: string;
}

interface TimelineEvent {
  id: string;
  type: 'quiz' | 'login' | 'emotion_spike' | 'intervention' | 'achievement';
  title: string;
  timestamp: string;
  details?: string;
  xpGained?: number;
  emotionChange?: { from: string; to: string };
}

interface PLGSkill {
  name: string;
  mastery: number;
  status: 'mastered' | 'learning' | 'review' | 'struggling';
  nextReview?: string;
  predictedGain?: number;
}

interface AISuggestion {
  id: string;
  type: 'alert' | 'suggestion' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  action: string;
}

// Neumorphic Card Component
const NeuCard = ({ children, className = '', hover = true }: { children: React.ReactNode; className?: string; hover?: boolean }) => (
  <div
    className={`neu-bento-item ${hover ? 'neu-bento-item' : ''} ${className}`}
    style={{
      background: 'var(--neu-card-bg)',
      borderRadius: '20px',
      padding: '20px',
      boxShadow: '10px 10px 20px var(--neu-shadow-dark), -10px -10px 20px var(--neu-shadow-light), inset 1px 1px 2px var(--neu-shadow-inset-dark)',
      border: '1px solid var(--neu-border)',
      transition: 'all 0.3s ease'
    }}
  >
    {children}
  </div>
);

// Neumorphic Badge Component
const NeuBadge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' }) => {
  const variantStyles = {
    default: { background: 'var(--neu-card-bg)', color: 'var(--neu-text-primary)' },
    success: { background: 'rgba(72, 187, 120, 0.15)', color: 'var(--neu-accent-success)' },
    danger: { background: 'rgba(245, 101, 101, 0.15)', color: 'var(--neu-accent-danger)' },
    warning: { background: 'rgba(237, 137, 54, 0.15)', color: 'var(--neu-accent-warning)' },
    info: { background: 'rgba(66, 153, 225, 0.15)', color: 'var(--neu-accent-info)' }
  };

  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-semibold"
      style={{
        ...variantStyles[variant],
        boxShadow: '2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light)',
        border: '1px solid var(--neu-border)'
      }}
    >
      {children}
    </span>
  );
};

// Neumorphic Button Component
const NeuButton = ({
  children,
  onClick,
  variant = 'default',
  className = '',
  size = 'md'
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'success' | 'danger';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizeStyles = {
    sm: { padding: '10px 18px', fontSize: '0.8rem' },
    md: { padding: '14px 28px', fontSize: '0.9rem' },
    lg: { padding: '18px 36px', fontSize: '1rem' }
  };

  const variantBg = {
    default: 'var(--neu-button-bg)',
    primary: 'var(--neu-button-primary-bg)',
    success: 'var(--neu-button-success-bg)',
    danger: 'var(--neu-button-danger-bg)'
  };

  return (
    <button
      onClick={onClick}
      className={`neu-button ${variant === 'primary' ? 'neu-button-primary' : ''} ${className}`}
      style={{
        background: variantBg[variant],
        borderRadius: '16px',
        ...sizeStyles[size],
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: variant === 'primary'
          ? '8px 8px 16px rgba(102, 126, 234, 0.4), -6px -6px 12px var(--neu-shadow-light), inset 2px 2px 4px rgba(0, 0, 0, 0.1)'
          : '8px 8px 16px var(--neu-shadow-dark), -8px -8px 16px var(--neu-shadow-light), inset 1px 1px 2px var(--neu-shadow-inset-dark)',
        border: '1px solid var(--neu-border)',
        color: variant === 'primary' ? 'var(--neu-text-inverse)' : 'var(--neu-text-primary)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = variant === 'primary'
          ? '10px 10px 20px rgba(102, 126, 234, 0.5), -8px -8px 16px var(--neu-shadow-light)'
          : '10px 10px 20px var(--neu-shadow-dark), -10px -10px 20px var(--neu-shadow-light)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = variant === 'primary'
          ? '8px 8px 16px rgba(102, 126, 234, 0.4), -6px -6px 12px var(--neu-shadow-light), inset 2px 2px 4px rgba(0, 0, 0, 0.1)'
          : '8px 8px 16px var(--neu-shadow-dark), -8px -8px 16px var(--neu-shadow-light), inset 1px 1px 2px var(--neu-shadow-inset-dark)';
      }}
    >
      {children}
    </button>
  );
};

// Neumorphic StatBox Component
const NeuStatBox = ({
  label,
  value,
  subValue,
  icon: Icon,
  iconColor
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  iconColor: string;
}) => (
  <NeuCard>
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm" style={{ color: 'var(--neu-text-secondary)', fontWeight: '500' }}>{label}</span>
      <Icon className="w-5 h-5" style={{ color: iconColor }} />
    </div>
    <p className="text-2xl font-bold" style={{ color: 'var(--neu-text-primary)' }}>{value}</p>
    {subValue && (
      <p className="text-sm mt-1" style={{ color: 'var(--neu-accent-success)', fontWeight: '600' }}>{subValue}</p>
    )}
  </NeuCard>
);

export default function AdminStudentsPage() {
  const { t } = useLanguage();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentDetail, setStudentDetail] = useState<any>(null);

  // Fetch students from API
  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        class: selectedClass,
        risk: selectedRisk
      });

      const response = await fetch(`/api/admin/students?${params}`);
      if (!response.ok) throw new Error('Failed to fetch students');

      const data = await response.json();
      console.log('✅ [Admin Students] Fetched:', data.students.length, 'students');
      setStudents(data.students);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ [Admin Students] Error:', error);
      setIsLoading(false);
    }
  };

  // Fetch student detail
  const fetchStudentDetail = async (studentId: string) => {
    try {
      const response = await fetch(`/api/admin/students/${studentId}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = (data as { error?: string })?.error || data?.message || response.statusText || 'Failed to fetch student detail';
        throw new Error(`${response.status === 404 ? 'Student not found' : message}`);
      }
      console.log('✅ [Admin Students] Detail fetched for:', data.student?.name);
      setStudentDetail(data);
    } catch (error) {
      console.error('❌ [Admin Students] Error fetching detail:', error);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedClass, selectedRisk]);

  // Mock timeline for selected student
  const mockTimeline: TimelineEvent[] = [
    {
      id: '1',
      type: 'quiz',
      title: 'Completed Algebra Quiz',
      timestamp: '2 hours ago',
      details: 'Score: 85% • Time: 15 minutes',
      xpGained: 120
    },
    {
      id: '2',
      type: 'emotion_spike',
      title: 'Emotion Change Detected',
      timestamp: '5 hours ago',
      emotionChange: { from: 'Confused', to: t('emotion.focused') }
    },
    {
      id: '3',
      type: 'achievement',
      title: 'Unlocked: Problem Solver',
      timestamp: '1 day ago',
      details: 'Solved 10 challenging problems in a row',
      xpGained: 250
    },
    {
      id: '4',
      type: 'intervention',
      title: 'Teacher Check-in',
      timestamp: '2 days ago',
      details: 'Ms. Sarah provided personalized feedback'
    },
    {
      id: '5',
      type: 'login',
      title: 'Started Learning Session',
      timestamp: '2 days ago'
    }
  ];

  // Mock PLG skills
  const mockPLGSkills: PLGSkill[] = [
    { name: 'Linear Equations', mastery: 0.92, status: 'mastered', nextReview: '5 days' },
    { name: 'Quadratic Functions', mastery: 0.75, status: 'learning', predictedGain: 0.15 },
    { name: 'Trigonometry', mastery: 0.45, status: 'struggling', predictedGain: 0.08 },
    { name: 'Calculus Basics', mastery: 0.68, status: 'learning', predictedGain: 0.12 },
    { name: t('dashboard.stats'), mastery: 0.88, status: 'mastered', nextReview: '3 days' },
    { name: 'Geometry', mastery: 0.52, status: 'review', nextReview: 'today' }
  ];

  // Mock AI suggestions
  const mockAISuggestions: AISuggestion[] = [
    {
      id: '1',
      type: 'alert',
      title: 'Low Engagement Alert',
      description: 'Student hasn\'t logged in for 3 consecutive days. Consider sending a check-in message.',
      confidence: 0.87,
      action: 'Send Message'
    },
    {
      id: '2',
      type: 'suggestion',
      title: 'Recommend Reteach Module',
      description: 'Trigonometry mastery is below 50%. A targeted review module could help.',
      confidence: 0.82,
      action: 'Assign Module'
    },
    {
      id: '3',
      type: 'opportunity',
      title: 'Ready for Advancement',
      description: 'Student shows high consistency in Linear Equations. Consider advancing to next topic.',
      confidence: 0.91,
      action: 'Adjust Path'
    }
  ];

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'warning';
      default: return 'success';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mastered': return 'var(--neu-accent-success)';
      case 'learning': return 'var(--neu-accent-info)';
      case 'review': return 'var(--neu-accent-warning)';
      case 'struggling': return 'var(--neu-accent-danger)';
      default: return 'var(--neu-text-muted)';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'quiz': return { icon: Award, color: 'var(--neu-accent-info)' };
      case 'login': return { icon: Activity, color: 'var(--neu-accent-success)' };
      case 'emotion_spike': return { icon: Heart, color: 'var(--neu-accent-danger)' };
      case 'intervention': return { icon: MessageSquare, color: 'var(--neu-accent-primary)' };
      case 'achievement': return { icon: Zap, color: 'var(--neu-accent-warning)' };
      default: return { icon: CheckCircle, color: 'var(--neu-text-muted)' };
    }
  };

  const getAIBgColor = (type: string) => {
    switch (type) {
      case 'alert': return 'rgba(245, 101, 101, 0.1)';
      case 'suggestion': return 'rgba(66, 153, 225, 0.1)';
      case 'opportunity': return 'rgba(72, 187, 120, 0.1)';
      default: return 'var(--neu-card-bg)';
    }
  };

  const getAIBorderColor = (type: string) => {
    switch (type) {
      case 'alert': return 'rgba(245, 101, 101, 0.3)';
      case 'suggestion': return 'rgba(66, 153, 225, 0.3)';
      case 'opportunity': return 'rgba(72, 187, 120, 0.3)';
      default: return 'var(--neu-border)';
    }
  };

  const handleViewStudent = async (student: Student) => {
    console.log('👀 [Admin Students] Viewing student:', student.name);
    setSelectedStudent(student);
    setViewMode('detail');
    await fetchStudentDetail(student.id);
  };

  if (viewMode === 'detail' && selectedStudent) {
    return (
      <div className="neumorphic-theme" style={{ padding: '30px' }}>
        {/* Header */}
        <div className="mb-8" style={{ animation: 'fadeIn 0.8s ease-out' }}>
          <NeuButton
            onClick={() => setViewMode('list')}
            variant="default"
            size="sm"
            className="mb-6"
          >
            ← Back to Students
          </NeuButton>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-5">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)',
                  boxShadow: '8px 8px 16px var(--neu-shadow-dark), -8px -8px 16px var(--neu-shadow-light), inset 2px 2px 4px rgba(0, 0, 0, 0.1)'
                }}
              >
                {selectedStudent.avatar}
              </div>
              <div>
                <h1
                  className="text-3xl font-bold mb-1"
                  style={{
                    background: 'linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  {selectedStudent.name}
                </h1>
                <p className="text-gray-600" style={{ color: 'var(--neu-text-secondary)' }}>{selectedStudent.email}</p>
                <div className="flex items-center gap-3 mt-2">
                  <NeuBadge variant="info">Class {selectedStudent.class}</NeuBadge>
                  <NeuBadge variant={getRiskColor(selectedStudent.riskLevel) as any}>
                    {selectedStudent.riskLevel.toUpperCase()} Risk
                  </NeuBadge>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <NeuButton variant="default" size="sm">
                <MessageSquare className="w-4 h-4" style={{ marginRight: '8px' }} />
                Chat
              </NeuButton>
              <NeuButton variant="primary" size="sm">
                <Target className="w-4 h-4" style={{ marginRight: '8px' }} />
                Adjust Path
              </NeuButton>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <NeuStatBox
            label="Current XP"
            value={selectedStudent.currentXP}
            subValue={`+${selectedStudent.xpChange}%`}
            icon={TrendingUp}
            iconColor="var(--neu-accent-success)"
          />
          <NeuStatBox
            label="Mastery"
            value={`${selectedStudent.masteryPercentage}%`}
            icon={Award}
            iconColor="var(--neu-accent-info)"
          />
          <NeuStatBox
            label="Emotion Score"
            value={`${selectedStudent.emotionScore}/10`}
            icon={Heart}
            iconColor="var(--neu-accent-danger)"
          />
          <NeuStatBox
            label="Last Active"
            value={selectedStudent.lastActive}
            icon={Clock}
            iconColor="var(--neu-text-secondary)"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: PLG Skills + Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* PLG Skills Mini-Map */}
            <NeuCard>
              <h2
                className="text-xl font-bold mb-6 flex items-center gap-3"
                style={{ color: 'var(--neu-text-primary)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)',
                    boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)'
                  }}
                >
                  <Brain className="w-5 h-5 text-white" />
                </div>
                Personal Learning Graph
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(studentDetail?.plgSkills || mockPLGSkills).map((skill: any, idx: number) => (
                  <div
                    key={idx}
                    className="neu-status-item"
                    style={{
                      background: 'var(--neu-card-bg)',
                      borderRadius: '14px',
                      padding: '16px',
                      boxShadow: 'inset 4px 4px 8px var(--neu-shadow-inset-dark), inset -4px -4px 8px var(--neu-shadow-inset-light)',
                      border: '1px solid var(--neu-border)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--neu-border-hover)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--neu-border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: 'var(--neu-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                      >
                        {skill.name}
                      </span>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          background: getStatusColor(skill.status),
                          boxShadow: '2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light)'
                        }}
                      />
                    </div>
                    <div className="mb-3">
                      <div
                        className="w-full rounded-full h-2.5"
                        style={{
                          background: 'var(--neu-bg-secondary)',
                          boxShadow: 'inset 2px 2px 4px var(--neu-shadow-inset-dark), inset -2px -2px 4px var(--neu-shadow-inset-light)'
                        }}
                      >
                        <div
                          className="h-2.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${skill.mastery * 100}%`,
                            background: 'linear-gradient(90deg, var(--neu-accent-info) 0%, var(--neu-accent-primary) 100%)',
                            boxShadow: '2px 2px 4px var(--neu-shadow-dark)'
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--neu-text-secondary)', fontWeight: '500' }}>
                      {skill.predictedGain ? (
                        <span style={{ color: 'var(--neu-accent-success)', fontWeight: '600' }}>
                          +{Math.round(skill.predictedGain * 100)}% gain predicted
                        </span>
                      ) : skill.nextReview ? (
                        <span>Review in {skill.nextReview}</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </NeuCard>

            {/* Timeline */}
            <NeuCard>
              <h2
                className="text-xl font-bold mb-6 flex items-center gap-3"
                style={{ color: 'var(--neu-text-primary)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, var(--neu-accent-info) 0%, var(--neu-accent-primary) 100%)',
                    boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)'
                  }}
                >
                  <Activity className="w-5 h-5 text-white" />
                </div>
                Activity Timeline
              </h2>
              <div className="space-y-4">
                {(studentDetail?.timeline || mockTimeline).map((event: any) => {
                  const EventIcon = getEventIcon(event.type).icon;
                  const iconColor = getEventIcon(event.type).color;

                  return (
                    <div
                      key={event.id}
                      className="flex gap-4 pb-4 last:pb-0"
                      style={{
                        borderLeft: '3px solid var(--neu-border)',
                        paddingLeft: '16px'
                      }}
                    >
                      <div
                        className="mt-1 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'var(--neu-card-bg)',
                          boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
                          border: '1px solid var(--neu-border)'
                        }}
                      >
                        <EventIcon className="w-5 h-5" style={{ color: iconColor }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <h3
                            className="font-bold"
                            style={{ color: 'var(--neu-text-primary)', fontSize: '0.95rem' }}
                          >
                            {event.title}
                          </h3>
                          <span
                            className="text-xs"
                            style={{ color: 'var(--neu-text-muted)', fontWeight: '500' }}
                          >
                            {event.timestamp}
                          </span>
                        </div>
                        {event.details && (
                          <p
                            className="text-sm mt-1"
                            style={{ color: 'var(--neu-text-secondary)', lineHeight: '1.5' }}
                          >
                            {event.details}
                          </p>
                        )}
                        {event.xpGained && (
                          <span
                            className="inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-lg"
                            style={{
                              background: 'rgba(72, 187, 120, 0.15)',
                              color: 'var(--neu-accent-success)',
                              boxShadow: '2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light)',
                              border: '1px solid rgba(72, 187, 120, 0.3)'
                            }}
                          >
                            +{event.xpGained} XP
                          </span>
                        )}
                        {event.emotionChange && (
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <span style={{ color: 'var(--neu-text-secondary)' }}>{event.emotionChange.from}</span>
                            <ChevronRight className="w-4 h-4" style={{ color: 'var(--neu-text-muted)' }} />
                            <span
                              className="font-semibold"
                              style={{ color: 'var(--neu-accent-info)' }}
                            >
                              {event.emotionChange.to}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </NeuCard>
          </div>

          {/* Right: AI Suggestions */}
          <NeuCard>
            <h2
              className="text-xl font-bold mb-6 flex items-center gap-3"
              style={{ color: 'var(--neu-text-primary)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, var(--neu-accent-warning) 0%, #f56565 100%)',
                  boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)'
                }}
              >
                <Zap className="w-5 h-5 text-white" />
              </div>
              AI Suggestions
            </h2>
            <div className="space-y-4">
              {(studentDetail?.aiSuggestions || mockAISuggestions).map((suggestion: any) => {
                const icon =
                  suggestion.type === 'alert' ? <AlertTriangle className="w-5 h-5" style={{ color: 'var(--neu-accent-danger)' }} /> :
                  suggestion.type === 'suggestion' ? <Brain className="w-5 h-5" style={{ color: 'var(--neu-accent-info)' }} /> :
                  <Zap className="w-5 h-5" style={{ color: 'var(--neu-accent-success)' }} />;

                return (
                  <div
                    key={suggestion.id}
                    className="border rounded-xl p-4 transition-all"
                    style={{
                      background: getAIBgColor(suggestion.type),
                      borderColor: getAIBorderColor(suggestion.type),
                      boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
                      borderRadius: '14px'
                    }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'var(--neu-card-bg)',
                          boxShadow: '3px 3px 6px var(--neu-shadow-dark), -3px -3px 6px var(--neu-shadow-light)'
                        }}
                      >
                        {icon}
                      </div>
                      <div className="flex-1">
                        <h3
                          className="font-bold text-sm mb-1"
                          style={{ color: 'var(--neu-text-primary)' }}
                        >
                          {suggestion.title}
                        </h3>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--neu-text-secondary)', lineHeight: '1.4' }}
                        >
                          {suggestion.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: 'var(--neu-text-muted)' }}
                      >
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </span>
                      <button
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: 'var(--neu-button-bg)',
                          color: 'var(--neu-accent-primary)',
                          boxShadow: '3px 3px 6px var(--neu-shadow-dark), -3px -3px 6px var(--neu-shadow-light)',
                          border: '1px solid var(--neu-border)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '3px 3px 6px var(--neu-shadow-dark), -3px -3px 6px var(--neu-shadow-light)';
                        }}
                      >
                        {suggestion.action}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className="mt-6 p-4 rounded-xl border"
              style={{
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                borderColor: 'rgba(102, 126, 234, 0.3)',
                boxShadow: 'inset 3px 3px 6px var(--neu-shadow-inset-dark), inset -3px -3px 6px var(--neu-shadow-inset-light)'
              }}
            >
              <p className="text-xs" style={{ color: 'var(--neu-text-secondary)', lineHeight: '1.5' }}>
                <strong style={{ color: 'var(--neu-accent-primary)', fontWeight: '700' }}>💡 AI Tip:</strong> These suggestions are generated in real-time based on PLG, XP, and emotion data. Click &quot;Apply&quot; to execute automatically.
              </p>
            </div>
          </NeuCard>
        </div>
      </div>
    );
  }

  return (
    <div className="neumorphic-theme" style={{ padding: '30px' }}>
      {/* Header */}
      <div className="neu-header mb-10">
        <h1
          className="text-4xl font-bold mb-2"
          style={{
            background: 'linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-1px'
          }}
        >
          <Users className="w-10 h-10 inline-block mr-3" style={{ verticalAlign: 'middle' }} />
          Student Insights Hub
        </h1>
        <p className="text-gray-600" style={{ color: 'var(--neu-text-secondary)', fontWeight: '500' }}>
          Track student behavior, emotions, and progress in real-time
        </p>
      </div>

      {/* Filters */}
      <NeuCard className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
              style={{ color: 'var(--neu-text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neu-input w-full pl-12 pr-4 py-3"
              style={{
                background: 'var(--neu-input-bg)',
                borderRadius: '16px',
                border: '1px solid var(--neu-border)',
                boxShadow: 'inset 6px 6px 12px var(--neu-shadow-inset-dark), inset -6px -6px 12px var(--neu-shadow-inset-light)',
                color: 'var(--neu-text-primary)',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = 'inset 8px 8px 16px var(--neu-shadow-inset-dark), inset -8px -8px 16px var(--neu-shadow-inset-light), 0 0 0 3px var(--neu-input-focus-ring)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = 'inset 6px 6px 12px var(--neu-shadow-inset-dark), inset -6px -6px 12px var(--neu-shadow-inset-light)';
              }}
            />
          </div>

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="neu-input px-4 py-3"
            style={{
              background: 'var(--neu-input-bg)',
              borderRadius: '16px',
              border: '1px solid var(--neu-border)',
              boxShadow: 'inset 6px 6px 12px var(--neu-shadow-inset-dark), inset -6px -6px 12px var(--neu-shadow-inset-light)',
              color: 'var(--neu-text-primary)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            <option value="all">All Classes</option>
            <option value="10A">Class 10A</option>
            <option value="10B">Class 10B</option>
            <option value="10C">Class 10C</option>
          </select>

          {/* Risk Filter */}
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="neu-input px-4 py-3"
            style={{
              background: 'var(--neu-input-bg)',
              borderRadius: '16px',
              border: '1px solid var(--neu-border)',
              boxShadow: 'inset 6px 6px 12px var(--neu-shadow-inset-dark), inset -6px -6px 12px var(--neu-shadow-inset-light)',
              color: 'var(--neu-text-primary)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </NeuCard>

      {/* Loading State */}
      {isLoading && (
        <NeuCard>
          <div className="text-center py-12">
            <div
              className="animate-spin rounded-full h-16 w-16 mx-auto mb-4"
              style={{
                background: 'linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)',
                borderBottom: '3px solid transparent'
              }}
            />
            <p className="text-gray-600" style={{ color: 'var(--neu-text-secondary)', fontWeight: '500' }}>
              Loading students...
            </p>
          </div>
        </NeuCard>
      )}

      {/* Students Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-4">
          {students.map((student) => (
            <NeuCard key={student.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div
                    className="w-18 h-18 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                    style={{
                      background: 'linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)',
                      boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light), inset 2px 2px 4px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {student.avatar}
                  </div>

                  <div>
                    <h3
                      className="text-lg font-bold mb-1"
                      style={{ color: 'var(--neu-text-primary)' }}
                    >
                      {student.name}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--neu-text-secondary)' }}>{student.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <NeuBadge variant="info">{student.class}</NeuBadge>
                      <NeuBadge variant={getRiskColor(student.riskLevel) as any}>
                        {student.riskLevel.toUpperCase()}
                      </NeuBadge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-10">
                  {/* XP */}
                  <div className="text-center">
                    <p className="text-sm mb-1" style={{ color: 'var(--neu-text-secondary)', fontWeight: '500' }}>XP</p>
                    <p className="text-xl font-bold" style={{ color: 'var(--neu-text-primary)' }}>{student.currentXP}</p>
                    <div className="flex items-center gap-1 text-sm mt-1">
                      {student.xpChange > 0 ? (
                        <TrendingUp className="w-4 h-4" style={{ color: 'var(--neu-accent-success)' }} />
                      ) : student.xpChange < 0 ? (
                        <TrendingDown className="w-4 h-4" style={{ color: 'var(--neu-accent-danger)' }} />
                      ) : (
                        <Minus className="w-4 h-4" style={{ color: 'var(--neu-text-muted)' }} />
                      )}
                      <span
                        className="font-semibold"
                        style={{
                          color: student.xpChange > 0 ? 'var(--neu-accent-success)' : student.xpChange < 0 ? 'var(--neu-accent-danger)' : 'var(--neu-text-secondary)'
                        }}
                      >
                        {student.xpChange > 0 ? '+' : ''}{student.xpChange}%
                      </span>
                    </div>
                  </div>

                  {/* Mastery */}
                  <div className="text-center">
                    <p className="text-sm mb-1" style={{ color: 'var(--neu-text-secondary)', fontWeight: '500' }}>Mastery</p>
                    <div className="relative w-18 h-18 mx-auto">
                      <svg className="transform -rotate-90 w-18 h-18">
                        <circle
                          cx="36"
                          cy="36"
                          r="30"
                          stroke="var(--neu-bg-secondary)"
                          strokeWidth="5"
                          fill="none"
                          style={{
                            boxShadow: 'inset 2px 2px 4px var(--neu-shadow-inset-dark), inset -2px -2px 4px var(--neu-shadow-inset-light)'
                          }}
                        />
                        <circle
                          cx="36"
                          cy="36"
                          r="30"
                          stroke="url(#gradient)"
                          strokeWidth="5"
                          fill="none"
                          strokeDasharray={`${student.masteryPercentage * 1.88} 188`}
                          strokeLinecap="round"
                          style={{
                            filter: 'drop-shadow(2px 2px 3px var(--neu-shadow-dark))'
                          }}
                        />
                        <defs>
                          <linearGradient id="gradient">
                            <stop offset="0%" stopColor="var(--neu-accent-info)" />
                            <stop offset="100%" stopColor="var(--neu-accent-primary)" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <span
                        className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                        style={{ color: 'var(--neu-text-primary)' }}
                      >
                        {student.masteryPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Emotion */}
                  <div className="text-center">
                    <p className="text-sm mb-1" style={{ color: 'var(--neu-text-secondary)', fontWeight: '500' }}>Emotion</p>
                    <div className="flex items-center gap-2 justify-center">
                      <Heart className="w-5 h-5" style={{ color: 'var(--neu-accent-danger)' }} />
                      <p className="text-xl font-bold" style={{ color: 'var(--neu-text-primary)' }}>{student.emotionScore}</p>
                      <span className="text-sm" style={{ color: 'var(--neu-text-secondary)' }}>/10</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <NeuButton
                      onClick={() => handleViewStudent(student)}
                      variant="primary"
                      size="sm"
                    >
                      <Eye className="w-4 h-4" style={{ marginRight: '8px' }} />
                      View Details
                    </NeuButton>
                    <NeuButton
                      variant="default"
                      size="sm"
                    >
                      <MessageSquare className="w-4 h-4" style={{ marginRight: '8px' }} />
                      Chat
                    </NeuButton>
                  </div>
                </div>
              </div>
            </NeuCard>
          ))}
        </div>
      )}

      {!isLoading && students.length === 0 && (
        <NeuCard>
          <div className="text-center py-12">
            <Users
              className="w-16 h-16 mx-auto mb-4"
              style={{ color: 'var(--neu-text-muted)' }}
            />
            <h3
              className="text-xl font-bold mb-2"
              style={{ color: 'var(--neu-text-primary)' }}
            >
              No students found
            </h3>
            <p className="text-gray-600" style={{ color: 'var(--neu-text-secondary)', fontWeight: '500' }}>
              Try adjusting your filters or search term
            </p>
          </div>
        </NeuCard>
      )}
    </div>
  );
}
