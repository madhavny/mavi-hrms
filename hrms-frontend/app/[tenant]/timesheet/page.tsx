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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  timetrackingApi,
  Project,
  TimeLog,
  WeeklyTimesheet,
  TimesheetStats,
  tenantApi,
} from '@/lib/api';
import {
  Clock,
  Plus,
  Calendar,
  FolderKanban,
  Users,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Briefcase,
} from 'lucide-react';

const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
  SUBMITTED: { label: 'Submitted', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  APPROVED: { label: 'Approved', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
};

const PROJECT_STATUS_CONFIG = {
  ACTIVE: { label: 'Active', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  COMPLETED: { label: 'Completed', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  ON_HOLD: { label: 'On Hold', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
};

// Helper functions
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatWeekRange(weekOf: string): string {
  const start = new Date(weekOf);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export default function TimesheetPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [activeTab, setActiveTab] = useState('timesheet');
  const [currentWeek, setCurrentWeek] = useState<Date>(getWeekStart(new Date()));
  const [weeklyData, setWeeklyData] = useState<WeeklyTimesheet | null>(null);
  const [stats, setStats] = useState<TimesheetStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: number; role?: { code: string } } | null>(null);
  const [users, setUsers] = useState<{ id: number; firstName: string; lastName?: string }[]>([]);

  // Timesheet entry state
  const [editingCell, setEditingCell] = useState<{ projectId: number | null; date: string } | null>(null);
  const [hoursInput, setHoursInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');

  // Project modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    code: '',
    description: '',
    clientName: '',
    startDate: '',
    endDate: '',
    budgetHours: '',
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    loadUsers();
  }, []);

  useEffect(() => {
    loadData();
  }, [currentWeek, activeTab]);

  const loadUsers = async () => {
    try {
      const res = await tenantApi.getUsers({ page: 1, limit: 100 });
      if (res.data) {
        setUsers(res.data.users.map((u: { id: number; firstName: string; lastName?: string }) => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
        })));
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const weekOf = currentWeek.toISOString().split('T')[0];
      const [weeklyRes, statsRes, projectsRes] = await Promise.all([
        timetrackingApi.getWeeklyTimesheet(weekOf),
        timetrackingApi.getTimesheetStats(weekOf),
        timetrackingApi.listProjects({ myProjects: true }),
      ]);

      if (weeklyRes.data) setWeeklyData(weeklyRes.data);
      if (statsRes.data) setStats(statsRes.data);
      if (projectsRes.data) setProjects(projectsRes.data.data || []);

      // Load pending approvals for managers
      if (user?.role?.code === 'ADMIN' || user?.role?.code === 'HR' || user?.role?.code === 'MANAGER') {
        const approvalsRes = await timetrackingApi.listTimeLogs({ toApprove: true });
        if (approvalsRes.data) setPendingApprovals(approvalsRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevWeek = () => {
    const prev = new Date(currentWeek);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeek(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeek);
    next.setDate(next.getDate() + 7);
    setCurrentWeek(next);
  };

  const handleCellClick = (projectId: number | null, date: string) => {
    const existingLog = weeklyData?.logsMap?.[date]?.[projectId || 'no-project'];
    if (existingLog && existingLog.status !== 'DRAFT') return; // Can't edit non-draft

    setEditingCell({ projectId, date });
    setHoursInput(existingLog?.hours?.toString() || '');
    setDescriptionInput(existingLog?.description || '');
  };

  const handleSaveEntry = async () => {
    if (!editingCell || !hoursInput) return;

    try {
      await timetrackingApi.createTimeLog({
        projectId: editingCell.projectId || undefined,
        date: editingCell.date,
        hours: parseFloat(hoursInput),
        description: descriptionInput || undefined,
      });
      setEditingCell(null);
      setHoursInput('');
      setDescriptionInput('');
      loadData();
    } catch (err) {
      console.error('Failed to save entry:', err);
    }
  };

  const handleSubmitTimesheet = async () => {
    try {
      const weekOf = currentWeek.toISOString().split('T')[0];
      await timetrackingApi.submitTimesheet(weekOf);
      loadData();
    } catch (err) {
      console.error('Failed to submit timesheet:', err);
    }
  };

  const handleApprove = async (logIds: number[]) => {
    try {
      await timetrackingApi.approveTimeLogs(logIds);
      loadData();
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const handleReject = async (logIds: number[]) => {
    try {
      await timetrackingApi.rejectTimeLogs(logIds, 'Please review and resubmit');
      loadData();
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  const handleCreateProject = async () => {
    try {
      await timetrackingApi.createProject({
        name: projectForm.name,
        code: projectForm.code,
        description: projectForm.description || undefined,
        clientName: projectForm.clientName || undefined,
        startDate: projectForm.startDate,
        endDate: projectForm.endDate || undefined,
        budgetHours: projectForm.budgetHours ? parseFloat(projectForm.budgetHours) : undefined,
      });
      setShowProjectModal(false);
      setProjectForm({ name: '', code: '', description: '', clientName: '', startDate: '', endDate: '', budgetHours: '' });
      loadData();
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const getCellValue = (projectId: number | null, date: string): TimeLog | null => {
    return weeklyData?.logsMap?.[date]?.[projectId || 'no-project'] || null;
  };

  const getDayTotal = (date: string): number => {
    if (!weeklyData?.logs) return 0;
    return weeklyData.logs
      .filter((l) => l.date.split('T')[0] === date)
      .reduce((sum, l) => sum + l.hours, 0);
  };

  const getProjectTotal = (projectId: number | null): number => {
    if (!weeklyData?.logs) return 0;
    return weeklyData.logs
      .filter((l) => (projectId ? l.projectId === projectId : !l.projectId))
      .reduce((sum, l) => sum + l.hours, 0);
  };

  const isAdmin = user?.role?.code === 'ADMIN' || user?.role?.code === 'HR';
  const isManager = user?.role?.code === 'MANAGER' || isAdmin;

  if (loading) {
    return (
      <DashboardLayout title="Timesheet">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Timesheet">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Hours</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.totalHours.toFixed(1)}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.approvedHours.toFixed(1)}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Billable</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.billableHours.toFixed(1)}</p>
                </div>
                <Briefcase className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Projects</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.projectsWorkedOn}</p>
                </div>
                <FolderKanban className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="timesheet">Timesheet</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            {isManager && <TabsTrigger value="approvals">Approvals ({pendingApprovals.length})</TabsTrigger>}
          </TabsList>

          {isAdmin && activeTab === 'projects' && (
            <Button onClick={() => setShowProjectModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          )}
        </div>

        {/* Timesheet Tab */}
        <TabsContent value="timesheet">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm" onClick={handlePrevWeek}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-lg">
                    <Calendar className="inline-block h-5 w-5 mr-2" />
                    {weeklyData?.weekOf ? formatWeekRange(weeklyData.weekOf) : 'Loading...'}
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={handleNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  {stats && stats.draftHours > 0 && (
                    <Button onClick={handleSubmitTimesheet}>
                      <Send className="h-4 w-4 mr-2" />
                      Submit ({stats.draftHours.toFixed(1)}h)
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Weekly Grid */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left p-2 font-medium min-w-[200px] dark:text-gray-200">Project</th>
                      {weeklyData?.weekDays?.map((day) => (
                        <th key={day} className="text-center p-2 font-medium min-w-[100px] dark:text-gray-200">
                          {formatDate(day)}
                        </th>
                      ))}
                      <th className="text-center p-2 font-medium min-w-[80px] dark:text-gray-200">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Project rows */}
                    {weeklyData?.projects?.map((project) => (
                      <tr key={project.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-2">
                          <div className="font-medium dark:text-white">{project.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{project.code}</div>
                        </td>
                        {weeklyData?.weekDays?.map((day) => {
                          const log = getCellValue(project.id, day);
                          const isEditing = editingCell?.projectId === project.id && editingCell?.date === day;
                          return (
                            <td key={day} className="p-1 text-center">
                              {isEditing ? (
                                <div className="flex flex-col gap-1">
                                  <Input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="24"
                                    value={hoursInput}
                                    onChange={(e) => setHoursInput(e.target.value)}
                                    className="w-16 mx-auto text-center text-sm"
                                    autoFocus
                                  />
                                  <div className="flex gap-1 justify-center">
                                    <Button size="sm" variant="ghost" onClick={handleSaveEntry} className="h-6 px-2">
                                      <CheckCircle2 className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingCell(null)} className="h-6 px-2">
                                      <XCircle className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleCellClick(project.id, day)}
                                  className={`w-full h-10 rounded border cursor-pointer ${
                                    log
                                      ? log.status === 'DRAFT'
                                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                                        : log.status === 'APPROVED'
                                        ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
                                        : 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800'
                                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  {log ? log.hours.toFixed(1) : '-'}
                                </button>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-2 text-center font-medium dark:text-white">
                          {getProjectTotal(project.id).toFixed(1)}
                        </td>
                      </tr>
                    ))}

                    {/* No project row */}
                    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-2">
                        <div className="font-medium text-gray-500 dark:text-gray-400">Other / No Project</div>
                      </td>
                      {weeklyData?.weekDays?.map((day) => {
                        const log = getCellValue(null, day);
                        const isEditing = editingCell?.projectId === null && editingCell?.date === day;
                        return (
                          <td key={day} className="p-1 text-center">
                            {isEditing ? (
                              <div className="flex flex-col gap-1">
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="24"
                                  value={hoursInput}
                                  onChange={(e) => setHoursInput(e.target.value)}
                                  className="w-16 mx-auto text-center text-sm"
                                  autoFocus
                                />
                                <div className="flex gap-1 justify-center">
                                  <Button size="sm" variant="ghost" onClick={handleSaveEntry} className="h-6 px-2">
                                    <CheckCircle2 className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingCell(null)} className="h-6 px-2">
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleCellClick(null, day)}
                                className={`w-full h-10 rounded border cursor-pointer ${
                                  log
                                    ? log.status === 'DRAFT'
                                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                                      : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
                                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                {log ? log.hours.toFixed(1) : '-'}
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-2 text-center font-medium dark:text-white">
                        {getProjectTotal(null).toFixed(1)}
                      </td>
                    </tr>

                    {/* Daily totals row */}
                    <tr className="bg-gray-50 dark:bg-gray-800 font-medium">
                      <td className="p-2 dark:text-white">Daily Total</td>
                      {weeklyData?.weekDays?.map((day) => (
                        <td key={day} className="p-2 text-center dark:text-gray-200">
                          {getDayTotal(day).toFixed(1)}
                        </td>
                      ))}
                      <td className="p-2 text-center text-blue-600 dark:text-blue-400">
                        {weeklyData?.totalHours?.toFixed(1) || '0.0'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 mt-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800"></div>
                  <span>Draft</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800"></div>
                  <span>Submitted</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800"></div>
                  <span>Approved</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects">
          <div className="space-y-4">
            {projects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FolderKanban className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No projects</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Create a project to start tracking time</p>
                  {isAdmin && (
                    <Button onClick={() => setShowProjectModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              projects.map((project) => (
                <Card key={project.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-lg dark:text-white">{project.name}</h3>
                          <Badge variant="outline">{project.code}</Badge>
                          <Badge className={PROJECT_STATUS_CONFIG[project.status].color}>
                            {PROJECT_STATUS_CONFIG[project.status].label}
                          </Badge>
                        </div>
                        {project.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{project.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          {project.clientName && (
                            <span>Client: {project.clientName}</span>
                          )}
                          <span>
                            {new Date(project.startDate).toLocaleDateString()}
                            {project.endDate && ` - ${new Date(project.endDate).toLocaleDateString()}`}
                          </span>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{project._count?.members || 0} members</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{project.totalHours?.toFixed(1) || 0}h logged</span>
                            {project.budgetHours && (
                              <span className="text-gray-400">/ {project.budgetHours}h budget</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Approvals Tab */}
        {isManager && (
          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle>Pending Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingApprovals.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p>No pending timesheet approvals</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingApprovals.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={log.user?.avatar || undefined} />
                            <AvatarFallback>
                              {log.user?.firstName?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium dark:text-white">
                              {log.user?.firstName} {log.user?.lastName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {log.project?.name || 'No Project'} | {new Date(log.date).toLocaleDateString()} | {log.hours}h
                            </p>
                            {log.description && (
                              <p className="text-sm text-gray-400 dark:text-gray-500">{log.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject([log.id])}
                          >
                            <XCircle className="h-4 w-4 mr-1 text-red-500" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove([log.id])}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Create Project Modal */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="Project name"
                />
              </div>
              <div>
                <Label>Code *</Label>
                <Input
                  value={projectForm.code}
                  onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value.toUpperCase() })}
                  placeholder="PRJ001"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="Brief description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client Name</Label>
                <Input
                  value={projectForm.clientName}
                  onChange={(e) => setProjectForm({ ...projectForm, clientName: e.target.value })}
                  placeholder="Client name"
                />
              </div>
              <div>
                <Label>Budget Hours</Label>
                <Input
                  type="number"
                  value={projectForm.budgetHours}
                  onChange={(e) => setProjectForm({ ...projectForm, budgetHours: e.target.value })}
                  placeholder="100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={projectForm.startDate}
                  onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={projectForm.endDate}
                  onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectModal(false)}>Cancel</Button>
            <Button
              onClick={handleCreateProject}
              disabled={!projectForm.name || !projectForm.code || !projectForm.startDate}
            >
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
