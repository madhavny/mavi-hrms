'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  goalsApi,
  Goal,
  GoalType,
  GoalCategory,
  GoalStatus,
  GoalStats,
  KeyResult,
  tenantApi,
} from '@/lib/api';
import {
  Target,
  Plus,
  Calendar,
  User,
  Building2,
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
} from 'lucide-react';

const STATUS_CONFIG: Record<GoalStatus, { label: string; color: string; icon: typeof Clock }> = {
  NOT_STARTED: { label: 'Not Started', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', icon: TrendingUp },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', icon: XCircle },
};

const TYPE_CONFIG: Record<GoalType, { label: string; color: string }> = {
  INDIVIDUAL: { label: 'Individual', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  TEAM: { label: 'Team', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  COMPANY: { label: 'Company', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
};

const CATEGORY_CONFIG: Record<GoalCategory, { label: string; color: string }> = {
  OKR: { label: 'OKR', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
  KPI: { label: 'KPI', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' },
};

export default function GoalsPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [goals, setGoals] = useState<Goal[]>([]);
  const [stats, setStats] = useState<GoalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: number; firstName: string; lastName?: string }[]>([]);

  // Filters
  const [filterType, setFilterType] = useState<GoalType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<GoalCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<GoalStatus | 'all'>('all');
  const [myGoals, setMyGoals] = useState(false);

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'INDIVIDUAL' as GoalType,
    category: 'OKR' as GoalCategory,
    targetValue: '',
    unit: '',
    startDate: '',
    dueDate: '',
    departmentId: '',
    assignedUserId: '',
    parentId: '',
  });

  // Key result modal
  const [showKRModal, setShowKRModal] = useState(false);
  const [selectedGoalForKR, setSelectedGoalForKR] = useState<Goal | null>(null);
  const [krFormData, setKRFormData] = useState({
    title: '',
    description: '',
    targetValue: '',
    unit: '',
  });

  // Update progress modal
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedGoalForProgress, setSelectedGoalForProgress] = useState<Goal | null>(null);
  const [progressValue, setProgressValue] = useState('');

  // Expanded goals (for tree view)
  const [expandedGoals, setExpandedGoals] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
  }, [filterType, filterCategory, filterStatus, myGoals]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [goalsRes, statsRes, deptsRes, usersRes] = await Promise.all([
        goalsApi.list({
          type: filterType !== 'all' ? filterType : undefined,
          category: filterCategory !== 'all' ? filterCategory : undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          myGoals,
          includeKeyResults: true,
        }),
        goalsApi.getStats(),
        tenantApi.getDepartments(),
        tenantApi.getUsers({ limit: 100 }),
      ]);

      if (goalsRes.data) setGoals(goalsRes.data.data || []);
      if (statsRes.data) setStats(statsRes.data);
      if (deptsRes.data) setDepartments(deptsRes.data);
      if (usersRes.data) setUsers(usersRes.data.users || []);
    } catch (err) {
      console.error('Failed to load goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    try {
      const data = {
        title: formData.title,
        description: formData.description || undefined,
        type: formData.type,
        category: formData.category,
        targetValue: formData.targetValue ? parseFloat(formData.targetValue) : undefined,
        unit: formData.unit || undefined,
        startDate: formData.startDate,
        dueDate: formData.dueDate,
        departmentId: formData.departmentId ? parseInt(formData.departmentId) : undefined,
        assignedUserId: formData.assignedUserId ? parseInt(formData.assignedUserId) : undefined,
        parentId: formData.parentId ? parseInt(formData.parentId) : undefined,
      };

      if (editingGoal) {
        await goalsApi.update(editingGoal.id, data);
      } else {
        await goalsApi.create(data);
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to save goal:', err);
    }
  };

  const handleDeleteGoal = async (id: number) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await goalsApi.delete(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  const handleAddKeyResult = async () => {
    if (!selectedGoalForKR) return;
    try {
      await goalsApi.addKeyResult(selectedGoalForKR.id, {
        title: krFormData.title,
        description: krFormData.description || undefined,
        targetValue: parseFloat(krFormData.targetValue),
        unit: krFormData.unit || undefined,
      });
      setShowKRModal(false);
      setKRFormData({ title: '', description: '', targetValue: '', unit: '' });
      loadData();
    } catch (err) {
      console.error('Failed to add key result:', err);
    }
  };

  const handleUpdateKRProgress = async (goalId: number, kr: KeyResult, newValue: number) => {
    try {
      await goalsApi.updateKeyResult(goalId, kr.id, { currentValue: newValue });
      loadData();
    } catch (err) {
      console.error('Failed to update key result:', err);
    }
  };

  const handleDeleteKeyResult = async (goalId: number, krId: number) => {
    if (!confirm('Are you sure you want to delete this key result?')) return;
    try {
      await goalsApi.deleteKeyResult(goalId, krId);
      loadData();
    } catch (err) {
      console.error('Failed to delete key result:', err);
    }
  };

  const handleUpdateProgress = async () => {
    if (!selectedGoalForProgress || !progressValue) return;
    try {
      await goalsApi.updateProgress(selectedGoalForProgress.id, parseFloat(progressValue));
      setShowProgressModal(false);
      setProgressValue('');
      loadData();
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  const resetForm = () => {
    setEditingGoal(null);
    setFormData({
      title: '',
      description: '',
      type: 'INDIVIDUAL',
      category: 'OKR',
      targetValue: '',
      unit: '',
      startDate: '',
      dueDate: '',
      departmentId: '',
      assignedUserId: '',
      parentId: '',
    });
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      type: goal.type,
      category: goal.category,
      targetValue: goal.targetValue?.toString() || '',
      unit: goal.unit || '',
      startDate: goal.startDate.split('T')[0],
      dueDate: goal.dueDate.split('T')[0],
      departmentId: goal.departmentId?.toString() || '',
      assignedUserId: goal.userId?.toString() || '',
      parentId: goal.parentId?.toString() || '',
    });
    setShowModal(true);
  };

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedGoals(newExpanded);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 70) return 'bg-blue-500';
    if (progress >= 30) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const isOverdue = (dueDate: string, status: GoalStatus) => {
    if (status === 'COMPLETED' || status === 'CANCELLED') return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <DashboardLayout title="Goals">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Goals & OKRs">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Goals</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.total}</p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Average Progress</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.avgProgress.toFixed(0)}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.byStatus?.COMPLETED || 0}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Select value={filterType} onValueChange={(v) => setFilterType(v as GoalType | 'all')}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="INDIVIDUAL">Individual</SelectItem>
            <SelectItem value="TEAM">Team</SelectItem>
            <SelectItem value="COMPANY">Company</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as GoalCategory | 'all')}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="OKR">OKR</SelectItem>
            <SelectItem value="KPI">KPI</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as GoalStatus | 'all')}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="NOT_STARTED">Not Started</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={myGoals ? 'default' : 'outline'}
          onClick={() => setMyGoals(!myGoals)}
        >
          My Goals
        </Button>

        <div className="ml-auto">
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No goals found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first goal to start tracking progress</p>
              <Button onClick={() => { resetForm(); setShowModal(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Goal
              </Button>
            </CardContent>
          </Card>
        ) : (
          goals.map((goal) => (
            <Card key={goal.id} className={isOverdue(goal.dueDate, goal.status) ? 'border-red-200' : ''}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  {/* Expand button for goals with children/KRs */}
                  <button
                    onClick={() => toggleExpanded(goal.id)}
                    className="mt-1 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                  >
                    {expandedGoals.has(goal.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{goal.title}</h3>
                        {goal.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{goal.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(goal)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteGoal(goal.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge className={TYPE_CONFIG[goal.type].color}>
                        {TYPE_CONFIG[goal.type].label}
                      </Badge>
                      <Badge className={CATEGORY_CONFIG[goal.category].color}>
                        {CATEGORY_CONFIG[goal.category].label}
                      </Badge>
                      <Badge className={STATUS_CONFIG[goal.status].color}>
                        {STATUS_CONFIG[goal.status].label}
                      </Badge>
                      {isOverdue(goal.dueDate, goal.status) && (
                        <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">Overdue</Badge>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-500 dark:text-gray-400">Progress</span>
                        <span className="font-medium dark:text-white">{goal.progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={goal.progress} className="h-2" />
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {goal.user && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{goal.user.firstName} {goal.user.lastName}</span>
                        </div>
                      )}
                      {goal.department && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          <span>{goal.department.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Due: {new Date(goal.dueDate).toLocaleDateString()}</span>
                      </div>
                      {goal.targetValue && (
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          <span>Target: {goal.currentValue}/{goal.targetValue} {goal.unit}</span>
                        </div>
                      )}
                    </div>

                    {/* Key Results (expanded) */}
                    {expandedGoals.has(goal.id) && (
                      <div className="mt-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Key Results</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedGoalForKR(goal);
                              setShowKRModal(true);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add KR
                          </Button>
                        </div>
                        {goal.keyResults && goal.keyResults.length > 0 ? (
                          <div className="space-y-3">
                            {goal.keyResults.map((kr) => (
                              <div key={kr.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="font-medium text-sm dark:text-white">{kr.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {kr.currentValue} / {kr.targetValue} {kr.unit}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      className="w-20 h-7 text-xs"
                                      value={kr.currentValue}
                                      onChange={(e) =>
                                        handleUpdateKRProgress(goal.id, kr, parseFloat(e.target.value) || 0)
                                      }
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleDeleteKeyResult(goal.id, kr.id)}
                                    >
                                      <Trash2 className="h-3 w-3 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                                <Progress
                                  value={kr.targetValue > 0 ? (kr.currentValue / kr.targetValue) * 100 : 0}
                                  className="h-1.5"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400 italic">No key results yet</p>
                        )}

                        {/* Update Progress Button (for goals without KRs) */}
                        {(!goal.keyResults || goal.keyResults.length === 0) && goal.targetValue && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              setSelectedGoalForProgress(goal);
                              setProgressValue(goal.currentValue?.toString() || '0');
                              setShowProgressModal(true);
                            }}
                          >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Update Progress
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Goal Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Increase customer satisfaction"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this goal"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as GoalType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="TEAM">Team</SelectItem>
                    <SelectItem value="COMPANY">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as GoalCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OKR">OKR</SelectItem>
                    <SelectItem value="KPI">KPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target Value</Label>
                <Input
                  type="number"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                  placeholder="e.g., 100"
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., %, $, count"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>
            {formData.type === 'TEAM' && (
              <div>
                <Label>Department</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(v) => setFormData({ ...formData, departmentId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Assign To</Label>
              <Select
                value={formData.assignedUserId}
                onValueChange={(v) => setFormData({ ...formData, assignedUserId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Parent Goal (for cascading)</Label>
              <Select
                value={formData.parentId}
                onValueChange={(v) => setFormData({ ...formData, parentId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent goal (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {goals
                    .filter((g) => g.id !== editingGoal?.id)
                    .map((g) => (
                      <SelectItem key={g.id} value={g.id.toString()}>
                        {g.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGoal} disabled={!formData.title || !formData.startDate || !formData.dueDate}>
              {editingGoal ? 'Update' : 'Create'} Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Key Result Modal */}
      <Dialog open={showKRModal} onOpenChange={setShowKRModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Key Result</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={krFormData.title}
                onChange={(e) => setKRFormData({ ...krFormData, title: e.target.value })}
                placeholder="e.g., Achieve NPS score of 50"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={krFormData.description}
                onChange={(e) => setKRFormData({ ...krFormData, description: e.target.value })}
                placeholder="How will this be measured?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target Value *</Label>
                <Input
                  type="number"
                  value={krFormData.targetValue}
                  onChange={(e) => setKRFormData({ ...krFormData, targetValue: e.target.value })}
                  placeholder="e.g., 50"
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Input
                  value={krFormData.unit}
                  onChange={(e) => setKRFormData({ ...krFormData, unit: e.target.value })}
                  placeholder="e.g., %, points"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKRModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddKeyResult} disabled={!krFormData.title || !krFormData.targetValue}>
              Add Key Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Progress Modal */}
      <Dialog open={showProgressModal} onOpenChange={setShowProgressModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Current Value</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="number"
                value={progressValue}
                onChange={(e) => setProgressValue(e.target.value)}
                placeholder="Enter current value"
              />
              <span className="text-gray-500">
                / {selectedGoalForProgress?.targetValue} {selectedGoalForProgress?.unit}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProgressModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProgress} disabled={!progressValue}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
