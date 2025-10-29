'use client';

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  CheckCircle, 
  Star, 
  Trophy, 
  ArrowRight,
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Flag
} from "lucide-react";
import confetti from "canvas-confetti";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";

export default function PhuongTrinhBacNhatPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const steps = [
    {
      title: t('linear.definition'),
      content: t('linear.definition-content'),
      example: t('linear.definition-example'),
      type: "definition"
    },
    {
      title: t('linear.method'),
      content: t('linear.method-content'),
      example: t('linear.method-example'),
      type: "method"
    },
    {
      title: t('linear.example'),
      content: t('linear.example-content'),
      example: t('linear.example-solution'),
      type: "example"
    },
    {
      title: t('linear.practice'),
      content: t('linear.practice-content'),
      example: t('linear.practice-prompt'),
      type: "practice"
    }
  ];

  const correctAnswer = "2";

  // Play celebration sound
  const playCelebrationSound = () => {
    const audioContext = new (typeof window !== 'undefined' && window.AudioContext || (window as any).webkitAudioContext)();
    
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
    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
    
    notes.forEach((freq, index) => {
      playNote(freq, now + index * 0.15, 0.3);
    });
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
          xp: 20,
          subject: t('student.subject'),
          lessonTitle: t('linear.title')
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
      updateUserXP();
      playCelebrationSound();
      
      // Fire confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

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

      setTimeout(() => {
        confetti({
          particleCount: 200,
          spread: 90,
          origin: { y: 0.5 }
        });
      }, 2000);
    }
  }, [isCompleted, showCelebration]);

  const handleAnswerSubmit = () => {
    setShowResult(true);
    setIsCorrect(userAnswer.trim() === correctAnswer);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setUserAnswer("");
      setShowResult(false);
    } else {
      setIsCompleted(true);
      setTimeout(() => {
        router.push("/dashboard/learning?completed=2");
      }, 5000);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setUserAnswer("");
      setShowResult(false);
    } else {
      router.push("/dashboard/learning");
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="text-gray-400 hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">{t('linear.title')}</span>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <div className="flex items-center gap-1 text-yellow-400">
            <Star className="h-4 w-4" />
            <span className="text-sm">+20 t('student.xp')</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 mb-8">
        <div className="relative">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm border-4 border-slate-900"
            style={{ left: `calc(${progress}% - 16px)` }}
          >
            {currentStep + 1}
          </div>
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
            {steps.length}
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
                <h2 className="text-2xl font-bold">{t('student.congratulations')}</h2>
                <Trophy className="h-8 w-8 text-yellow-200" />
              </div>
              <p className="text-lg mb-2">{t('student.lesson-completed')}</p>
              <div className="flex items-center justify-center gap-2 text-yellow-200 mb-3">
                <Star className="h-5 w-5" />
                <span className="text-xl font-bold">+20 t('student.xp')</span>
                <Star className="h-5 w-5" />
              </div>
              <div className="text-sm text-yellow-200">
                {t('student.redirecting', { seconds: 5 })}
              </div>
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
              <div className="text-sm text-gray-400 mb-2">{t('student.lesson')}</div>
              <h1 className="text-4xl font-bold text-white mb-4">{steps[currentStep].title}</h1>
            </div>

            {/* Content */}
            <div className="mb-8">
              <div className="text-center mb-6">
                <p className="text-xl text-gray-300 mb-4">{steps[currentStep].content}</p>
                
                {/* Example */}
                <div className="bg-slate-700 p-6 rounded-xl mb-6">
                  <h3 className="font-semibold mb-3 text-gray-300">t('student.example'):</h3>
                  <p className="text-white font-mono text-lg">{steps[currentStep].example}</p>
                </div>

                {/* Interactive Exercise */}
                {currentStep === 3 && (
                  <div className="bg-blue-900/30 p-6 rounded-xl mb-6 border border-blue-500/30">
                    <h3 className="font-semibold mb-4 text-blue-300">t('linear.practice'): t('linear.practice-content')</h3>
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <span className="text-xl text-white">x =</span>
                      <Input
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        className="w-20 text-center text-lg bg-slate-700 border-slate-600 text-white"
                        placeholder="?"
                        disabled={showResult}
                      />
                    </div>
                    <Button 
                      onClick={handleAnswerSubmit}
                      disabled={showResult || !userAnswer.trim()}
                      className="mb-4 bg-blue-600 hover:bg-blue-700"
                    >
                      <Play className="h-4 w-4 mr-2" />{t('student.check')}</Button>
                    
                    {showResult && (
                      <div className={`p-4 rounded-lg border ${
                        isCorrect ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'
                      }`}>
                        <div className="flex items-center justify-center gap-2 mb-2">
                          {isCorrect ? (
                            <>
                              <CheckCircle className="h-5 w-5 text-green-400" />
                              <span className="font-semibold text-green-400">{t('student.correct')}</span>
                            </>
                          ) : (
                            <>
                              <X className="h-5 w-5 text-red-400" />
                              <span className="font-semibold text-red-400">{t('student.incorrect')}</span>
                            </>
                          )}
                        </div>
                        <p className="text-sm text-gray-300">
                          t('student.answer'): x = 2
                        </p>
                        <p className="text-sm text-gray-400 mt-1">{t('linear.practice-solution')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <Button 
                variant="ghost" 
                onClick={handleBack}
                disabled={currentStep === 0}
                className="text-gray-400 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />{t('student.previous')}</Button>
              
              <Button 
                onClick={handleNext} 
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={currentStep === 3 && !showResult}
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <Trophy className="h-4 w-4 mr-2" />{t('student.finish')}</>
                ) : (
                  <>{t('student.next')}<ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Points */}
      <div className="px-6 mt-8">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center mt-1">
                <Star className="h-4 w-4 text-yellow-900" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-400 mb-2">{t('student.key-points')}</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Phương trình bậc nhất có dạng ax + b = 0</li>
                  <li>• Nghiệm của phương trình là x = -b/a</li>
                  <li>• Khi a = 0 và b ≠ 0: phương trình vô nghiệm</li>
                  <li>• Khi a = 0 và b = 0: phương trình có vô số nghiệm</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="text-center text-gray-500 text-sm">
          t('student.subject') • {t('student.lesson-of', { current: currentStep + 1, total: steps.length })}
        </div>
      </div>
    </div>
  );
}
