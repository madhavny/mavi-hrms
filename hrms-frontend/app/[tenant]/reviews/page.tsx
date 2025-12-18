'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  reviewsApi,
  ReviewCycle,
  PerformanceReview,
  ReviewQuestion,
  ReviewStats,
  ReviewCycleStatus,
  ReviewStatus,
  tenantApi,
} from '@/lib/api';
import {
  ClipboardList,
  Plus,
  Calendar,
  Users,
  Star,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  FileText,
  User,
  Edit,
  Trash2,
  ChevronRight,
} from 'lucide-react';

const CYCLE_STATUS_CONFIG: Record<ReviewCycleStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
  ACTIVE: { label: 'Active', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  COMPLETED: { label: 'Completed', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
};

const REVIEW_STATUS_CONFIG: Record<ReviewStatus, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: 'Pending', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300', icon: Clock },
  SELF_REVIEW: { label: 'Self Review', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', icon: Edit },
  MANAGER_REVIEW: { label: 'Manager Review', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', icon: User },
  CALIBRATION: { label: 'Calibration', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', icon: Users },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', icon: CheckCircle2 },
};

export default function ReviewsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  const [activeTab, setActiveTab] = useState('cycles');
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [user, setUser] = useState<{ id: number; role?: { code: string } } | null>(null);

  // Filters
  const [filterMyReviews, setFilterMyReviews] = useState(false);
  const [filterToReview, setFilterToReview] = useState(false);

  // Create Cycle Modal
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [cycleForm, setCycleForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    selfReviewDeadline: '',
    managerReviewDeadline: '',
  });

  // Create Question Modal
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionForm, setQuestionForm] = useState({
    question: '',
    description: '',
    category: 'COMPETENCY' as const,
    type: 'RATING' as const,
    isRequired: true,
  });

  // Activate Cycle Modal
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [selectedCycleForActivation, setSelectedCycleForActivation] = useState<ReviewCycle | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    loadData();
  }, [filterMyReviews, filterToReview]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cyclesRes, reviewsRes, questionsRes, statsRes, deptsRes] = await Promise.all([
        reviewsApi.listCycles(),
        reviewsApi.listReviews({ myReviews: filterMyReviews, toReview: filterToReview }),
        reviewsApi.listQuestions(),
        reviewsApi.getStats(),
        tenantApi.getDepartments(),
      ]);

      if (cyclesRes.data) setCycles(cyclesRes.data.data || []);
      if (reviewsRes.data) setReviews(reviewsRes.data.data || []);
      if (questionsRes.data) setQuestions(questionsRes.data);
      if (statsRes.data) setStats(statsRes.data);
      if (deptsRes.data) setDepartments(deptsRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCycle = async () => {
    try {
      await reviewsApi.createCycle({
        name: cycleForm.name,
        description: cycleForm.description || undefined,
        startDate: cycleForm.startDate,
        endDate: cycleForm.endDate,
        selfReviewDeadline: cycleForm.selfReviewDeadline || undefined,
        managerReviewDeadline: cycleForm.managerReviewDeadline || undefined,
      });
      setShowCycleModal(false);
      setCycleForm({ name: '', description: '', startDate: '', endDate: '', selfReviewDeadline: '', managerReviewDeadline: '' });
      loadData();
    } catch (err) {
      console.error('Failed to create cycle:', err);
    }
  };

  const handleDeleteCycle = async (id: number) => {
    if (!confirm('Are you sure you want to delete this cycle?')) return;
    try {
      await reviewsApi.deleteCycle(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete cycle:', err);
    }
  };

  const handleActivateCycle = async () => {
    if (!selectedCycleForActivation) return;
    try {
      await reviewsApi.activateCycle(selectedCycleForActivation.id, {
        departmentIds: selectedDepartments.length > 0 ? selectedDepartments : undefined,
      });
      setShowActivateModal(false);
      setSelectedCycleForActivation(null);
      setSelectedDepartments([]);
      loadData();
    } catch (err) {
      console.error('Failed to activate cycle:', err);
    }
  };

  const handleCreateQuestion = async () => {
    try {
      await reviewsApi.createQuestion({
        question: questionForm.question,
        description: questionForm.description || undefined,
        category: questionForm.category,
        type: questionForm.type,
        isRequired: questionForm.isRequired,
      });
      setShowQuestionModal(false);
      setQuestionForm({ question: '', description: '', category: 'COMPETENCY', type: 'RATING', isRequired: true });
      loadData();
    } catch (err) {
      console.error('Failed to create question:', err);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await reviewsApi.deleteQuestion(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  };

  const getRatingStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        ))}
        <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const isAdmin = user?.role?.code === 'ADMIN' || user?.role?.code === 'HR';

  if (loading) {
    return (
      <DashboardLayout title="Performance Reviews">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Performance Reviews">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Reviews</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.total}</p>
                </div>
                <ClipboardList className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.completionRate}%</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg Rating</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.avgFinalRating?.toFixed(1) || '-'}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.byStatus?.PENDING || 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="cycles">Review Cycles</TabsTrigger>
            <TabsTrigger value="reviews">My Reviews</TabsTrigger>
            {isAdmin && <TabsTrigger value="questions">Questions</TabsTrigger>}
          </TabsList>

          {isAdmin && activeTab === 'cycles' && (
            <Button onClick={() => setShowCycleModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Cycle
            </Button>
          )}
          {isAdmin && activeTab === 'questions' && (
            <Button onClick={() => setShowQuestionModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Question
            </Button>
          )}
        </div>

        {/* Cycles Tab */}
        <TabsContent value="cycles">
          <div className="space-y-4">
            {cycles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ClipboardList className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No review cycles</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Create a review cycle to start performance reviews</p>
                  {isAdmin && (
                    <Button onClick={() => setShowCycleModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Cycle
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              cycles.map((cycle) => (
                <Card key={cycle.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-lg dark:text-white">{cycle.name}</h3>
                          <Badge className={CYCLE_STATUS_CONFIG[cycle.status].color}>
                            {CYCLE_STATUS_CONFIG[cycle.status].label}
                          </Badge>
                        </div>
                        {cycle.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{cycle.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            <span>{cycle._count?.questions || 0} questions</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{cycle._count?.reviews || 0} reviews</span>
                          </div>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          {cycle.status === 'DRAFT' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedCycleForActivation(cycle);
                                setShowActivateModal(true);
                              }}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Activate
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCycle(cycle.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <Button
              variant={filterMyReviews ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setFilterMyReviews(!filterMyReviews); setFilterToReview(false); }}
            >
              My Reviews
            </Button>
            <Button
              variant={filterToReview ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setFilterToReview(!filterToReview); setFilterMyReviews(false); }}
            >
              To Review
            </Button>
          </div>

          <div className="space-y-4">
            {reviews.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ClipboardList className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No reviews found</h3>
                  <p className="text-gray-500 dark:text-gray-400">Reviews will appear here when a cycle is active</p>
                </CardContent>
              </Card>
            ) : (
              reviews.map((review) => (
                <Card key={review.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={review.employee?.avatar || undefined} />
                        <AvatarFallback>
                          {review.employee?.firstName?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-medium dark:text-white">
                            {review.employee?.firstName} {review.employee?.lastName}
                          </h3>
                          <Badge className={REVIEW_STATUS_CONFIG[review.status].color}>
                            {REVIEW_STATUS_CONFIG[review.status].label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {review.cycle?.name} | Reviewer: {review.reviewer?.firstName} {review.reviewer?.lastName}
                        </p>
                        <div className="flex items-center gap-6 mt-2">
                          {review.selfRating && (
                            <div className="text-sm">
                              <span className="text-gray-500">Self: </span>
                              {getRatingStars(review.selfRating)}
                            </div>
                          )}
                          {review.managerRating && (
                            <div className="text-sm">
                              <span className="text-gray-500">Manager: </span>
                              {getRatingStars(review.managerRating)}
                            </div>
                          )}
                          {review.finalRating && (
                            <div className="text-sm">
                              <span className="text-gray-500">Final: </span>
                              {getRatingStars(review.finalRating)}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/${tenantSlug}/reviews/${review.id}`)}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Questions Tab */}
        {isAdmin && (
          <TabsContent value="questions">
            <div className="space-y-4">
              {questions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No questions</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Create questions to use in review cycles</p>
                    <Button onClick={() => setShowQuestionModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Question
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                questions.map((q) => (
                  <Card key={q.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{q.category}</Badge>
                            <Badge variant="outline">{q.type}</Badge>
                            {q.isRequired && <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">Required</Badge>}
                          </div>
                          <p className="font-medium dark:text-white">{q.question}</p>
                          {q.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{q.description}</p>}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteQuestion(q.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Create Cycle Modal */}
      <Dialog open={showCycleModal} onOpenChange={setShowCycleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Review Cycle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={cycleForm.name}
                onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
                placeholder="e.g., Q1 2025 Review"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={cycleForm.description}
                onChange={(e) => setCycleForm({ ...cycleForm, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={cycleForm.startDate}
                  onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={cycleForm.endDate}
                  onChange={(e) => setCycleForm({ ...cycleForm, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Self Review Deadline</Label>
                <Input
                  type="date"
                  value={cycleForm.selfReviewDeadline}
                  onChange={(e) => setCycleForm({ ...cycleForm, selfReviewDeadline: e.target.value })}
                />
              </div>
              <div>
                <Label>Manager Review Deadline</Label>
                <Input
                  type="date"
                  value={cycleForm.managerReviewDeadline}
                  onChange={(e) => setCycleForm({ ...cycleForm, managerReviewDeadline: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCycleModal(false)}>Cancel</Button>
            <Button onClick={handleCreateCycle} disabled={!cycleForm.name || !cycleForm.startDate || !cycleForm.endDate}>
              Create Cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Question Modal */}
      <Dialog open={showQuestionModal} onOpenChange={setShowQuestionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Review Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Question *</Label>
              <Input
                value={questionForm.question}
                onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                placeholder="e.g., How well does the employee communicate?"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={questionForm.description}
                onChange={(e) => setQuestionForm({ ...questionForm, description: e.target.value })}
                placeholder="Additional context for the question"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={questionForm.category}
                  onValueChange={(v) => setQuestionForm({ ...questionForm, category: v as typeof questionForm.category })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPETENCY">Competency</SelectItem>
                    <SelectItem value="BEHAVIOR">Behavior</SelectItem>
                    <SelectItem value="GOALS">Goals</SelectItem>
                    <SelectItem value="CULTURE">Culture</SelectItem>
                    <SelectItem value="LEADERSHIP">Leadership</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={questionForm.type}
                  onValueChange={(v) => setQuestionForm({ ...questionForm, type: v as typeof questionForm.type })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RATING">Rating (1-5)</SelectItem>
                    <SelectItem value="TEXT">Text Response</SelectItem>
                    <SelectItem value="YES_NO">Yes/No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuestionModal(false)}>Cancel</Button>
            <Button onClick={handleCreateQuestion} disabled={!questionForm.question}>
              Create Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Cycle Modal */}
      <Dialog open={showActivateModal} onOpenChange={setShowActivateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Review Cycle</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              Select departments to include in this review cycle. Leave empty to include all employees with managers.
            </p>
            <div className="space-y-2">
              {departments.map((dept) => (
                <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDepartments.includes(dept.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDepartments([...selectedDepartments, dept.id]);
                      } else {
                        setSelectedDepartments(selectedDepartments.filter(d => d !== dept.id));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="dark:text-white">{dept.name}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivateModal(false)}>Cancel</Button>
            <Button onClick={handleActivateCycle}>
              <Play className="h-4 w-4 mr-1" />
              Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
