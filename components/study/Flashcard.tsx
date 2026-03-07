'use client';

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Star, StarOff } from 'lucide-react';

interface FlashcardData {
  front: string;
  back: string;
  image?: string;
  subject: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface FlashcardProps {
  cards: FlashcardData[];
  onCardComplete?: (card: FlashcardData, correct: boolean) => void;
}

export default function Flashcard({ cards, onCardComplete }: FlashcardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  const currentCard = cards[currentIndex];
  const isLastCard = currentIndex === cards.length - 1;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    setIsFlipped(false);
    if (isLastCard) {
      setCurrentIndex(0);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleRating = (rating: 'correct' | 'incorrect') => {
    onCardComplete?.(currentCard, rating === 'correct');
    handleNext();
  };

  const toggleFavorite = () => {
    const newFavorites = new Set(favorites);
    if (favorites.has(currentIndex)) {
      newFavorites.delete(currentIndex);
    } else {
      newFavorites.add(currentIndex);
    }
    setFavorites(newFavorites);
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <div className="bg-blue-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Flashcards</h3>
          <div className="flex items-center space-x-2">
            <span className="text-white text-sm">{currentIndex + 1}/{cards.length}</span>
            <button
              onClick={toggleFavorite}
              className="text-white hover:text-yellow-300 transition-colors"
            >
              {favorites.has(currentIndex) ? (
                <Star className="w-5 h-5 fill-current" />
              ) : (
                <StarOff className="w-5 h-5" />
              )}
            </button>
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
          
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {currentCard?.subject}
            </span>
            {currentCard?.difficulty && (
              <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(currentCard.difficulty)}`}>
                {currentCard.difficulty}
              </span>
            )}
          </div>
          
          <button 
            onClick={handleNext}
            className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 flex items-center justify-center transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* Flashcard */}
        <div className="relative">
          <div 
            className={`transform transition-transform duration-500 perspective-1000 ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front of card */}
            <div className={`absolute inset-0 backface-hidden ${isFlipped ? 'hidden' : 'block'}`}>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-md p-8 border-2 border-blue-200 min-h-[300px] flex flex-col justify-center items-center text-center">
                {currentCard?.image && (
                  <div className="w-32 h-24 mx-auto bg-white rounded-lg shadow-sm mb-6 flex items-center justify-center">
                    <span className="text-gray-500">Image</span>
                  </div>
                )}
                
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {currentCard?.front}
                </h2>
                
                <button
                  onClick={handleFlip}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Show Answer</span>
                </button>
              </div>
            </div>
            
            {/* Back of card */}
            <div className={`absolute inset-0 backface-hidden ${isFlipped ? 'block' : 'hidden'}`}>
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl shadow-md p-8 border-2 border-green-200 min-h-[300px] flex flex-col justify-center items-center text-center">
                {currentCard?.image && (
                  <div className="w-32 h-24 mx-auto bg-white rounded-lg shadow-sm mb-6 flex items-center justify-center">
                    <span className="text-gray-500">Image</span>
                  </div>
                )}
                
                <h3 className="text-xl font-semibold text-gray-700 mb-4">Answer:</h3>
                <p className="text-xl text-gray-900 mb-6">
                  {currentCard?.back}
                </p>
                
                <button
                  onClick={handleFlip}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Show Question</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Rating buttons - only show when card is flipped */}
        {isFlipped && (
          <div className="mt-6 space-y-4">
            <p className="text-center text-sm text-gray-600 mb-4">
              How well did you know this?
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => handleRating('incorrect')}
                className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-3 px-4 rounded-lg font-medium transition-colors"
              >
                ❌ Got it wrong
              </button>
              <button
                onClick={() => handleRating('correct')}
                className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 py-3 px-4 rounded-lg font-medium transition-colors"
              >
                ✅ Got it right
              </button>
            </div>
          </div>
        )}
        
        {/* Progress indicator */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{currentIndex + 1} of {cards.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
