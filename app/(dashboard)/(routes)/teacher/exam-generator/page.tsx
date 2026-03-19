/**
 * Teacher Dashboard - Exam Generation
 * 
 * Component for generating exams from matrices
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, Download, RefreshCw, CheckCircle2 } from 'lucide-react';

interface ExamGenerationOptions {
  exam_variant: string;
  shuffle_questions: boolean;
  ensure_no_overlap: boolean;
}

interface GeneratedExam {
  exam_id: string;
  matrix_id: string;
  teacher_id: string;
  questions: ExamQuestion[];
  metadata: ExamMetadata;
}

interface ExamQuestion {
  question_id: string;
  position: number;
  assigned_score: number;
  question_type: string;
}

interface ExamMetadata {
  generated_at: string;
  variant: string;
  generation_time_ms: number;
  llm_model: string;
}

export function TeacherExamDashboard() {
  const [matrixId, setMatrixId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [variantCount, setVariantCount] = useState(1);
  const [options, setOptions] = useState<ExamGenerationOptions>({
    exam_variant: 'A',
    shuffle_questions: true,
    ensure_no_overlap: true,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedExams, setGeneratedExams] = useState<GeneratedExam[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGenerateExam = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const endpoint = variantCount > 1 
        ? '/api/ai/exam/generate-multiple-variants'
        : '/api/ai/exam/generate-from-matrix';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matrix_id: matrixId,
          teacher_id: teacherId,
          variant_count: variantCount,
          options,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate exam');
      }

      const data = await response.json();
      
      if (variantCount > 1) {
        setGeneratedExams(data.variants);
        setSuccess(`Generated ${data.variants.length} exam variants successfully!`);
      } else {
        setGeneratedExams([data.exam]);
        setSuccess('Exam generated successfully!');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = async (examId: string, variant: string) => {
    try {
      const response = await fetch(`/api/ai/exam/export/${examId}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam-${examId}-${variant}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to export PDF');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Exam Generation Dashboard</h1>
        <p className="text-muted-foreground">
          Generate exams from matrices using AI
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Generation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Exam</CardTitle>
            <CardDescription>
              Create exams from your matrix
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="matrix">Matrix ID</Label>
              <Input
                id="matrix"
                value={matrixId}
                onChange={(e) => setMatrixId(e.target.value)}
                placeholder="matrix_math_11_hk1_2026"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacher">Teacher ID</Label>
              <Input
                id="teacher"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                placeholder="teacher_123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="variants">Number of Variants</Label>
              <Select
                value={variantCount.toString()}
                onValueChange={(v) => setVariantCount(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select variants" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} variant{n > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="shuffle">Shuffle Questions</Label>
              <Switch
                id="shuffle"
                checked={options.shuffle_questions}
                onCheckedChange={(v) =>
                  setOptions({ ...options, shuffle_questions: v })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="overlap">Ensure No Overlap</Label>
              <Switch
                id="overlap"
                checked={options.ensure_no_overlap}
                onCheckedChange={(v) =>
                  setOptions({ ...options, ensure_no_overlap: v })
                }
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleGenerateExam}
              disabled={isGenerating || !matrixId || !teacherId}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Exam
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Exams */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Exams</CardTitle>
            <CardDescription>
              Your recently generated exams
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedExams.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No exams generated yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {generatedExams.map((exam, idx) => (
                  <div
                    key={exam.exam_id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        Variant {exam.metadata.variant}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {exam.questions.length} questions •{' '}
                        {exam.metadata.generation_time_ms}ms
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        size="sm"
                        onClick={() => handleExportPDF(exam.exam_id, exam.metadata.variant)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        size="sm"
                        onClick={() => window.open(`/exam/${exam.exam_id}/preview`, '_blank')}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
