'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
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
  trainingApi,
  tenantApi,
  TrainingProgram,
  TrainingEnrollment,
  TrainingStats,
  TrainingType,
  TrainingStatus,
  EnrollmentStatus,
} from '@/lib/api';
import {
  GraduationCap,
  Plus,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  MapPin,
  User,
  Play,
  Pause,
  Star,
  Edit,
  Trash2,
  UserPlus,
  BookOpen,
  Award,
  Video,
  Building2,
} from 'lucide-react';

const TRAINING_TYPE_CONFIG: Record<TrainingType, { label: string; icon: typeof Video; color: string }> = {
  INTERNAL: { label: 'Internal', icon: Building2, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  EXTERNAL: { label: 'External', icon: Users, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  ONLINE: { label: 'Online', icon: Video, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  WORKSHOP: { label: 'Workshop', icon: BookOpen, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  CERTIFICATION: { label: 'Certification', icon: Award, color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300' },
};

const TRAINING_STATUS_CONFIG: Record<TrainingStatus, { label: string; color: string }> = {
  PLANNED: { label: 'Planned', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
};

const ENROLLMENT_STATUS_CONFIG: Record<EnrollmentStatus, { label: string; color: string }> = {
  ENROLLED: { label: 'Enrolled', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  DROPPED: { label: 'Dropped', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
  FAILED: { label: 'Failed', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
};

const CATEGORIES = ['Technical', 'Soft Skills', 'Leadership', 'Compliance', 'Safety', 'Product', 'Sales', 'Other'];

export default function TrainingPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [activeTab, setActiveTab] = useState('programs');
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [myTrainings, setMyTrainings] = useState<TrainingEnrollment[]>([]);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [users, setUsers] = useState<{ id: number; firstName: string; lastName?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState<TrainingStatus | ''>('');
  const [filterType, setFilterType] = useState<TrainingType | ''>('');

  // Program Modal
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
  const [programForm, setProgramForm] = useState({
    name: '',
    description: '',
    type: 'INTERNAL' as TrainingType,
    category: '',
    duration: '',
    startDate: '',
    endDate: '',
    trainerId: '',
    externalTrainer: '',
    venue: '',
    maxParticipants: '',
    cost: '',
    objectives: '',
    prerequisites: '',
  });

  // Program Detail Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);

  // Enroll Modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollProgramId, setEnrollProgramId] = useState<number | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  useEffect(() => {
    loadData();
    loadUsers();
  }, [filterStatus, filterType]);

  useEffect(() => {
    loadMyTrainings();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await tenantApi.getUsers();
      if (res.data) setUsers(res.data.users.map((u: { id: number; firstName: string; lastName?: string }) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName })));
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [programsRes, statsRes] = await Promise.all([
        trainingApi.listPrograms({
          status: filterStatus || undefined,
          type: filterType || undefined,
        }),
        trainingApi.getStats(),
      ]);
      if (programsRes.data) setPrograms(programsRes.data.data || []);
      if (statsRes.data) setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load training data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyTrainings = async () => {
    try {
      const res = await trainingApi.getMyTrainings();
      if (res.data) setMyTrainings(res.data);
    } catch (err) {
      console.error('Failed to load my trainings:', err);
    }
  };

  const resetProgramForm = () => {
    setProgramForm({
      name: '',
      description: '',
      type: 'INTERNAL',
      category: '',
      duration: '',
      startDate: '',
      endDate: '',
      trainerId: '',
      externalTrainer: '',
      venue: '',
      maxParticipants: '',
      cost: '',
      objectives: '',
      prerequisites: '',
    });
    setEditingProgram(null);
  };

  const openEditProgram = (program: TrainingProgram) => {
    setEditingProgram(program);
    setProgramForm({
      name: program.name,
      description: program.description || '',
      type: program.type,
      category: program.category || '',
      duration: program.duration.toString(),
      startDate: program.startDate.split('T')[0],
      endDate: program.endDate.split('T')[0],
      trainerId: program.trainerId?.toString() || '',
      externalTrainer: program.externalTrainer || '',
      venue: program.venue || '',
      maxParticipants: program.maxParticipants?.toString() || '',
      cost: program.cost?.toString() || '',
      objectives: program.objectives || '',
      prerequisites: program.prerequisites || '',
    });
    setShowProgramModal(true);
  };

  const handleCreateProgram = async () => {
    try {
      if (editingProgram) {
        await trainingApi.updateProgram(editingProgram.id, {
          name: programForm.name,
          description: programForm.description || undefined,
          type: programForm.type,
          category: programForm.category || undefined,
          duration: parseInt(programForm.duration),
          startDate: programForm.startDate,
          endDate: programForm.endDate,
          trainerId: programForm.trainerId ? parseInt(programForm.trainerId) : undefined,
          externalTrainer: programForm.externalTrainer || undefined,
          venue: programForm.venue || undefined,
          maxParticipants: programForm.maxParticipants ? parseInt(programForm.maxParticipants) : undefined,
          cost: programForm.cost ? parseFloat(programForm.cost) : undefined,
          objectives: programForm.objectives || undefined,
          prerequisites: programForm.prerequisites || undefined,
        });
      } else {
        await trainingApi.createProgram({
          name: programForm.name,
          description: programForm.description || undefined,
          type: programForm.type,
          category: programForm.category || undefined,
          duration: parseInt(programForm.duration),
          startDate: programForm.startDate,
          endDate: programForm.endDate,
          trainerId: programForm.trainerId ? parseInt(programForm.trainerId) : undefined,
          externalTrainer: programForm.externalTrainer || undefined,
          venue: programForm.venue || undefined,
          maxParticipants: programForm.maxParticipants ? parseInt(programForm.maxParticipants) : undefined,
          cost: programForm.cost ? parseFloat(programForm.cost) : undefined,
          objectives: programForm.objectives || undefined,
          prerequisites: programForm.prerequisites || undefined,
        });
      }
      setShowProgramModal(false);
      resetProgramForm();
      loadData();
    } catch (err) {
      console.error('Failed to save program:', err);
    }
  };

  const handleDeleteProgram = async (id: number) => {
    if (!confirm('Are you sure you want to delete this training program?')) return;
    try {
      await trainingApi.deleteProgram(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete program:', err);
    }
  };

  const handleStartProgram = async (id: number) => {
    try {
      await trainingApi.startProgram(id);
      loadData();
      if (selectedProgram?.id === id) {
        const res = await trainingApi.getProgram(id);
        if (res.data) setSelectedProgram(res.data);
      }
    } catch (err) {
      console.error('Failed to start program:', err);
    }
  };

  const handleCompleteProgram = async (id: number) => {
    try {
      await trainingApi.completeProgram(id);
      loadData();
      if (selectedProgram?.id === id) {
        const res = await trainingApi.getProgram(id);
        if (res.data) setSelectedProgram(res.data);
      }
    } catch (err) {
      console.error('Failed to complete program:', err);
    }
  };

  const handleCancelProgram = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this training program?')) return;
    try {
      await trainingApi.cancelProgram(id);
      loadData();
    } catch (err) {
      console.error('Failed to cancel program:', err);
    }
  };

  const openProgramDetail = async (program: TrainingProgram) => {
    try {
      const res = await trainingApi.getProgram(program.id);
      if (res.data) setSelectedProgram(res.data);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Failed to load program details:', err);
    }
  };

  const openEnrollModal = (programId: number) => {
    setEnrollProgramId(programId);
    setSelectedUserIds([]);
    setShowEnrollModal(true);
  };

  const handleEnrollParticipants = async () => {
    if (!enrollProgramId || selectedUserIds.length === 0) return;
    try {
      await trainingApi.enrollParticipants(enrollProgramId, selectedUserIds);
      setShowEnrollModal(false);
      if (selectedProgram?.id === enrollProgramId) {
        const res = await trainingApi.getProgram(enrollProgramId);
        if (res.data) setSelectedProgram(res.data);
      }
      loadData();
    } catch (err) {
      console.error('Failed to enroll participants:', err);
    }
  };

  const handleRemoveEnrollment = async (programId: number, enrollmentId: number) => {
    if (!confirm('Remove this participant from the training?')) return;
    try {
      await trainingApi.removeEnrollment(programId, enrollmentId);
      if (selectedProgram?.id === programId) {
        const res = await trainingApi.getProgram(programId);
        if (res.data) setSelectedProgram(res.data);
      }
    } catch (err) {
      console.error('Failed to remove enrollment:', err);
    }
  };

  const handleCompleteEnrollment = async (programId: number, enrollmentId: number) => {
    try {
      await trainingApi.updateEnrollment(programId, enrollmentId, { status: 'COMPLETED' });
      if (selectedProgram?.id === programId) {
        const res = await trainingApi.getProgram(programId);
        if (res.data) setSelectedProgram(res.data);
      }
    } catch (err) {
      console.error('Failed to complete enrollment:', err);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Training">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Training Programs">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Programs</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.programs.total}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">In Progress</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.programs.inProgress}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Enrollments</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.enrollments.total}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.enrollments.completed}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="programs">Programs ({programs.length})</TabsTrigger>
            <TabsTrigger value="my-trainings">My Trainings ({myTrainings.length})</TabsTrigger>
          </TabsList>

          {activeTab === 'programs' && (
            <Button onClick={() => { resetProgramForm(); setShowProgramModal(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Program
            </Button>
          )}
        </div>

        {/* Programs Tab */}
        <TabsContent value="programs">
          <div className="flex items-center gap-4 mb-4">
            <Select value={filterStatus || '__all__'} onValueChange={(v) => setFilterStatus(v === '__all__' ? '' : v as TrainingStatus)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                {Object.entries(TRAINING_STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType || '__all__'} onValueChange={(v) => setFilterType(v === '__all__' ? '' : v as TrainingType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                {Object.entries(TRAINING_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {programs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <GraduationCap className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No training programs</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first training program</p>
                  <Button onClick={() => setShowProgramModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Program
                  </Button>
                </CardContent>
              </Card>
            ) : (
              programs.map((program) => {
                const TypeIcon = TRAINING_TYPE_CONFIG[program.type].icon;
                return (
                  <Card key={program.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openProgramDetail(program)}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${TRAINING_TYPE_CONFIG[program.type].color}`}>
                            <TypeIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium dark:text-white">{program.name}</h3>
                              <Badge className={TRAINING_STATUS_CONFIG[program.status].color}>
                                {TRAINING_STATUS_CONFIG[program.status].label}
                              </Badge>
                              {program.category && (
                                <Badge variant="outline">{program.category}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {program.duration} hours | {new Date(program.startDate).toLocaleDateString()} - {new Date(program.endDate).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {program.trainer ? `${program.trainer.firstName} ${program.trainer.lastName}` : program.externalTrainer || 'No trainer assigned'}
                              {program.venue && ` | ${program.venue}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium dark:text-white">{program._count?.enrollments || 0} enrolled</p>
                            {program.maxParticipants && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">Max {program.maxParticipants}</p>
                            )}
                          </div>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            {program.status === 'PLANNED' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleStartProgram(program.id)}>
                                  <Play className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => openEditProgram(program)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {program.status === 'IN_PROGRESS' && (
                              <Button size="sm" variant="outline" onClick={() => handleCompleteProgram(program.id)}>
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            {program.status !== 'COMPLETED' && program.status !== 'CANCELLED' && (
                              <Button size="sm" variant="outline" onClick={() => openEnrollModal(program.id)}>
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* My Trainings Tab */}
        <TabsContent value="my-trainings">
          <div className="space-y-4">
            {myTrainings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No training enrollments</h3>
                  <p className="text-gray-500 dark:text-gray-400">You are not enrolled in any training programs yet</p>
                </CardContent>
              </Card>
            ) : (
              myTrainings.map((enrollment) => (
                <Card key={enrollment.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium dark:text-white">{enrollment.program?.name}</h3>
                          <Badge className={ENROLLMENT_STATUS_CONFIG[enrollment.status].color}>
                            {ENROLLMENT_STATUS_CONFIG[enrollment.status].label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {enrollment.program?.duration} hours | {enrollment.program?.type}
                          {enrollment.program?.category && ` | ${enrollment.program.category}`}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {enrollment.program?.startDate && new Date(enrollment.program.startDate).toLocaleDateString()} - {enrollment.program?.endDate && new Date(enrollment.program.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        {enrollment.score !== null && (
                          <p className="text-sm font-medium dark:text-white">Score: {enrollment.score}%</p>
                        )}
                        {enrollment.completedAt && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Completed {new Date(enrollment.completedAt).toLocaleDateString()}
                          </p>
                        )}
                        {enrollment.status === 'COMPLETED' && enrollment.rating && (
                          <div className="flex items-center gap-0.5 justify-end mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${star <= enrollment.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Program Modal */}
      <Dialog open={showProgramModal} onOpenChange={setShowProgramModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProgram ? 'Edit Training Program' : 'Create Training Program'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Program Name *</Label>
              <Input
                value={programForm.name}
                onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                placeholder="e.g., React Advanced Training"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={programForm.description}
                onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
                placeholder="Program description..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={programForm.type}
                  onValueChange={(v) => setProgramForm({ ...programForm, type: v as TrainingType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRAINING_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={programForm.category}
                  onValueChange={(v) => setProgramForm({ ...programForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Duration (hours) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={programForm.duration}
                  onChange={(e) => setProgramForm({ ...programForm, duration: e.target.value })}
                />
              </div>
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={programForm.startDate}
                  onChange={(e) => setProgramForm({ ...programForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={programForm.endDate}
                  onChange={(e) => setProgramForm({ ...programForm, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Internal Trainer</Label>
                <Select
                  value={programForm.trainerId || '__none__'}
                  onValueChange={(v) => setProgramForm({ ...programForm, trainerId: v === '__none__' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trainer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>External Trainer</Label>
                <Input
                  value={programForm.externalTrainer}
                  onChange={(e) => setProgramForm({ ...programForm, externalTrainer: e.target.value })}
                  placeholder="External trainer name"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Venue / Platform</Label>
                <Input
                  value={programForm.venue}
                  onChange={(e) => setProgramForm({ ...programForm, venue: e.target.value })}
                  placeholder="Location or online platform"
                />
              </div>
              <div>
                <Label>Max Participants</Label>
                <Input
                  type="number"
                  min="1"
                  value={programForm.maxParticipants}
                  onChange={(e) => setProgramForm({ ...programForm, maxParticipants: e.target.value })}
                />
              </div>
              <div>
                <Label>Cost per Person (INR)</Label>
                <Input
                  type="number"
                  min="0"
                  value={programForm.cost}
                  onChange={(e) => setProgramForm({ ...programForm, cost: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Learning Objectives</Label>
              <Textarea
                value={programForm.objectives}
                onChange={(e) => setProgramForm({ ...programForm, objectives: e.target.value })}
                placeholder="What participants will learn..."
                rows={2}
              />
            </div>
            <div>
              <Label>Prerequisites</Label>
              <Textarea
                value={programForm.prerequisites}
                onChange={(e) => setProgramForm({ ...programForm, prerequisites: e.target.value })}
                placeholder="Required knowledge or skills..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProgramModal(false)}>Cancel</Button>
            <Button
              onClick={handleCreateProgram}
              disabled={!programForm.name || !programForm.duration || !programForm.startDate || !programForm.endDate}
            >
              {editingProgram ? 'Update' : 'Create'} Program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Program Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Program Details</DialogTitle>
          </DialogHeader>
          {selectedProgram && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{selectedProgram.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={TRAINING_STATUS_CONFIG[selectedProgram.status].color}>
                      {TRAINING_STATUS_CONFIG[selectedProgram.status].label}
                    </Badge>
                    <Badge className={TRAINING_TYPE_CONFIG[selectedProgram.type].color}>
                      {TRAINING_TYPE_CONFIG[selectedProgram.type].label}
                    </Badge>
                    {selectedProgram.category && (
                      <Badge variant="outline">{selectedProgram.category}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedProgram.status === 'PLANNED' && (
                    <Button size="sm" onClick={() => handleStartProgram(selectedProgram.id)}>
                      <Play className="h-4 w-4 mr-1" /> Start
                    </Button>
                  )}
                  {selectedProgram.status === 'IN_PROGRESS' && (
                    <Button size="sm" onClick={() => handleCompleteProgram(selectedProgram.id)}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
                    </Button>
                  )}
                  {selectedProgram.status !== 'COMPLETED' && selectedProgram.status !== 'CANCELLED' && (
                    <Button size="sm" variant="outline" onClick={() => openEnrollModal(selectedProgram.id)}>
                      <UserPlus className="h-4 w-4 mr-1" /> Enroll
                    </Button>
                  )}
                </div>
              </div>

              {selectedProgram.description && (
                <p className="text-gray-600 dark:text-gray-400">{selectedProgram.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{selectedProgram.duration} hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{new Date(selectedProgram.startDate).toLocaleDateString()} - {new Date(selectedProgram.endDate).toLocaleDateString()}</span>
                </div>
                {selectedProgram.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{selectedProgram.venue}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>
                    {selectedProgram.trainer
                      ? `${selectedProgram.trainer.firstName} ${selectedProgram.trainer.lastName}`
                      : selectedProgram.externalTrainer || 'No trainer'}
                  </span>
                </div>
              </div>

              {selectedProgram.objectives && (
                <div>
                  <Label className="text-gray-500 dark:text-gray-400">Learning Objectives</Label>
                  <p className="text-sm mt-1 dark:text-gray-300">{selectedProgram.objectives}</p>
                </div>
              )}

              {selectedProgram.prerequisites && (
                <div>
                  <Label className="text-gray-500 dark:text-gray-400">Prerequisites</Label>
                  <p className="text-sm mt-1 dark:text-gray-300">{selectedProgram.prerequisites}</p>
                </div>
              )}

              {/* Enrollments */}
              <div className="border-t dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-gray-700 dark:text-gray-300 font-medium">
                    Participants ({selectedProgram.enrollments?.length || 0}
                    {selectedProgram.maxParticipants && ` / ${selectedProgram.maxParticipants}`})
                  </Label>
                </div>
                {selectedProgram.enrollments && selectedProgram.enrollments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedProgram.enrollments.map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {enrollment.user?.firstName.charAt(0)}{enrollment.user?.lastName?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm dark:text-white">{enrollment.user?.firstName} {enrollment.user?.lastName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{enrollment.user?.department?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={ENROLLMENT_STATUS_CONFIG[enrollment.status].color}>
                            {ENROLLMENT_STATUS_CONFIG[enrollment.status].label}
                          </Badge>
                          {enrollment.score !== null && (
                            <span className="text-sm font-medium dark:text-white">{enrollment.score}%</span>
                          )}
                          {enrollment.status !== 'COMPLETED' && enrollment.status !== 'DROPPED' && (
                            <div className="flex gap-1">
                              {selectedProgram.status === 'IN_PROGRESS' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleCompleteEnrollment(selectedProgram.id, enrollment.id)}
                                >
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => handleRemoveEnrollment(selectedProgram.id, enrollment.id)}
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg">
                    No participants enrolled
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enroll Modal */}
      <Dialog open={showEnrollModal} onOpenChange={setShowEnrollModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enroll Participants</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">Select Employees</Label>
            <div className="max-h-64 overflow-y-auto border dark:border-gray-700 rounded-lg p-2 space-y-1">
              {users.map((user) => (
                <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUserIds([...selectedUserIds, user.id]);
                      } else {
                        setSelectedUserIds(selectedUserIds.filter((id) => id !== user.id));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm dark:text-white">{user.firstName} {user.lastName}</span>
                </label>
              ))}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{selectedUserIds.length} selected</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnrollModal(false)}>Cancel</Button>
            <Button onClick={handleEnrollParticipants} disabled={selectedUserIds.length === 0}>
              Enroll {selectedUserIds.length} Participant{selectedUserIds.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
