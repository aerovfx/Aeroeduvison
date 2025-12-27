'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, Target, TrendingUp } from 'lucide-react';

interface Question {
  id: number;
  question: string;
  options: {
    id: string;
    text: string;
    correct: boolean;
  }[];
  selected?: string;
  isAnswered?: boolean;
}

interface PracticeTestProps {
  questions: Question[];
  timeLimit?: number; // in minutes
  onTestComplete?: (results: {
    score: number;
    correct: number;
    total: number;
    timeSpent: string;
  }) => void;
}

export default function PracticeTest({ questions, timeLimit, onTestComplete }: PracticeTestProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [testQuestions, setTestQuestions] = useState<Question[]>(questions);
  const [isTestComplete, setIsTestComplete] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit ? timeLimit * 60 : null); // in seconds
  const [startTime] = useState(Date.now());

  const currentQuestion = testQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === testQuestions.length - 1;

  // Timer effect
  React.useEffect(() => {
    if (timeRemaining === null || isTestComplete) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          // Handle test completion inline
          setIsTestComplete(true);
          const endTime = Date.now();
          const timeSpent = Math.floor((endTime - startTime) / 1000 / 60);
          
          const correct = testQuestions.filter(q => 
            q.options.find(opt => opt.id === q.selected)?.correct
          ).length;
          
          const score = Math.round((correct / testQuestions.length) * 100);
          
          onTestComplete?.({
            score,
            correct,
            total: testQuestions.length,
            timeSpent: `${timeSpent}m`
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, isTestComplete]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (optionId: string) => {
    setTestQuestions(prev => prev.map((q, index) => 
      index === currentQuestionIndex 
        ? { ...q, selected: optionId, isAnswered: true }
        : q
    ));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      handleTestComplete();
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleTestComplete = () => {
    setIsTestComplete(true);
    const endTime = Date.now();
    const timeSpent = Math.floor((endTime - startTime) / 1000 / 60); // in minutes
    
    const correct = testQuestions.filter(q => 
      q.options.find(opt => opt.id === q.selected)?.correct
    ).length;
    
    const score = Math.round((correct / testQuestions.length) * 100);
    
    onTestComplete?.({
      score,
      correct,
      total: testQuestions.length,
      timeSpent: `${timeSpent}m`
    });
  };

  const calculateProgress = () => {
    const answered = testQuestions.filter(q => q.isAnswered).length;
    return (answered / testQuestions.length) * 100;
  };

  if (isTestComplete) {
    const correct = testQuestions.filter(q => 
      q.options.find(opt => opt.id === q.selected)?.correct
    ).length;
    const score = Math.round((correct / testQuestions.length) * 100);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000 / 60);

    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-orange-500 px-4 py-3">
          <h3 className="text-lg font-semibold text-white">Test Complete!</h3>
        </div>
        
        <div className="p-8 text-center">
          <div className="mb-8">
            <div className={`text-6xl font-bold mb-2 ${
              score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {score}%
            </div>
            <p className="text-xl text-gray-700">Your Score</p>
          </div>
          
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{correct}</div>
              <div className="text-sm text-gray-600">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{testQuestions.length}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{timeSpent}m</div>
              <div className="text-sm text-gray-600">Time</div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${score}%` }}
              ></div>
            </div>
            
            <p className="text-gray-600">
              {score >= 80 ? 'Excellent work! 🎉' : 
               score >= 60 ? 'Good job! 👍' : 
               'Keep practicing! 📚'}
            </p>
            
            <button
              onClick={() => {
                setCurrentQuestionIndex(0);
                setIsTestComplete(false);
                setTimeRemaining(timeLimit ? timeLimit * 60 : null);
                setTestQuestions(questions.map(q => ({ ...q, selected: undefined, isAnswered: false })));
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Retake Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <div className="bg-orange-500 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Practice Test</h3>
          <div className="flex items-center space-x-4">
            {timeRemaining !== null && (
              <div className="flex items-center space-x-1 text-white">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-mono">{formatTime(timeRemaining)}</span>
              </div>
            )}
            <span className="text-white text-sm">{currentQuestionIndex + 1}/{testQuestions.length}</span>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{Math.round(calculateProgress())}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${calculateProgress()}%` }}
            ></div>
          </div>
        </div>
        
        {/* Question */}
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              {currentQuestion?.id}. {currentQuestion?.question}
            </h4>
            
            <div className="space-y-3">
              {currentQuestion?.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    currentQuestion.selected === option.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={option.id}
                    checked={currentQuestion.selected === option.id}
                    onChange={() => handleAnswerSelect(option.id)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1 text-gray-900">{option.id}. {option.text}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentQuestionIndex === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Previous
            </button>
            
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {testQuestions.filter(q => q.isAnswered).length} answered
              </span>
            </div>
            
            <button
              onClick={handleNext}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {isLastQuestion ? 'Finish Test' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
