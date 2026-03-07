'use client';

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle } from 'lucide-react';

interface LearnItem {
  term: string;
  definition: string;
  image?: string;
  type: string;
}

interface LearnCardProps {
  items: LearnItem[];
  onAnswerSubmit?: (answer: string, isCorrect: boolean) => void;
}

export default function LearnCard({ items, onAnswerSubmit }: LearnCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);

  const currentItem = items[currentIndex];
  const isLastItem = currentIndex === items.length - 1;

  const handleSubmit = () => {
    const correct = userAnswer.toLowerCase().trim() === currentItem.definition.toLowerCase().trim();
    setIsCorrect(correct);
    setShowResult(true);
    
    if (correct) {
      setScore(score + 1);
    }
    
    onAnswerSubmit?.(userAnswer, correct);
  };

  const handleNext = () => {
    setUserAnswer('');
    setShowResult(false);
    setIsCorrect(false);
    
    if (isLastItem) {
      // Reset to beginning
      setCurrentIndex(0);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setUserAnswer('');
      setShowResult(false);
      setIsCorrect(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <div className="bg-blue-500 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Learn</h3>
          <div className="flex items-center space-x-2">
            <span className="text-white text-sm">{currentIndex + 1}/{items.length}</span>
            <div className="w-16 h-2 bg-blue-400 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              currentIndex === 0 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            {currentItem?.type}
          </span>
          
          <button 
            onClick={handleNext}
            className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 flex items-center justify-center transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900 mb-4">
              {currentItem?.term}
            </p>
            
            {currentItem?.image && (
              <div className="w-40 h-24 mx-auto bg-gray-200 rounded-lg flex items-center justify-center mb-4">
                <span className="text-gray-500">Image</span>
              </div>
            )}
            
            {showResult && (
              <div className={`p-4 rounded-lg mb-4 ${
                isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                    {isCorrect ? 'Correct!' : 'Incorrect'}
                  </span>
                </div>
                <p className="text-gray-700">
                  <strong>Answer:</strong> {currentItem?.definition}
                </p>
                {!isCorrect && (
                  <p className="text-gray-600 mt-1">
                    <strong>Your answer:</strong> {userAnswer}
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type the answer
            </label>
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Enter your answer..."
              disabled={showResult}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              onKeyPress={(e) => e.key === 'Enter' && !showResult && handleSubmit()}
            />
          </div>
          
          <div className="flex space-x-3">
            {!showResult ? (
              <button
                onClick={handleSubmit}
                disabled={!userAnswer.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Check Answer
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                {isLastItem ? 'Start Over' : 'Next'}
              </button>
            )}
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-600">
              Score: <span className="font-semibold text-blue-600">{score}/{items.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(score / items.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
