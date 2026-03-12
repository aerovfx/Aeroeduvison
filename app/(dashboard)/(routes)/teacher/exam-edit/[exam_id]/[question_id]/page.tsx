/**
 * Exam Edit - Swap Questions
 * 
 * Component for swapping questions in an exam
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, RefreshCw, Check } from 'lucide-react';

interface AlternativeQuestion {
  question_id: string;
  topic_name: string;
  cognitive_level: string;
  difficulty: number;
  similarity_score: number;
}

export default function ExamEditPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.exam_id as string;
  const questionId = params.question_id as string;

  const [alternatives, setAlternatives] = useState<AlternativeQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFindAlternatives = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/exam/swap-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: examId,
          question_id: questionId,
          constraints: {},
        }),
      });

      if (!response.ok) throw new Error('Failed to find alternatives');

      const data = await response.json();
      setAlternatives(data.alternatives);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!selectedQuestion) return;

    try {
      const response = await fetch('/api/ai/exam/swap-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: examId,
          question_id: questionId,
          new_question_id: selectedQuestion,
        }),
      });

      if (!response.ok) throw new Error('Swap failed');

      setSuccess('Question swapped successfully!');
      setTimeout(() => router.push(`/teacher/exam-preview/${examId}`), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swap failed');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <h1 className="text-3xl font-bold mb-6">Swap Question</h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200 mb-6">
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Question</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 border rounded">
              <p className="font-medium">Question ID: {questionId}</p>
              <Button onClick={handleFindAlternatives} disabled={isLoading} className="mt-4">
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Finding...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Find Alternatives
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alternative Questions</CardTitle>
          </CardHeader>
          <CardContent>
            {alternatives.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Click "Find Alternatives" to see options
              </p>
            ) : (
              <div className="space-y-2">
                {alternatives.map((alt) => (
                  <div
                    key={alt.question_id}
                    className={`p-3 border rounded cursor-pointer transition-colors ${
                      selectedQuestion === alt.question_id
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedQuestion(alt.question_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{alt.topic_name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">{alt.cognitive_level}</Badge>
                          <Badge variant="secondary">
                            Difficulty: {alt.difficulty.toFixed(2)}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          Similarity: {(alt.similarity_score * 100).toFixed(0)}%
                        </p>
                        {selectedQuestion === alt.question_id && (
                          <Check className="h-4 w-4 text-blue-600 mt-1" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedQuestion && (
        <div className="mt-6">
          <Button onClick={handleSwap} className="w-full">
            Swap Question
          </Button>
        </div>
      )}
    </div>
  );
}
