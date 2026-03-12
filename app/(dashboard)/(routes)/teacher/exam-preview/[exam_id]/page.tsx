/**
 * Exam Preview Component
 * 
 * Display exam details with statistics
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ExamQuestion {
  question_id: string;
  position: number;
  assigned_score: number;
  question_type: string;
}

interface ExamStatistics {
  total_questions: number;
  easy_count: number;
  medium_count: number;
  hard_count: number;
  estimated_duration_minutes: number;
}

interface ExamPreview {
  success: boolean;
  exam: {
    exam_id: string;
    matrix_id: string;
    questions: ExamQuestion[];
    metadata: {
      generated_at: string;
      variant: string;
    };
  };
  statistics: ExamStatistics;
}

export default function ExamPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.exam_id as string;
  const [preview, setPreview] = useState<ExamPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const response = await fetch(`/api/ai/exam/preview/${examId}`);
        if (!response.ok) throw new Error('Failed to load exam');
        const data = await response.json();
        setPreview(data);
      } catch (error) {
        console.error('Error loading exam:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [examId]);

  const handleExportPDF = async () => {
    try {
      const response = await fetch(`/api/ai/exam/export/${examId}/pdf`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam-${examId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading exam...</div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-600">Exam not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Exam Preview - Variant {preview.exam.metadata.variant}
            </h1>
            <p className="text-muted-foreground">
              Generated: {new Date(preview.exam.metadata.generated_at).toLocaleString()}
            </p>
          </div>
          <Button onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {preview.statistics.total_questions}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {preview.statistics.estimated_duration_minutes} min
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Difficulty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Easy: {preview.statistics.easy_count}
              </Badge>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Medium: {preview.statistics.medium_count}
              </Badge>
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                Hard: {preview.statistics.hard_count}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {preview.exam.questions.map((q, idx) => (
              <div
                key={q.question_id}
                className="flex items-center justify-between p-3 border rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">Q{idx + 1}</span>
                  <Badge variant="outline">{q.question_type}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {q.question_id}
                  </span>
                </div>
                <span className="font-medium">{q.assigned_score} pts</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
