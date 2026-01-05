'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Award,
  AlertTriangle,
  Loader2,
  Send,
  FileText,
  BarChart3
} from 'lucide-react';

interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  dueDate: string;
  maxScore: number;
}

interface GradingResult {
  submissionId: string;
  score: number;
  percentage: number;
  grade: string;
  confidence: number;
  feedback: {
    summary: string;
    strengths: string[];
    improvements: string[];
    suggestions: string[];
  };
  criteriaScores: Array<{
    name: string;
    score: number;
    maxScore: number;
    weight: number;
    feedback: string;
  }>;
  needsReview: boolean;
  status: string;
  metadata?: {
    attempts: number;
    classAverage: number;
    percentile: number;
  };
}

interface StudentGradingViewProps {
  assignment: Assignment;
  existingSubmission?: {
    id: string;
    content: string;
    result?: GradingResult;
  };
}

export default function StudentGradingView({
  assignment,
  existingSubmission
}: StudentGradingViewProps) {
  const [submission, setSubmission] = useState(existingSubmission?.content || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(existingSubmission?.result || null);
  const [error, setError] = useState<string | null>(null);

  const wordCount = submission.trim().split(/\s+/).filter(w => w.length > 0).length;
  const minWords = 100;
  const isValid = wordCount >= minWords;

  const handleSubmit = async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/grading/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: assignment.id,
          submission,
          subject: assignment.subject,
          assignmentType: 'essay',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Failed to submit assignment');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      {/* Assignment Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{assignment.title}</CardTitle>
              <CardDescription className="mt-2">{assignment.description}</CardDescription>
            </div>
            <Badge variant="outline" className="capitalize">
              {assignment.subject}
            </Badge>
          </div>

          <div className="flex gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Award className="h-4 w-4" />
              <span>Max Score: {assignment.maxScore}/10</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Submission Form */}
      {!result && (
        <Card>
          <CardHeader>
            <CardTitle>Your Submission</CardTitle>
            <CardDescription>
              Write your answer below. Minimum {minWords} words required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={submission}
              onChange={(e) => setSubmission(e.target.value)}
              placeholder="Start writing your answer here..."
              className="min-h-[300px] font-mono text-sm"
              disabled={isSubmitting}
            />

            <div className="flex justify-between items-center">
              <div className="text-sm">
                <span className={wordCount >= minWords ? 'text-green-600 font-medium' : 'text-gray-600'}>
                  {wordCount} words
                </span>
                <span className="text-gray-400 ml-2">
                  (minimum: {minWords})
                </span>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Grading...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit
                  </>
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grading Result */}
      {result && (
        <div className="space-y-6">
          {/* Overall Score Card */}
          <Card className="border-2 border-blue-200 bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-600 text-white mb-4">
                  <span className="text-4xl font-bold">{result.score.toFixed(1)}</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Grade: {result.grade}
                </h2>
                <p className="text-lg text-gray-600">
                  {result.percentage.toFixed(0)}% - {getGradeLabel(result.grade)}
                </p>
              </div>

              {result.needsReview && (
                <Alert className="mb-4">
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Your submission is under human review. Final grade may be adjusted.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <MetricBadge
                  icon={<BarChart3 className="h-4 w-4" />}
                  label="Confidence"
                  value={`${(result.confidence * 100).toFixed(0)}%`}
                  color="blue"
                />
                {result.metadata && (
                  <>
                    <MetricBadge
                      icon={<TrendingUp className="h-4 w-4" />}
                      label="Class Avg"
                      value={result.metadata.classAverage.toFixed(1)}
                      color="green"
                    />
                    <MetricBadge
                      icon={<Award className="h-4 w-4" />}
                      label="Percentile"
                      value={`${Math.round(result.metadata.percentile)}th`}
                      color="purple"
                    />
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Feedback */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Feedback</CardTitle>
              <CardDescription>AI-generated assessment of your work</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                <p className="text-gray-700 leading-relaxed">{result.feedback.summary}</p>
              </div>

              {/* Strengths */}
              {result.feedback.strengths.length > 0 && (
                <div>
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {result.feedback.strengths.map((strength, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700">
                        <span className="text-green-600 mt-1">•</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Areas for Improvement */}
              {result.feedback.improvements.length > 0 && (
                <div>
                  <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-2">
                    {result.feedback.improvements.map((improvement, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700">
                        <span className="text-orange-600 mt-1">•</span>
                        <span>{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {result.feedback.suggestions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Suggestions for Next Time
                  </h3>
                  <ul className="space-y-2">
                    {result.feedback.suggestions.map((suggestion, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Criteria Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Score Breakdown</CardTitle>
              <CardDescription>Detailed assessment by criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.criteriaScores.map((criterion, i) => (
                  <CriterionScore key={i} criterion={criterion} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setSubmission('');
              }}
            >
              Submit New Version
            </Button>
            <Button onClick={() => window.print()}>
              <FileText className="h-4 w-4 mr-2" />
              Print Result
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Metric Badge Component
function MetricBadge({
  icon,
  label,
  value,
  color
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
  }[color];

  return (
    <div className={`p-3 rounded-lg ${colorClasses} text-center`}>
      <div className="flex items-center justify-center gap-1 mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

// Criterion Score Component
function CriterionScore({
  criterion
}: {
  criterion: {
    name: string;
    score: number;
    maxScore: number;
    weight: number;
    feedback: string;
  };
}) {
  const percentage = (criterion.score / criterion.maxScore) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{criterion.name}</span>
          <Badge variant="secondary" className="text-xs">
            {(criterion.weight * 100).toFixed(0)}%
          </Badge>
        </div>
        <span className="font-semibold text-gray-900">
          {criterion.score.toFixed(1)}/{criterion.maxScore}
        </span>
      </div>

      <Progress value={percentage} className="h-2" />

      {criterion.feedback && (
        <p className="text-sm text-gray-600 italic">{criterion.feedback}</p>
      )}
    </div>
  );
}

// Helper function
function getGradeLabel(grade: string): string {
  const labels = {
    'A': 'Excellent',
    'B': 'Good',
    'C': 'Satisfactory',
    'D': 'Needs Improvement',
    'F': 'Unsatisfactory',
  };
  return labels[grade as keyof typeof labels] || grade;
}
