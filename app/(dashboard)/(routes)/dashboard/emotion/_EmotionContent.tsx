'use client';

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, TrendingUp, Calendar, Smile, Frown, Meh, Zap, Target, Users, Eye, Activity, MapPin, Brain, Camera, Focus } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { EMOTION_CONFIG, EmotionType } from '../vision-tracker/advanced-emotion-recognition';

export default function EmotionTrackerPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedStudent, setDraggedStudent] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [students, setStudents] = useState([
    // Dòng 1 (gần bảng nhất) - 8 học sinh
    { id: 1, name: 'Alice Nguyen', emotion: 'happy', performance: 85, energy: 90, x: 10, y: 10 },
    { id: 2, name: 'Bao Tran', emotion: 'focused', performance: 92, energy: 75, x: 20, y: 10 },
    { id: 3, name: 'Carol Le', emotion: 'stressed', performance: 65, energy: 45, x: 30, y: 10 },
    { id: 4, name: 'Daniel Pham', emotion: 'motivated', performance: 88, energy: 85, x: 40, y: 10 },
    { id: 5, name: 'Emma Vu', emotion: 'happy', performance: 78, energy: 80, x: 50, y: 10 },
    { id: 6, name: 'Frank Do', emotion: 'focused', performance: 95, energy: 70, x: 60, y: 10 },
    { id: 7, name: 'Grace Hoang', emotion: 'stressed', performance: 58, energy: 35, x: 70, y: 10 },
    { id: 8, name: 'Henry Bui', emotion: 'motivated', performance: 82, energy: 88, x: 80, y: 10 },
    
    // Dòng 2 - 8 học sinh
    { id: 9, name: 'Ivy Dang', emotion: 'happy', performance: 76, energy: 65, x: 10, y: 25 },
    { id: 10, name: 'Jack Truong', emotion: 'focused', performance: 89, energy: 72, x: 20, y: 25 },
    { id: 11, name: 'Kelly Huynh', emotion: 'happy', performance: 83, energy: 78, x: 30, y: 25 },
    { id: 12, name: 'Liam Le', emotion: 'motivated', performance: 91, energy: 82, x: 40, y: 25 },
    { id: 13, name: 'Mia Phan', emotion: 'focused', performance: 87, energy: 68, x: 50, y: 25 },
    { id: 14, name: 'Noah Vo', emotion: 'stressed', performance: 62, energy: 42, x: 60, y: 25 },
    { id: 15, name: 'Olivia Doan', emotion: 'happy', performance: 79, energy: 73, x: 70, y: 25 },
    { id: 16, name: 'Peter Dinh', emotion: 'motivated', performance: 86, energy: 79, x: 80, y: 25 },
    
    // Dòng 3 - 8 học sinh
    { id: 17, name: 'Quinn Tran', emotion: 'focused', performance: 93, energy: 76, x: 10, y: 40 },
    { id: 18, name: 'Ryan Nguyen', emotion: 'happy', performance: 81, energy: 71, x: 20, y: 40 },
    { id: 19, name: 'Sophia Pham', emotion: 'stressed', performance: 59, energy: 38, x: 30, y: 40 },
    { id: 20, name: 'Thomas Le', emotion: 'motivated', performance: 84, energy: 77, x: 40, y: 40 },
    { id: 21, name: 'Uyen Ho', emotion: 'happy', performance: 77, energy: 69, x: 50, y: 40 },
    { id: 22, name: 'Victor Bui', emotion: 'focused', performance: 88, energy: 74, x: 60, y: 40 },
    { id: 23, name: 'Wendy Dang', emotion: 'motivated', performance: 90, energy: 81, x: 70, y: 40 },
    { id: 24, name: 'Xuan Truong', emotion: 'happy', performance: 82, energy: 76, x: 80, y: 40 },
    
    // Dòng 4 - 8 học sinh
    { id: 25, name: 'Yen Vo', emotion: 'stressed', performance: 61, energy: 41, x: 10, y: 55 },
    { id: 26, name: 'Zack Doan', emotion: 'focused', performance: 86, energy: 73, x: 20, y: 55 },
    { id: 27, name: 'Amy Tran', emotion: 'happy', performance: 80, energy: 75, x: 30, y: 55 },
    { id: 28, name: 'Brian Nguyen', emotion: 'motivated', performance: 89, energy: 83, x: 40, y: 55 },
    { id: 29, name: 'Chloe Pham', emotion: 'focused', performance: 91, energy: 77, x: 50, y: 55 },
    { id: 30, name: 'David Le', emotion: 'happy', performance: 78, energy: 72, x: 60, y: 55 },
    { id: 31, name: 'Ella Dinh', emotion: 'stressed', performance: 63, energy: 43, x: 70, y: 55 },
    { id: 32, name: 'Felix Ho', emotion: 'motivated', performance: 87, energy: 80, x: 80, y: 55 },
    
    // Dòng 5 (cuối lớp) - 8 học sinh
    { id: 33, name: 'Gina Truong', emotion: 'focused', performance: 85, energy: 71, x: 10, y: 70 },
    { id: 34, name: 'Harry Bui', emotion: 'happy', performance: 81, energy: 74, x: 20, y: 70 },
    { id: 35, name: 'Isabel Do', emotion: 'motivated', performance: 92, energy: 84, x: 30, y: 70 },
    { id: 36, name: 'Jason Nguyen', emotion: 'focused', performance: 84, energy: 70, x: 40, y: 70 },
    { id: 37, name: 'Katie Pham', emotion: 'happy', performance: 79, energy: 73, x: 50, y: 70 },
    { id: 38, name: 'Leo Vo', emotion: 'stressed', performance: 60, energy: 40, x: 60, y: 70 },
    { id: 39, name: 'May Tran', emotion: 'motivated', performance: 88, energy: 82, x: 70, y: 70 },
    { id: 40, name: 'Nick Le', emotion: 'focused', performance: 83, energy: 69, x: 80, y: 70 },
  ]);

  const [currentMood, setCurrentMood] = useState({
    primary: 'Happy & Focused 😊',
    score: 85,
    energy: 80,
    stress: 25,
    motivation: 85,
  });

  const [liveStats, setLiveStats] = useState<any>(null);

  // Demo data for student@example.com
  const emotionTrendDataMock = [
    { date: '18/10', happy: 85, focused: 75, stressed: 30, motivated: 80 },
    { date: '17/10', happy: 70, focused: 80, stressed: 45, motivated: 70 },
    { date: '16/10', happy: 90, focused: 85, stressed: 20, motivated: 90 },
    { date: '15/10', happy: 65, focused: 60, stressed: 50, motivated: 60 },
    { date: '14/10', happy: 80, focused: 75, stressed: 35, motivated: 75 },
    { date: '13/10', happy: 75, focused: 70, stressed: 40, motivated: 70 },
    { date: '12/10', happy: 85, focused: 80, stressed: 25, motivated: 85 },
  ];

  const emotionDistributionMock = [
    { name: 'Happy 😊', value: 45, color: '#10B981' },
    { name: 'Focused 🎯', value: 30, color: '#3B82F6' },
    { name: 'Motivated 🚀', value: 15, color: '#8B5CF6' },
    { name: 'Stressed 😰', value: 10, color: '#EF4444' },
  ];

  const weeklyEngagement = [
    { day: 'Mon', engagement: 85, energy: 75 },
    { day: 'Tue', engagement: 80, energy: 80 },
    { day: 'Wed', engagement: 90, energy: 85 },
    { day: 'Thu', engagement: 70, energy: 65 },
    { day: 'Fri', engagement: 85, energy: 80 },
    { day: 'Sat', engagement: 95, energy: 90 },
    { day: 'Sun', engagement: 88, energy: 85 },
  ];

  const aiInsights = [
    {
      id: 1,
      type: 'positive',
      title: '🎉 Learning Peak Performance',
      description: 'Your best learning time is between 9-11 AM when focus is highest (85%).',
      action: 'Schedule difficult topics during this time.',
    },
    {
      id: 2,
      type: 'warning',
      title: '⚠️ Stress Pattern Detected',
      description: 'Stress levels increase on Thursdays (50% avg). This might be due to quiz schedules.',
      action: 'Consider taking short breaks every 25 minutes on Thursdays.',
    },
    {
      id: 3,
      type: 'success',
      title: '✨ Motivation Streak',
      description: '7-day motivation streak! Average 75% - excellent consistency.',
      action: 'Keep up the great work! Reward yourself this weekend.',
    },
    {
      id: 4,
      type: 'info',
      title: '💡 Study Tip',
      description: 'Your engagement peaks on Saturdays (95%). Perfect for tackling challenging projects.',
      action: 'Plan STEM projects or difficult homework for weekends.',
    },
  ];

  // Fetch real data from the vision tracker
  const fetchLiveStats = useCallback(async () => {
    try {
      const res = await fetch('/api/vision-tracker/emotion/stats?groupBy=hour&limit=24');
      const data = await res.json();
      if (data.success && data.summary) {
        setLiveStats(data);
        
        const dominant = data.summary.dominantEmotion || 'neutral';
        const config = EMOTION_CONFIG[dominant as EmotionType];
        
        setCurrentMood({
          primary: `${config?.labelVi || 'Bình thường'} ${config?.emoji || '😊'}`,
          score: Math.round(data.summary.avgConfidence * 100),
          energy: 82, 
          stress: Math.round((data.summary.emotionDistribution.sad || 0) * 100 / (data.summary.totalSamples || 1)),
          motivation: Math.round((data.summary.emotionDistribution.happy || 0) * 100 / (data.summary.totalSamples || 1)) || 75,
        });

        if (data.summary.totalSamples > 0) {
          const distribution = data.summary.emotionDistribution;
          const emotionsList: string[] = [];
          Object.entries(distribution).forEach(([type, count]) => {
            for (let i = 0; i < Number(count); i++) emotionsList.push(type);
          });
          if (emotionsList.length > 0) {
            setStudents(prev => prev.map((s, idx) => ({
              ...s,
              emotion: emotionsList[idx % emotionsList.length] as any
            })));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch live stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 30000);
    return () => clearInterval(interval);
  }, [fetchLiveStats]);

  const emotionDistribution = liveStats?.summary?.emotionDistribution 
    ? Object.entries(liveStats.summary.emotionDistribution as Record<string, number>)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({
          name: EMOTION_CONFIG[k as EmotionType]?.labelVi || k,
          value: v,
          color: EMOTION_CONFIG[k as EmotionType]?.color || '#6b7280',
        }))
    : emotionDistributionMock;

  const emotionTrendData = liveStats?.buckets?.length > 0 
    ? liveStats.buckets.map((b: any) => ({
        date: new Date(b.periodStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        happy: b.distribution.happy || 0,
        focused: b.distribution.concentrating || 0,
        stressed: b.distribution.sad || 0,
        motivated: b.distribution.very_happy || 0,
      }))
    : emotionTrendDataMock;

  // Drag and Drop Functions
  const handleMouseDown = (e: React.MouseEvent, studentId: number) => {
    if (!isEditMode) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    const x = (e.clientX - rect.left) / rect.width * 100;
    const y = (e.clientY - rect.top) / rect.height * 100;
    
    setIsDragging(true);
    setDraggedStudent(studentId);
    setDragOffset({
      x: x - student.x,
      y: y - student.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedStudent || !isEditMode) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, (e.clientX - rect.left) / rect.width * 100 - dragOffset.x));
    const y = Math.max(5, Math.min(95, (e.clientY - rect.top) / rect.height * 100 - dragOffset.y));
    
    setStudents(prev => prev.map(student => 
      student.id === draggedStudent 
        ? { ...student, x, y }
        : student
    ));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedStudent(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const snapToGrid = (value: number) => {
    // Snap to nearest 10% grid
    return Math.round(value / 10) * 10;
  };

  // Randomize classroom layout - all students moved to front rows
  const randomizeLayout = () => {
    // Shuffle students randomly
    const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
    
    // Define classroom positions (8 columns x 5 rows) - prioritize front rows
    const positions = [];
    
    // First, add all front row positions (rows 1-2: y = 10%, 25%)
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 8; col++) {
        positions.push({
          x: 10 + col * 10, // 10%, 20%, 30%, ..., 80%
          y: 10 + row * 15   // 10%, 25%
        });
      }
    }
    
    // Then add middle rows (rows 3-4: y = 40%, 55%)
    for (let row = 2; row < 4; row++) {
      for (let col = 0; col < 8; col++) {
        positions.push({
          x: 10 + col * 10,
          y: 10 + row * 15   // 40%, 55%
        });
      }
    }
    
    // Finally add back row (row 5: y = 70%)
    for (let col = 0; col < 8; col++) {
      positions.push({
        x: 10 + col * 10,
        y: 10 + 4 * 15       // 70%
      });
    }
    
    // Assign positions - all students get positions from front to back
    const newStudents = shuffledStudents.map((student, index) => {
      const position = positions[index] || positions[positions.length - 1];
      return { ...student, ...position };
    });
    
    setStudents(newStudents);
    
    // Show success toast
    toast({
      title: `🔄 {t('emotion.refresh-success')}`,
      description: t('emotion.refresh-description'),
      duration: 3000,
    });
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!isEditMode || !draggedStudent) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = snapToGrid((e.clientX - rect.left) / rect.width * 100);
    const y = snapToGrid((e.clientY - rect.top) / rect.height * 100);
    
    setStudents(prev => prev.map(student => 
      student.id === draggedStudent 
        ? { ...student, x, y }
        : student
    ));
  };

  // Vision Tracker Data - AI Attention
  const attentionData = [
    { time: '09:00', focus: 85, eyeMovement: 12, posture: 90, engagement: 88 },
    { time: '09:15', focus: 78, eyeMovement: 18, posture: 85, engagement: 82 },
    { time: '09:30', focus: 92, eyeMovement: 8, posture: 95, engagement: 94 },
    { time: '09:45', focus: 65, eyeMovement: 25, posture: 70, engagement: 68 },
    { time: '10:00', focus: 88, eyeMovement: 15, posture: 88, engagement: 85 },
    { time: '10:15', focus: 75, eyeMovement: 22, posture: 75, engagement: 78 },
    { time: '10:30', focus: 95, eyeMovement: 6, posture: 92, engagement: 96 },
  ];

  const currentAttention = {
    focus: 88,
    eyeMovement: 15,
    posture: 85,
    engagement: 87,
    status: 'Highly Focused',
  };

  // Canvas drawing function for heatmap
  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Set blending mode for smooth gradients
    ctx.globalCompositeOperation = 'screen';

    // Draw each student's gradient
    students.forEach((student) => {
      const x = (student.x / 100) * rect.width;
      const y = (student.y / 100) * rect.height;
      
      // Get emotion color
      const getEmotionColor = (emotion: string) => {
        switch (emotion) {
          case 'happy': return { r: 34, g: 197, b: 94 }; // green-500
          case 'focused': return { r: 59, g: 130, b: 246 }; // blue-500
          case 'stressed': return { r: 239, g: 68, b: 68 }; // red-500
          case 'motivated': return { r: 139, g: 92, b: 246 }; // purple-500
          default: return { r: 107, g: 114, b: 128 }; // gray-500
        }
      };

      const color = getEmotionColor(student.emotion);
      const intensity = student.performance / 100; // Use performance as intensity
      const radius = 80 + (student.energy / 100) * 40; // Radius based on energy

      // Create radial gradient
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.8})`);
      gradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.4})`);
      gradient.addColorStop(0.6, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.2})`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

      // Draw gradient circle
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';

    // Draw seating grid (8 columns x 5 rows with center aisle)
    const rows = 5;
    const colsPerSide = 4;
    const cellWidth = rect.width / 9; // 4 left + 1 aisle + 4 right
    const cellHeight = rect.height / rows;
    const aisleWidth = cellWidth;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;

    // Horizontal lines
    for (let i = 0; i <= rows; i++) {
      const y = i * cellHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    // Vertical lines - Left block (A)
    for (let i = 0; i <= colsPerSide; i++) {
      const x = i * cellWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }

    // Vertical lines - Right block (B)
    for (let i = 0; i <= colsPerSide; i++) {
      const x = (colsPerSide + 1) * cellWidth + i * cellWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }

    // Draw aisle (center vertical space)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(colsPerSide * cellWidth, 0, aisleWidth, rect.height);

    // Draw seat labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    let seatIndex = 1;
    for (let row = 0; row < rows; row++) {
      // Left side (A)
      for (let col = 0; col < colsPerSide; col++) {
        const x = col * cellWidth + cellWidth / 2;
        const y = row * cellHeight + 8;
        ctx.fillText(`A${seatIndex}`, x, y);
        seatIndex++;
      }
    }

    seatIndex = 1;
    for (let row = 0; row < rows; row++) {
      // Right side (B)
      for (let col = 0; col < colsPerSide; col++) {
        const x = (colsPerSide + 1) * cellWidth + col * cellWidth + cellWidth / 2;
        const y = row * cellHeight + 8;
        ctx.fillText(`B${seatIndex}`, x, y);
        seatIndex++;
      }
    }

    // Draw student centers
    students.forEach((student) => {
      const x = (student.x / 100) * rect.width;
      const y = (student.y / 100) * rect.height;
      
      const getEmotionColor = (emotion: string) => {
        switch (emotion) {
          case 'happy': return '#10B981';
          case 'focused': return '#3B82F6';
          case 'stressed': return '#EF4444';
          case 'motivated': return '#8B5CF6';
          default: return '#6B7280';
        }
      };

      // Draw center dot
      ctx.fillStyle = getEmotionColor(student.emotion);
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();

      // Draw white border
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw performance text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${student.performance}%`, x, y + 3);
    });
  }, [students]);

  // Draw heatmap on mount and resize
  useEffect(() => {
    const handleResize = () => {
      drawHeatmap();
    };

    drawHeatmap();
    typeof window !== 'undefined' && window.addEventListener('resize', handleResize);
    return () => {
      typeof window !== 'undefined' && window.removeEventListener('resize', handleResize);
    };
  }, [drawHeatmap]);

  return (
    <VisionThemeWrapper title="Emotion" subtitle="Hệ thống học tập thông minh">
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">💝 {t('emotion.title')}</h1>
              <p className="text-pink-100">{t('emotion.subtitle')}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-4xl font-bold">{currentMood.score}%</div>
                <div className="text-pink-100">{t('emotion.overall-mood')}</div>
              </div>
                          </div>
          </div>
        </div>

        {/* Current Mood Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-100">{t('emotion.happiness')}</p>
                <p className="text-2xl font-bold">{currentMood.score}%</p>
                <p className="text-xs text-green-200">{t('emotion.excellent')}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Smile className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100">{t('emotion.energy-level')}</p>
                <p className="text-2xl font-bold">{currentMood.energy}%</p>
                <p className="text-xs text-blue-200">{t('emotion.very-good')}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-100">{t('emotion.motivation')}</p>
                <p className="text-2xl font-bold">{currentMood.motivation}%</p>
                <p className="text-xs text-purple-200">{t('emotion.high')}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-100">{t('emotion.stress-level')}</p>
                <p className="text-2xl font-bold">{currentMood.stress}%</p>
                <p className="text-xs text-orange-200">{t('emotion.low')}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Emotion Trend */}
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg p-6 border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-2">📈</span>
              Emotion Trend (7 days)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={emotionTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="happy" stroke="#10B981" strokeWidth={2} name={t('emotion.happy')} />
                <Line type="monotone" dataKey="focused" stroke="#3B82F6" strokeWidth={2} name={t('emotion.focused')} />
                <Line type="monotone" dataKey="stressed" stroke="#EF4444" strokeWidth={2} name={t('emotion.stressed')} />
                <Line type="monotone" dataKey="motivated" stroke="#8B5CF6" strokeWidth={2} name={t('emotion.motivated')} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Emotion Distribution */}
          <div className="bg-gradient-to-br from-white to-pink-50 rounded-xl shadow-lg p-6 border border-pink-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-2">🎯</span>
              Emotion Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={emotionDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {emotionDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Engagement */}
        <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg p-6 mb-6 border border-purple-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">📊</span>
            Weekly Engagement & Energy
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyEngagement}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="engagement" fill="#8B5CF6" name="Engagement %" />
              <Bar dataKey="energy" fill="#10B981" name="Energy Level %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-br from-white to-indigo-50 rounded-xl shadow-lg p-6 border border-indigo-100 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">🤖</span>
            AI Insights & Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiInsights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border-l-4 ${
                  insight.type === 'positive'
                    ? 'bg-green-50 border-green-500'
                    : insight.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-500'
                    : insight.type === 'success'
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-purple-50 border-purple-500'
                }`}
              >
                <h4 className="font-semibold text-gray-900 mb-2">{insight.title}</h4>
                <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
                <p className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded inline-block">
                  💡 {insight.action}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Heart Map - Classroom Progress Map */}
        <div className="bg-gradient-to-br from-white to-pink-50 rounded-xl shadow-lg p-6 border border-pink-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="text-2xl mr-2">💝</span>{t('emotion.heart-map-title')}<span className="ml-2 text-sm bg-pink-100 text-pink-800 px-2 py-1 rounded-full">Heatmap Visualization</span>
            </h3>
            <div className="flex gap-3">
              <button
                onClick={randomizeLayout}
                className="px-4 py-2 rounded-lg font-medium transition-all bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl"
                title={t('emotion.language-toggle')}
              >
                🔄 {t('emotion.refresh-layout')}
              </button>
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isEditMode 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isEditMode ? `🔒 ${t('emotion.exit-edit-mode')}` : `✏️ ${t('emotion.edit-layout')}`}
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Bản đồ &quot;cảm xúc & tiến bộ&quot; của cả lớp: hiển thị từng học sinh như một &quot;chấm sáng&quot; thể hiện năng lượng học tập
          </p>
          
          {/* Algorithm Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <span className="text-blue-600 text-lg mr-2">💡</span>
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">Thuật toán sắp xếp dồn lên phía trước</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>• <strong>Ưu tiên hàng đầu:</strong> Tất cả học sinh được sắp xếp từ hàng đầu tiên</p>
                  <p>• <strong>Thứ tự ngẫu nhiên:</strong> Vị trí cụ thể được xếp ngẫu nhiên</p>
                  <p>• <strong>Dồn lên trước:</strong> Hàng đầu (2 dòng) được ưu tiên trước</p>
                  <p>• <strong>Sau đó hàng giữa:</strong> Dòng 3-4 được sử dụng tiếp theo</p>
                  <p>• <strong>Cuối cùng hàng sau:</strong> Dòng cuối chỉ dùng khi cần thiết</p>
                </div>
              </div>
            </div>
          </div>
          
          {isEditMode && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <span className="text-yellow-600 text-lg mr-2">⚠️</span>
                <div>
                  <h4 className="font-semibold text-yellow-800">Edit Mode Active</h4>
                  <p className="text-sm text-yellow-700">
                    Click and drag any student to move them to a new position. Students will snap to the grid automatically.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Classroom Map - Canvas Heatmap */}
          <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 mb-6 border-2 border-dashed border-purple-200">
            <div className="text-center mb-4">
              <h4 className="font-semibold text-gray-800">Lớp 10A1 - Bản đồ cảm xúc & tiến bộ</h4>
              <p className="text-sm text-gray-600">Bố cục lớp học: 8 cột x 5 dòng, dòng cuối có thể không đầy đủ</p>
            </div>
            
            {/* Canvas Heatmap */}
            <div className="relative h-80 w-full">
              <canvas
                ref={canvasRef}
                className={`w-full h-full rounded-lg ${isEditMode ? 'cursor-move' : 'cursor-pointer'}`}
                style={{ background: 'transparent' }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onClick={handleCanvasClick}
              />
              
              {/* Student Info Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {students.map((student) => {
                  const getEmotionIcon = (emotion: string) => {
                    switch (emotion) {
                      case 'happy': return '😊';
                      case 'focused': return '🎯';
                      case 'stressed': return '😰';
                      case 'motivated': return '🚀';
                      default: return '😐';
                    }
                  };

                  return (
                    <div
                      key={student.id}
                      className={`absolute group ${isEditMode ? 'pointer-events-auto cursor-move' : 'pointer-events-auto'}`}
                      style={{ left: `${student.x}%`, top: `${student.y}%` }}
                      onMouseDown={(e) => handleMouseDown(e, student.id)}
                    >
                      {/* Hover Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                          <div className="font-semibold">{student.name}</div>
                          <div>Performance: {student.performance}%</div>
                          <div>Energy: {student.energy}%</div>
                          <div>Mood: {student.emotion}</div>
                          {isEditMode && (
                            <div className="text-yellow-300 mt-1">🖱️ Drag to move</div>
                          )}
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-700">😊 Happy (85%+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-700">🎯 Focused (80%+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                <span className="text-sm text-gray-700">🚀 Motivated (75%+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-700">😰 Stressed (&lt;70%)</span>
              </div>
            </div>
            
            {/* Heatmap Info */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                💡 <strong>Heatmap:</strong> Gradient radius = Energy level, Color intensity = Performance score
              </p>
              <p className="text-xs text-gray-500">
                🔥 Các gradient trộn lẫn tạo hiệu ứng nhiệt có thể quan sát từ xa
              </p>
              <p className="text-xs text-gray-500">
                📐 <strong>Bố cục:</strong> 8 cột (10-80%), 5 dòng (10-70%), mỗi vị trí cách nhau 10%
              </p>
            </div>
          </div>

          {/* Classroom Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg p-4 text-white text-center">
              <div className="text-2xl font-bold">16</div>
              <div className="text-sm text-green-100">Happy Students</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg p-4 text-white text-center">
              <div className="text-2xl font-bold">10</div>
              <div className="text-sm text-blue-100">Focused Students</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg p-4 text-white text-center">
              <div className="text-2xl font-bold">10</div>
              <div className="text-sm text-purple-100">Motivated Students</div>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-lg p-4 text-white text-center">
              <div className="text-2xl font-bold">4</div>
              <div className="text-sm text-red-100">Need Support</div>
            </div>
          </div>
        </div>

        {/* Vision Tracker - AI Attention - Neumorphic Design */}
        <div 
          className="rounded-3xl p-8 mb-6"
          style={{
            background: 'linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%)',
            boxShadow: `
              14px 14px 28px rgba(163, 177, 198, 0.7),
              -14px -14px 28px rgba(255, 255, 255, 0.95),
              inset 2px 2px 4px rgba(163, 177, 198, 0.1)
            `,
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}
        >
          <h3 
            className="text-xl font-bold mb-2 flex items-center"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            <span 
              className="text-2xl mr-3 flex items-center justify-center"
              style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                color: 'white',
                boxShadow: `
                  6px 6px 12px rgba(102, 126, 234, 0.4),
                  -4px -4px 8px rgba(255, 255, 255, 0.9),
                  inset 2px 2px 4px rgba(0, 0, 0, 0.1)
                `
              }}
            >
              👁️
            </span>
            Vision Tracker - AI Attention
            <span 
              className="ml-3 text-xs px-3 py-1 rounded-full font-semibold"
              style={{
                background: 'linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%)',
                color: '#667eea',
                boxShadow: `
                  4px 4px 8px rgba(163, 177, 198, 0.5),
                  -4px -4px 8px rgba(255, 255, 255, 0.8),
                  inset 1px 1px 2px rgba(163, 177, 198, 0.1)
                `,
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              Computer Vision
            </span>
          </h3>
          <p className="text-sm mb-6" style={{ color: '#718096' }}>
            Theo dõi ánh mắt, chuyển động, mức độ tập trung khi học trực tuyến hoặc trong lớp học thật
          </p>

          {/* Current Attention Status - Neumorphic Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
            <div 
              className="rounded-2xl p-5 text-center transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: `
                  8px 8px 16px rgba(102, 126, 234, 0.5),
                  -4px -4px 8px rgba(255, 255, 255, 0.2),
                  inset 2px 2px 4px rgba(0, 0, 0, 0.1)
                `,
                color: 'white'
              }}
            >
              <div className="flex items-center justify-center mb-3">
                <Focus className="w-6 h-6 mr-2" />
                <span className="text-sm font-semibold">Focus Level</span>
              </div>
              <div className="text-3xl font-bold mb-1">{currentAttention.focus}%</div>
              <div className="text-xs opacity-90">Highly Focused</div>
            </div>
            
            <div 
              className="rounded-2xl p-5 text-center transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: `
                  8px 8px 16px rgba(16, 185, 129, 0.5),
                  -4px -4px 8px rgba(255, 255, 255, 0.2),
                  inset 2px 2px 4px rgba(0, 0, 0, 0.1)
                `,
                color: 'white'
              }}
            >
              <div className="flex items-center justify-center mb-3">
                <Eye className="w-6 h-6 mr-2" />
                <span className="text-sm font-semibold">{t('vision.eye-movement')}</span>
              </div>
              <div className="text-3xl font-bold mb-1">{currentAttention.eyeMovement}</div>
              <div className="text-xs opacity-90">Movements/min</div>
            </div>
            
            <div 
              className="rounded-2xl p-5 text-center transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                boxShadow: `
                  8px 8px 16px rgba(139, 92, 246, 0.5),
                  -4px -4px 8px rgba(255, 255, 255, 0.2),
                  inset 2px 2px 4px rgba(0, 0, 0, 0.1)
                `,
                color: 'white'
              }}
            >
              <div className="flex items-center justify-center mb-3">
                <Activity className="w-6 h-6 mr-2" />
                <span className="text-sm font-semibold">{t('vision.posture')}</span>
              </div>
              <div className="text-3xl font-bold mb-1">{currentAttention.posture}%</div>
              <div className="text-xs opacity-90">Good Posture</div>
            </div>
            
            <div 
              className="rounded-2xl p-5 text-center transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                boxShadow: `
                  8px 8px 16px rgba(245, 158, 11, 0.5),
                  -4px -4px 8px rgba(255, 255, 255, 0.2),
                  inset 2px 2px 4px rgba(0, 0, 0, 0.1)
                `,
                color: 'white'
              }}
            >
              <div className="flex items-center justify-center mb-3">
                <Brain className="w-6 h-6 mr-2" />
                <span className="text-sm font-semibold">{t('vision.engagement')}</span>
              </div>
              <div className="text-3xl font-bold mb-1">{currentAttention.engagement}%</div>
              <div className="text-xs opacity-90">Very Engaged</div>
            </div>
          </div>

          {/* Attention Timeline Chart - Neumorphic Container */}
          <div 
            className="rounded-2xl p-6 mb-6"
            style={{
              background: 'linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%)',
              boxShadow: `
                inset 8px 8px 16px rgba(163, 177, 198, 0.5),
                inset -8px -8px 16px rgba(255, 255, 255, 0.7),
                2px 2px 4px rgba(163, 177, 198, 0.2)
              `,
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}
          >
            <h4 
              className="font-bold mb-4 flex items-center"
              style={{ color: '#4a5568' }}
            >
              <Camera 
                className="w-5 h-5 mr-2"
                style={{ color: '#667eea' }}
              />
              Real-time Attention Monitoring
            </h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={attentionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(113, 128, 150, 0.2)" />
                <XAxis dataKey="time" stroke="#718096" />
                <YAxis stroke="#718096" />
                <Tooltip 
                  contentStyle={{
                    background: 'linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '12px',
                    boxShadow: '4px 4px 8px rgba(163, 177, 198, 0.4)'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="focus" stroke="#667eea" strokeWidth={3} name="Focus %" />
                <Line type="monotone" dataKey="engagement" stroke="#10b981" strokeWidth={3} name="Engagement %" />
                <Line type="monotone" dataKey="posture" stroke="#8b5cf6" strokeWidth={3} name="Posture %" />
                <Line type="monotone" dataKey="eyeMovement" stroke="#f59e0b" strokeWidth={2} name={t('vision.eye-movement')} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* AI Analysis - Neumorphic Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div 
              className="rounded-2xl p-5 transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%)',
                boxShadow: `
                  8px 8px 16px rgba(163, 177, 198, 0.5),
                  -8px -8px 16px rgba(255, 255, 255, 0.8),
                  inset 1px 1px 2px rgba(163, 177, 198, 0.1)
                `,
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderLeft: '5px solid #10b981'
              }}
            >
              <h5 
                className="font-bold mb-3 flex items-center"
                style={{ color: '#059669' }}
              >
                <span className="text-lg mr-2">✅</span>
                Attention Strengths
              </h5>
              <ul className="text-sm space-y-2" style={{ color: '#047857' }}>
                <li>• Excellent focus during 9:30-10:30 period</li>
                <li>• Consistent good posture (85%+ average)</li>
                <li>• Low eye movement indicates deep concentration</li>
                <li>• High engagement correlates with performance</li>
              </ul>
            </div>
            
            <div 
              className="rounded-2xl p-5 transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%)',
                boxShadow: `
                  8px 8px 16px rgba(163, 177, 198, 0.5),
                  -8px -8px 16px rgba(255, 255, 255, 0.8),
                  inset 1px 1px 2px rgba(163, 177, 198, 0.1)
                `,
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderLeft: '5px solid #f59e0b'
              }}
            >
              <h5 
                className="font-bold mb-3 flex items-center"
                style={{ color: '#d97706' }}
              >
                <span className="text-lg mr-2">⚠️</span>
                Areas for Improvement
              </h5>
              <ul className="text-sm space-y-2" style={{ color: '#b45309' }}>
                <li>• Focus drops around 9:45 (65%)</li>
                <li>• Increased eye movement during breaks</li>
                <li>• Posture slightly declines after 1 hour</li>
                <li>• Consider 5-minute breaks every 45 minutes</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex flex-wrap gap-4">
          <button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg">
            📝 Log Today&apos;s Mood
          </button>
          <button className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-6 py-3 rounded-lg font-medium transition-all">
            📊 View Full Report
          </button>
          <button className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-6 py-3 rounded-lg font-medium transition-all">
            🎯 Set Mood Goals
          </button>
          <button className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-6 py-3 rounded-lg font-medium transition-all">
            🧘 Relaxation Tips
          </button>
        </div>
      </div>
    </div>
    </VisionThemeWrapper>
  );
}

