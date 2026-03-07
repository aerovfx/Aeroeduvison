'use client';

import { useState } from 'react';
import { Users, TrendingUp, Award, Clock, MessageSquare, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminTeachersPage() {
  const { t } = useLanguage();
  
  const teachers = [
    { name: 'Ms. Sarah', avgGain: 245, feedbackScore: 9.2, responseTime: 2.3, interventions: 12, students: 45 },
    { name: 'Mr. John', avgGain: 198, feedbackScore: 8.5, responseTime: 4.5, interventions: 8, students: 38 },
    { name: 'Ms. Emily', avgGain: 278, feedbackScore: 9.5, responseTime: 1.8, interventions: 15, students: 52 },
    { name: 'Mr. David', avgGain: 165, feedbackScore: 7.8, responseTime: 6.2, interventions: 5, students: 35 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-8">
        Teacher Performance Center
      </h1>

      <div className="grid grid-cols-1 gap-4">
        {teachers.map((teacher, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-400 flex items-center justify-center text-white text-xl font-bold">
                  {teacher.name.split(' ')[1].charAt(0)}
                
              </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{teacher.name}</h3>
                  <p className="text-sm text-gray-600">{teacher.students} students</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-6">
                <div className="text-center">
                  <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">{teacher.avgGain}</p>
                  <p className="text-xs text-gray-600">Avg XP Gain</p>
                </div>
                <div className="text-center">
                  <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">{teacher.feedbackScore}</p>
                  <p className="text-xs text-gray-600">Feedback Score</p>
                </div>
                <div className="text-center">
                  <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">{teacher.responseTime}h</p>
                  <p className="text-xs text-gray-600">Response Time</p>
                </div>
                <div className="text-center">
                  <MessageSquare className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">{teacher.interventions}</p>
                  <p className="text-xs text-gray-600">Interventions</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

