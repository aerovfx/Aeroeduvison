'use client';

import { useState } from 'react';
import { Users, TrendingUp, Award, Clock, MessageSquare, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import '@/styles/neumorphic-theme.css';

export default function AdminTeachersPage() {
  const { t } = useLanguage();

  const teachers = [
    { name: 'Ms. Sarah', avgGain: 245, feedbackScore: 9.2, responseTime: 2.3, interventions: 12, students: 45 },
    { name: 'Mr. John', avgGain: 198, feedbackScore: 8.5, responseTime: 4.5, interventions: 8, students: 38 },
    { name: 'Ms. Emily', avgGain: 278, feedbackScore: 9.5, responseTime: 1.8, interventions: 15, students: 52 },
    { name: 'Mr. David', avgGain: 165, feedbackScore: 7.8, responseTime: 6.2, interventions: 5, students: 35 }
  ];

  const NeuCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`neu-card ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen gradient-bg p-6">
      <header className="neu-header mb-8">
        <div className="flex items-center gap-4">
          <div className="icon-glow">
            <Users className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold gradient-text">
            Teacher Performance Center
          </h1>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {teachers.map((teacher, idx) => (
          <NeuCard key={idx} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full gradient-avatar flex items-center justify-center text-white text-xl font-bold shadow-soft">
                  {teacher.name.split(' ')[1].charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary">{teacher.name}</h3>
                  <p className="text-sm text-secondary">{teacher.students} students</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-6">
                <NeuCard className="stat-box text-center p-3">
                  <TrendingUp className="w-5 h-5 text-accent-green mx-auto mb-1" />
                  <p className="text-2xl font-bold text-primary">{teacher.avgGain}</p>
                  <p className="text-xs text-secondary">Avg XP Gain</p>
                </NeuCard>
                <NeuCard className="stat-box text-center p-3">
                  <Star className="w-5 h-5 text-accent-yellow mx-auto mb-1" />
                  <p className="text-2xl font-bold text-primary">{teacher.feedbackScore}</p>
                  <p className="text-xs text-secondary">Feedback Score</p>
                </NeuCard>
                <NeuCard className="stat-box text-center p-3">
                  <Clock className="w-5 h-5 text-accent-blue mx-auto mb-1" />
                  <p className="text-2xl font-bold text-primary">{teacher.responseTime}h</p>
                  <p className="text-xs text-secondary">Response Time</p>
                </NeuCard>
                <NeuCard className="stat-box text-center p-3">
                  <MessageSquare className="w-5 h-5 text-accent-purple mx-auto mb-1" />
                  <p className="text-2xl font-bold text-primary">{teacher.interventions}</p>
                  <p className="text-xs text-secondary">Interventions</p>
                </NeuCard>
              </div>
            </div>
          </NeuCard>
        ))}
      </div>
    </div>
  );
}
