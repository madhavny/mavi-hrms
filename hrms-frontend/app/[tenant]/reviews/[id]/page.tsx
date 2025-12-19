'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  reviewsApi,
  PerformanceReview,
  ReviewQuestion,
  SelfReviewInput,
  ManagerReviewInput,
} from '@/lib/api';
import { ArrowLeft, Star, Save, CheckCircle2, Clock, User, AlertCircle } from 'lucide-react';

const REVIEW_STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
  SELF_REVIEW: { label: 'Self Review Submitted', color: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400' },
  MANAGER_REVIEW: { label: 'Manager Review In Progress', color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400' },
  CALIBRATION: { label: 'Calibration', color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' },
};

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;
  const reviewId = parseInt(params.id as string);

  const [review, setReview] = useState<PerformanceReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<{ id: number; role?: { code: string } } | null>(null);

  // Form state for responses
  const [responses, setResponses] = useState<Record<number, { rating?: number; response?: string }>>({});
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [comments, setComments] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    loadReview();
  }, [reviewId]);

  const loadReview = async () => {
    setLoading(true);
    try {
      const res = await reviewsApi.getReview(reviewId);
      if (res.data) {
        setReview(res.data);
        // Pre-fill existing responses
        if (res.data.responses) {
          const responseMap: Record<number, { rating?: number; response?: string }> = {};
          res.data.responses.forEach((r) => {
            responseMap[r.questionId] = { rating: r.rating || undefined, response: r.response || undefined };
          });
          setResponses(responseMap);
        }
        // Pre-fill feedback
        if (res.data.selfStrengths) setStrengths(res.data.selfStrengths);
        if (res.data.selfImprovements) setImprovements(res.data.selfImprovements);
        if (res.data.selfComments) setComments(res.data.selfComments);
      }
    } catch (err) {
      console.error('Failed to load review:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (questionId: number, rating: number) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], rating },
    }));
  };

  const handleResponseChange = (questionId: number, response: string) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], response },
    }));
  };

  const handleSubmitSelfReview = async () => {
    if (!review) return;
    setSaving(true);
    try {
      const data: SelfReviewInput = {
        responses: Object.entries(responses).map(([qId, r]) => ({
          questionId: parseInt(qId),
          rating: r.rating,
          response: r.response,
        })),
        strengths,
        improvements,
        comments,
      };
      await reviewsApi.submitSelfReview(reviewId, data);
      loadReview();
    } catch (err) {
      console.error('Failed to submit self review:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitManagerReview = async () => {
    if (!review) return;
    setSaving(true);
    try {
      const data: ManagerReviewInput = {
        responses: Object.entries(responses).map(([qId, r]) => ({
          questionId: parseInt(qId),
          rating: r.rating,
          response: r.response,
        })),
        strengths,
        improvements,
        comments,
      };
      await reviewsApi.submitManagerReview(reviewId, data);
      loadReview();
    } catch (err) {
      console.error('Failed to submit manager review:', err);
    } finally {
      setSaving(false);
    }
  };

  const renderRatingInput = (questionId: number) => {
    const currentRating = responses[questionId]?.rating || 0;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleRatingChange(questionId, star)}
            className="p-1 hover:scale-110 transition-transform cursor-pointer"
          >
            <Star
              className={`h-6 w-6 ${
                star <= currentRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-200 dark:hover:text-yellow-300'
              }`}
            />
          </button>
        ))}
        {currentRating > 0 && (
          <span className="ml-2 text-sm font-medium text-gray-600 dark:text-gray-400">{currentRating}/5</span>
        )}
      </div>
    );
  };

  const renderQuestion = (question: ReviewQuestion) => {
    return (
      <div key={question.id} className="p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <div className="flex items-start gap-2 mb-3">
          <Badge variant="outline" className="text-xs">{question.category}</Badge>
          {question.isRequired && <Badge className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 text-xs">Required</Badge>}
        </div>
        <p className="font-medium mb-3 text-gray-900 dark:text-gray-100">{question.question}</p>
        {question.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{question.description}</p>
        )}

        {question.type === 'RATING' && renderRatingInput(question.id)}

        {question.type === 'TEXT' && (
          <Textarea
            value={responses[question.id]?.response || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder="Enter your response..."
            rows={3}
          />
        )}

        {question.type === 'YES_NO' && (
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={responses[question.id]?.response === 'Yes'}
                onChange={() => handleResponseChange(question.id, 'Yes')}
              />
              <span>Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={responses[question.id]?.response === 'No'}
                onChange={() => handleResponseChange(question.id, 'No')}
              />
              <span>No</span>
            </label>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout title="Performance Review">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!review) {
    return (
      <DashboardLayout title="Performance Review">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Review not found</h3>
        </div>
      </DashboardLayout>
    );
  }

  const isEmployee = user?.id === review.employeeId;
  const isReviewer = user?.id === review.reviewerId;
  const canSubmitSelfReview = isEmployee && (review.status === 'PENDING' || review.status === 'SELF_REVIEW');
  const canSubmitManagerReview = isReviewer && (review.status === 'SELF_REVIEW' || review.status === 'MANAGER_REVIEW');

  return (
    <DashboardLayout title="Performance Review">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/${tenantSlug}/reviews`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Employee Info Card */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={review.employee?.avatar || undefined} />
              <AvatarFallback className="text-xl">
                {review.employee?.firstName?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {review.employee?.firstName} {review.employee?.lastName}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {review.employee?.designation?.name} | {review.employee?.department?.name}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Reviewer: {review.reviewer?.firstName} {review.reviewer?.lastName}
              </p>
            </div>
            <div className="text-right">
              <Badge className={REVIEW_STATUS_CONFIG[review.status].color}>
                {REVIEW_STATUS_CONFIG[review.status].label}
              </Badge>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{review.cycle?.name}</p>
            </div>
          </div>

          {/* Ratings Summary */}
          {(review.selfRating || review.managerRating || review.finalRating) && (
            <div className="flex flex-wrap items-center gap-8 mt-4 pt-4 border-t dark:border-gray-700">
              {review.selfRating && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Self Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{review.selfRating.toFixed(1)}</span>
                  </div>
                </div>
              )}
              {review.managerRating && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manager Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{review.managerRating.toFixed(1)}</span>
                  </div>
                </div>
              )}
              {review.finalRating && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Final Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 text-green-500 fill-green-500" />
                    <span className="font-semibold text-green-600 dark:text-green-400">{review.finalRating.toFixed(1)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Form */}
      {review.cycle?.questions && review.cycle.questions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Review Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {review.cycle.questions.map((cq) => renderQuestion(cq.question))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Strengths</Label>
            <Textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="What are the key strengths?"
              rows={3}
              disabled={review.status === 'COMPLETED'}
            />
          </div>
          <div>
            <Label>Areas for Improvement</Label>
            <Textarea
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              placeholder="What areas need improvement?"
              rows={3}
              disabled={review.status === 'COMPLETED'}
            />
          </div>
          <div>
            <Label>Additional Comments</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Any additional comments..."
              rows={3}
              disabled={review.status === 'COMPLETED'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Completed Review Summary */}
      {review.status === 'COMPLETED' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Review Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Self Assessment</h4>
                {review.selfStrengths && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Strengths:</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{review.selfStrengths}</p>
                  </div>
                )}
                {review.selfImprovements && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Areas for Improvement:</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{review.selfImprovements}</p>
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Manager Assessment</h4>
                {review.managerStrengths && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Strengths:</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{review.managerStrengths}</p>
                  </div>
                )}
                {review.managerImprovements && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Areas for Improvement:</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{review.managerImprovements}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Buttons */}
      <div className="flex justify-end gap-4">
        {canSubmitSelfReview && (
          <Button onClick={handleSubmitSelfReview} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Submit Self Review'}
          </Button>
        )}
        {canSubmitManagerReview && (
          <Button onClick={handleSubmitManagerReview} disabled={saving}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Complete Review'}
          </Button>
        )}
      </div>
    </DashboardLayout>
  );
}
