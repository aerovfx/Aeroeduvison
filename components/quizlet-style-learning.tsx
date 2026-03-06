"use client"

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, Flag, Play, CheckCircle, XCircle, Star, Trophy } from "lucide-react";
import confetti from "canvas-confetti";

interface QuizletStyleLearningProps {
  subject: string;
  totalQuestions: number;
  currentQuestion: number;
  question: {
    term: string;
    definition: string;
    options: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
    }>;
  };
  onAnswer: (answerId: string) => void;
  onNext: () => void;
  onSkip: () => void;
  showResult?: boolean;
  selectedAnswer?: string;
  isCorrect?: boolean;
  isCompleted?: boolean;
  totalXP?: number;
}

export function QuizletStyleLearning({
  subject,
  totalQuestions,
  currentQuestion,
  question,
  onAnswer,
  onNext,
  onSkip,
  showResult = false,
  selectedAnswer,
  isCorrect,
  isCompleted = false,
  totalXP = 0
}: QuizletStyleLearningProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Play celebration sound
  const playCelebrationSound = () => {
    // Create audio context for web audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Kahoot-style victory melody
    const playNote = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = audioContext.currentTime;
    
    // Victory melody (C major scale ascending)
    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // C4 to C5
    
    notes.forEach((freq, index) => {
      playNote(freq, now + index * 0.15, 0.3);
    });
    
    // Final triumphant chord
    setTimeout(() => {
      const chordTime = now + 1.5;
      playNote(261.63, chordTime, 0.5); // C
      playNote(329.63, chordTime, 0.5); // E
      playNote(392.00, chordTime, 0.5); // G
    }, 1500);
  };

  // Update XP when lesson is completed
  const updateUserXP = async () => {
    try {
      const response = await fetch('/api/user/xp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          xp: totalXP,
          subject: subject,
          lessonTitle: question.term
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('XP updated successfully:', data);
      } else {
        console.error('Failed to update XP');
      }
    } catch (error) {
      console.error('Error updating XP:', error);
    }
  };

  // Trigger confetti and sound when lesson is completed
  useEffect(() => {
    if (isCompleted && !showCelebration) {
      setShowCelebration(true);
      
      // Update user XP
      updateUserXP();
      
      // Play celebration sound
      playCelebrationSound();
      
      // Fire confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Additional confetti bursts
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
      }, 250);

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 400);

      // Final confetti burst
      setTimeout(() => {
        confetti({
          particleCount: 200,
          spread: 90,
          origin: { y: 0.5 }
        });
      }, 2000);

      // Start countdown after 2 seconds
      setTimeout(() => {
        setCountdown(3);
        const countdownInterval = setInterval(() => {
          setCountdown(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(countdownInterval);
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      }, 2000);
    }
  }, [isCompleted, showCelebration, totalXP, subject, question.term]);

  const handleOptionClick = (optionId: string) => {
    if (!showResult) {
      setSelectedOption(optionId);
      onAnswer(optionId);
    }
  };

  const progressPercentage = (currentQuestion / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-full opacity-80"></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">Learn</span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        <Button 
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-2 rounded-lg"
          onClick={onNext}
        >
          {isCompleted ? "Bài tiếp theo" : showResult ? "Continue" : "Start"}
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="px-6 mb-8">
        <div className="relative">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm border-4 border-slate-900"
            style={{ left: `calc(${progressPercentage}% - 16px)` }}
          >
            {currentQuestion}
          </div>
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
            {totalQuestions}
          </div>
        </div>
      </div>

      {/* Completion Celebration */}
      {isCompleted && showCelebration && (
        <div className="px-6 mb-6">
          <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 border-yellow-400 shadow-2xl">
            <CardContent className="p-6 text-center text-white">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Trophy className="h-8 w-8 text-yellow-200" />
                <h2 className="text-2xl font-bold">Chúc mừng!</h2>
                <Trophy className="h-8 w-8 text-yellow-200" />
              </div>
              <p className="text-lg mb-2">Bạn đã hoàn thành bài học!</p>
              <div className="flex items-center justify-center gap-2 text-yellow-200 mb-3">
                <Star className="h-5 w-5" />
                <span className="text-xl font-bold">+{totalXP} XP</span>
                <Star className="h-5 w-5" />
              </div>
              {countdown && (
                <div className="text-sm text-yellow-200">
                  Chuyển trang trong {countdown} giây...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Card */}
      <div className="px-6">
        <Card className="bg-slate-800 border-slate-700 shadow-2xl">
          <CardContent className="p-8">
            {/* Question */}
            <div className="text-center mb-8">
              <div className="text-sm text-gray-400 mb-2">Term</div>
              <h1 className="text-4xl font-bold text-white mb-4">{question.term}</h1>
            </div>

            {/* Answer Options */}
            <div className="mb-8">
              <div className="text-sm text-gray-400 mb-4 text-center">Choose an answer</div>
              <div className="grid grid-cols-2 gap-4">
                {question.options.map((option, index) => {
                  const isSelected = selectedOption === option.id || selectedAnswer === option.id;
                  const showCorrect = showResult && option.isCorrect;
                  const showIncorrect = showResult && isSelected && !option.isCorrect;
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleOptionClick(option.id)}
                      disabled={showResult}
                      className={`
                        p-6 rounded-xl border-2 transition-all duration-200 text-left
                        ${showResult 
                          ? showCorrect 
                            ? 'border-green-500 bg-green-500/20' 
                            : showIncorrect
                            ? 'border-red-500 bg-red-500/20'
                            : 'border-slate-600 bg-slate-700'
                          : isSelected
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-slate-600 bg-slate-700 hover:border-slate-500 hover:bg-slate-600'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                          ${showResult 
                            ? showCorrect 
                              ? 'bg-green-500 text-white' 
                              : showIncorrect
                              ? 'bg-red-500 text-white'
                              : 'bg-slate-600 text-gray-400'
                            : isSelected
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-600 text-gray-400'
                          }
                        `}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-white font-medium">{option.text}</div>
                        </div>
                        {showResult && showCorrect && (
                          <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
                        )}
                        {showResult && showIncorrect && (
                          <XCircle className="h-5 w-5 text-red-500 ml-auto" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Result Message */}
            {showResult && (
              <div className="text-center mb-6">
                <div className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                  ${isCorrect 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }
                `}>
                  {isCorrect ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Correct!
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      Incorrect
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Skip Button */}
            <div className="flex justify-end">
              <button
                onClick={onSkip}
                className="flex items-center gap-2 text-gray-400 hover:text-gray-300 text-sm"
              >
                <Flag className="h-4 w-4" />
                Don't know?
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="text-center text-gray-500 text-sm">
          {subject} • Question {currentQuestion} of {totalQuestions}
        </div>
      </div>
    </div>
  );
}
