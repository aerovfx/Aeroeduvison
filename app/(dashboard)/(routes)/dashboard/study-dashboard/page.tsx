'use client';

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';

import React, { useState } from 'react';
import { 
  Search,
  TrendingUp,
  Target,
  BarChart3,
  Users,
  Award,
  Play
} from 'lucide-react';

// Import our custom study components
import LearnCard from '@/components/study/LearnCard';
import Flashcard from '@/components/study/Flashcard';
import PracticeTest from '@/components/study/PracticeTest';
import StudyGuide from '@/components/study/StudyGuide';
import { useLanguage } from '@/contexts/LanguageContext';

export default function StudyDashboard() {
  const { t } = useLanguage();
  
  // Sample data
  const learnItems = [
    { 
      term: "la pintura", 
      definition: "the painting", 
      image: "/api/placeholder/200/120",
      type: "Spanish"
    },
    { 
      term: "el libro", 
      definition: "the book", 
      image: "/api/placeholder/200/120",
      type: "Spanish"
    },
    { 
      term: "la casa", 
      definition: "the house", 
      image: "/api/placeholder/200/120",
      type: "Spanish"
    }
  ];

  const flashcards = [
    {
      front: "superior vena cava",
      back: "Large vein that carries deoxygenated blood from the upper body to the heart",
      image: "/api/placeholder/200/150",
      subject: "Anatomy",
      difficulty: "medium"
    },
    {
      front: "mitochondria",
      back: "The powerhouse of the cell",
      image: "/api/placeholder/200/150",
      subject: t('labs.biology'),
      difficulty: "easy"
    },
    {
      front: "photosynthesis",
      back: "The process by which plants convert sunlight into energy",
      image: "/api/placeholder/200/150",
      subject: t('labs.biology'),
      difficulty: "medium"
    }
  ];

  const practiceTestQuestions = [
    {
      id: 1,
      question: "What is the capital of France?",
      options: [
        { id: 'A', text: "London", correct: false },
        { id: 'B', text: "Berlin", correct: false },
        { id: 'C', text: "Paris", correct: true },
        { id: 'D', text: "Madrid", correct: false }
      ]
    },
    {
      id: 2,
      question: "Which planet is closest to the Sun?",
      options: [
        { id: 'A', text: "Venus", correct: false },
        { id: 'B', text: "Mercury", correct: true },
        { id: 'C', text: "Earth", correct: false },
        { id: 'D', text: "Mars", correct: false }
      ]
    },
    {
      id: 3,
      question: "What is the chemical symbol for gold?",
      options: [
        { id: 'A', text: "Go", correct: false },
        { id: 'B', text: "Gd", correct: false },
        { id: 'C', text: "Au", correct: true },
        { id: 'D', text: "Ag", correct: false }
      ]
    }
  ];

  const studyGuides = [
    {
      id: "greek-art",
      title: "Greek Art",
      description: "Complete guide to ancient Greek artistic periods",
      progress: 65,
      lastStudied: "2 hours ago",
      difficulty: "intermediate",
      estimatedTime: "45 min"
    },
    {
      id: "algebra-basics",
      title: "Algebra Basics",
      description: "Fundamental concepts in algebra",
      progress: 30,
      lastStudied: "1 day ago",
      difficulty: "beginner",
      estimatedTime: "60 min"
    }
  ];

  const handleLearnAnswer = (answer: string, isCorrect: boolean) => {
    console.log('Learn answer:', { answer, isCorrect });
  };

  const handleFlashcardComplete = (card: any, correct: boolean) => {
    console.log('Flashcard completed:', { card: card.front, correct });
  };

  const handleTestComplete = (results: any) => {
    console.log('Test completed:', results);
  };

  const handleGuideSelect = (guide: any) => {
    console.log('Guide selected:', guide.title);
  };

  return (


    <VisionThemeWrapper title="Study Dashboard" subtitle="Hệ thống học tập thông minh">
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Study Dashboard</h1>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                LMS Math
              </span>
            
              </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">1,234 students</span>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-gray-600">Premium</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Study Feature Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <LearnCard 
            items={learnItems}
            onAnswerSubmit={handleLearnAnswer}
          />
          
          <StudyGuide 
            guides={studyGuides}
            onGuideSelect={handleGuideSelect}
          />
          
          <Flashcard 
            cards={flashcards}
            onCardComplete={handleFlashcardComplete}
          />
          
          <PracticeTest 
            questions={practiceTestQuestions}
            timeLimit={10}
            onTestComplete={handleTestComplete}
          />
        </div>

        {/* Tagline and Search */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Every class, every test, one ultimate study app
          </h2>
          
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="World map"
                className="w-full pl-10 pr-4 py-4 text-lg bg-blue-50 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-blue-300"
              />
            </div>
          </div>
        </div>

        {/* Additional Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Progress Tracking</h3>
                <p className="text-sm text-gray-600">Monitor your learning journey</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Math Progress</span>
                <span>85%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '85%'}}></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Smart Goals</h3>
                <p className="text-sm text-gray-600">Set and achieve targets</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Daily Target</span>
                <span>8/10 cards</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{width: '80%'}}></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t('analytics.title')}</h3>
                <p className="text-sm text-gray-600">Detailed performance insights</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">92%</div>
                <div className="text-xs text-gray-600">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">24</div>
                <div className="text-xs text-gray-600">Streak</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { action: "Completed", subject: "Algebra Practice Test", score: "85%", time: "2 hours ago" },
              { action: "Studied", subject: "Geometry Flashcards", score: "12/15 correct", time: "4 hours ago" },
              { action: "Created", subject: "Physics Study Guide", score: "New", time: "1 day ago" }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Play className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {activity.action} <span className="text-blue-600">{activity.subject}</span>
                    </p>
                    <p className="text-sm text-gray-600">{activity.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {activity.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </VisionThemeWrapper>
  );
}
