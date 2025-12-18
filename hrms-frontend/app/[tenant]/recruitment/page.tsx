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
  recruitmentApi,
  interviewApi,
  tenantApi,
  JobPosting,
  JobApplication,
  JobApplicationFull,
  RecruitmentStats,
  JobStatus,
  ApplicationStatus,
  EmploymentType,
  Interview,
  InterviewType,
  InterviewStatus,
} from '@/lib/api';
import {
  Briefcase,
  Plus,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Trash2,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  Star,
  Eye,
  Pause,
  Play,
  Edit,
  UserPlus,
  Video,
  Phone,
  User,
  FileText,
  MessageSquare,
  CalendarPlus,
  GripVertical,
} from 'lucide-react';

const JOB_STATUS_CONFIG: Record<JobStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
  ACTIVE: { label: 'Active', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  PAUSED: { label: 'Paused', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  CLOSED: { label: 'Closed', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
};

const APP_STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string }> = {
  NEW: { label: 'New', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  SCREENING: { label: 'Screening', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  SHORTLISTED: { label: 'Shortlisted', color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' },
  INTERVIEW: { label: 'Interview', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  OFFER: { label: 'Offer', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
  HIRED: { label: 'Hired', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  WITHDRAWN: { label: 'Withdrawn', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
};

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERNSHIP', label: 'Internship' },
];

const EXPERIENCE_OPTIONS = ['0-1 years', '1-3 years', '3-5 years', '5-7 years', '7-10 years', '10+ years'];

const INTERVIEW_TYPES: { value: InterviewType; label: string; icon: typeof Video }[] = [
  { value: 'PHONE', label: 'Phone', icon: Phone },
  { value: 'VIDEO', label: 'Video', icon: Video },
  { value: 'IN_PERSON', label: 'In Person', icon: User },
  { value: 'TECHNICAL', label: 'Technical', icon: FileText },
  { value: 'HR', label: 'HR', icon: MessageSquare },
  { value: 'PANEL', label: 'Panel', icon: Users },
];

const INTERVIEW_STATUS_CONFIG: Record<InterviewStatus, { label: string; color: string }> = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  NO_SHOW: { label: 'No Show', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
};

const KANBAN_STAGES: ApplicationStatus[] = ['NEW', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'HIRED'];

const formatCurrency = (min: number | null, max: number | null, currency: string = 'INR') => {
  if (!min && !max) return 'Not disclosed';
  const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 0 });
  if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
  if (min) return `${formatter.format(min)}+`;
  return `Up to ${formatter.format(max!)}`;
};

export default function RecruitmentPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [activeTab, setActiveTab] = useState('jobs');
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [stats, setStats] = useState<RecruitmentStats | null>(null);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [designations, setDesignations] = useState<{ id: number; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterJobStatus, setFilterJobStatus] = useState<JobStatus | ''>('');
  const [filterAppStatus, setFilterAppStatus] = useState<ApplicationStatus | ''>('');
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // Job Modal
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [jobForm, setJobForm] = useState({
    title: '',
    departmentId: '',
    designationId: '',
    locationId: '',
    description: '',
    requirements: '',
    responsibilities: '',
    experience: '',
    salaryMin: '',
    salaryMax: '',
    employmentType: 'FULL_TIME' as EmploymentType,
    skills: '',
    openings: '1',
    closingDate: '',
    isRemote: false,
  });

  // Application Detail Modal
  const [showAppModal, setShowAppModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<JobApplicationFull | null>(null);

  // Interview Modal
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewForm, setInterviewForm] = useState({
    applicationId: 0,
    interviewerId: '',
    title: '',
    type: 'VIDEO' as InterviewType,
    scheduledAt: '',
    duration: '60',
    location: '',
  });

  // Kanban view
  const [kanbanApps, setKanbanApps] = useState<Record<ApplicationStatus, JobApplication[]>>({} as Record<ApplicationStatus, JobApplication[]>);

  // Users for interviewer selection
  const [users, setUsers] = useState<{ id: number; firstName: string; lastName?: string }[]>([]);

  useEffect(() => {
    loadData();
    loadOptions();
  }, [filterJobStatus]);

  useEffect(() => {
    loadApplications();
  }, [filterAppStatus, selectedJobId]);

  const loadOptions = async () => {
    try {
      const [deptRes, desigRes, locRes, usersRes] = await Promise.all([
        tenantApi.getDepartments(),
        tenantApi.getDesignations(),
        tenantApi.getLocations(),
        tenantApi.getUsers(),
      ]);
      if (deptRes.data) setDepartments(deptRes.data.map((d: { id: number; name: string }) => ({ id: d.id, name: d.name })));
      if (desigRes.data) setDesignations(desigRes.data.map((d: { id: number; name: string }) => ({ id: d.id, name: d.name })));
      if (locRes.data) setLocations(locRes.data.map((l: { id: number; name: string }) => ({ id: l.id, name: l.name })));
      if (usersRes.data) setUsers(usersRes.data.users.map((u: { id: number; firstName: string; lastName?: string }) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName })));
    } catch (err) {
      console.error('Failed to load options:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsRes, statsRes] = await Promise.all([
        recruitmentApi.listJobs({ status: filterJobStatus || undefined }),
        recruitmentApi.getStats(),
      ]);

      if (jobsRes.data) setJobs(jobsRes.data.data || []);
      if (statsRes.data) setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const res = await recruitmentApi.listApplications({
        jobId: selectedJobId || undefined,
        status: filterAppStatus || undefined,
      });
      const apps = res.data?.data || [];
      setApplications(apps);

      // Organize for Kanban view
      const grouped: Record<ApplicationStatus, JobApplication[]> = {
        NEW: [], SCREENING: [], SHORTLISTED: [], INTERVIEW: [], OFFER: [], HIRED: [], REJECTED: [], WITHDRAWN: []
      };
      apps.forEach((app: JobApplication) => {
        if (grouped[app.status]) grouped[app.status].push(app);
      });
      setKanbanApps(grouped);
    } catch (err) {
      console.error('Failed to load applications:', err);
    }
  };

  const handleCreateJob = async () => {
    try {
      if (editingJob) {
        await recruitmentApi.updateJob(editingJob.id, {
          title: jobForm.title,
          departmentId: jobForm.departmentId ? parseInt(jobForm.departmentId) : undefined,
          designationId: jobForm.designationId ? parseInt(jobForm.designationId) : undefined,
          locationId: jobForm.locationId ? parseInt(jobForm.locationId) : undefined,
          description: jobForm.description,
          requirements: jobForm.requirements,
          responsibilities: jobForm.responsibilities || undefined,
          experience: jobForm.experience,
          salaryMin: jobForm.salaryMin ? parseFloat(jobForm.salaryMin) : undefined,
          salaryMax: jobForm.salaryMax ? parseFloat(jobForm.salaryMax) : undefined,
          employmentType: jobForm.employmentType,
          skills: jobForm.skills || undefined,
          openings: parseInt(jobForm.openings),
          closingDate: jobForm.closingDate || undefined,
          isRemote: jobForm.isRemote,
        });
      } else {
        await recruitmentApi.createJob({
          title: jobForm.title,
          departmentId: jobForm.departmentId ? parseInt(jobForm.departmentId) : undefined,
          designationId: jobForm.designationId ? parseInt(jobForm.designationId) : undefined,
          locationId: jobForm.locationId ? parseInt(jobForm.locationId) : undefined,
          description: jobForm.description,
          requirements: jobForm.requirements,
          responsibilities: jobForm.responsibilities || undefined,
          experience: jobForm.experience,
          salaryMin: jobForm.salaryMin ? parseFloat(jobForm.salaryMin) : undefined,
          salaryMax: jobForm.salaryMax ? parseFloat(jobForm.salaryMax) : undefined,
          employmentType: jobForm.employmentType,
          skills: jobForm.skills || undefined,
          openings: parseInt(jobForm.openings),
          closingDate: jobForm.closingDate || undefined,
          isRemote: jobForm.isRemote,
        });
      }
      setShowJobModal(false);
      resetJobForm();
      loadData();
    } catch (err) {
      console.error('Failed to save job:', err);
    }
  };

  const resetJobForm = () => {
    setEditingJob(null);
    setJobForm({
      title: '',
      departmentId: '',
      designationId: '',
      locationId: '',
      description: '',
      requirements: '',
      responsibilities: '',
      experience: '',
      salaryMin: '',
      salaryMax: '',
      employmentType: 'FULL_TIME',
      skills: '',
      openings: '1',
      closingDate: '',
      isRemote: false,
    });
  };

  const handleEditJob = (job: JobPosting) => {
    setEditingJob(job);
    setJobForm({
      title: job.title,
      departmentId: job.departmentId?.toString() || '',
      designationId: job.designationId?.toString() || '',
      locationId: job.locationId?.toString() || '',
      description: job.description,
      requirements: job.requirements,
      responsibilities: job.responsibilities || '',
      experience: job.experience,
      salaryMin: job.salaryMin?.toString() || '',
      salaryMax: job.salaryMax?.toString() || '',
      employmentType: job.employmentType,
      skills: job.skills || '',
      openings: job.openings.toString(),
      closingDate: job.closingDate?.split('T')[0] || '',
      isRemote: job.isRemote,
    });
    setShowJobModal(true);
  };

  const handleDeleteJob = async (id: number) => {
    if (!confirm('Are you sure you want to delete this job posting?')) return;
    try {
      await recruitmentApi.deleteJob(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete job:', err);
      alert('Cannot delete job with applications');
    }
  };

  const handlePublishJob = async (id: number) => {
    try {
      await recruitmentApi.publishJob(id);
      loadData();
    } catch (err) {
      console.error('Failed to publish job:', err);
    }
  };

  const handlePauseJob = async (id: number) => {
    try {
      await recruitmentApi.pauseJob(id);
      loadData();
    } catch (err) {
      console.error('Failed to pause job:', err);
    }
  };

  const handleCloseJob = async (id: number) => {
    try {
      await recruitmentApi.closeJob(id);
      loadData();
    } catch (err) {
      console.error('Failed to close job:', err);
    }
  };

  const handleUpdateAppStatus = async (appId: number, status: ApplicationStatus) => {
    try {
      await recruitmentApi.updateApplication(appId, { status });
      loadApplications();
      if (selectedApplication?.id === appId) {
        setSelectedApplication({ ...selectedApplication, status });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleUpdateAppRating = async (appId: number, rating: number) => {
    try {
      await recruitmentApi.updateApplication(appId, { rating });
      loadApplications();
    } catch (err) {
      console.error('Failed to update rating:', err);
    }
  };

  const openApplicationDetail = async (app: JobApplication) => {
    try {
      const res = await recruitmentApi.getApplicationFull(app.id);
      if (res.data) setSelectedApplication(res.data);
      setShowAppModal(true);
    } catch (err) {
      console.error('Failed to load application details:', err);
    }
  };

  const openScheduleInterview = (app: JobApplication) => {
    setInterviewForm({
      applicationId: app.id,
      interviewerId: '',
      title: '',
      type: 'VIDEO',
      scheduledAt: '',
      duration: '60',
      location: '',
    });
    setShowInterviewModal(true);
  };

  const handleScheduleInterview = async () => {
    try {
      if (!interviewForm.interviewerId || !interviewForm.title || !interviewForm.scheduledAt) {
        return;
      }
      await interviewApi.scheduleInterview({
        applicationId: interviewForm.applicationId,
        interviewerId: parseInt(interviewForm.interviewerId),
        title: interviewForm.title,
        type: interviewForm.type,
        scheduledAt: new Date(interviewForm.scheduledAt).toISOString(),
        duration: parseInt(interviewForm.duration),
        location: interviewForm.location || undefined,
      });
      setShowInterviewModal(false);
      loadApplications();
      // Refresh selected application if open
      if (selectedApplication && selectedApplication.id === interviewForm.applicationId) {
        const res = await recruitmentApi.getApplicationFull(selectedApplication.id);
        if (res.data) setSelectedApplication(res.data);
      }
    } catch (err) {
      console.error('Failed to schedule interview:', err);
    }
  };

  const handleCancelInterview = async (interviewId: number) => {
    try {
      await interviewApi.cancelInterview(interviewId);
      if (selectedApplication) {
        const res = await recruitmentApi.getApplicationFull(selectedApplication.id);
        if (res.data) setSelectedApplication(res.data);
      }
    } catch (err) {
      console.error('Failed to cancel interview:', err);
    }
  };

  const handleKanbanDrop = async (appId: number, newStatus: ApplicationStatus) => {
    try {
      await recruitmentApi.updateApplication(appId, { status: newStatus });
      loadApplications();
    } catch (err) {
      console.error('Failed to move application:', err);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Recruitment">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Recruitment">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Jobs</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.jobs.active}</p>
                </div>
                <Briefcase className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Applications</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.applications.total}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">In Interview</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.applications.interview}</p>
                </div>
                <Calendar className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Hired</p>
                  <p className="text-2xl font-bold dark:text-white">{stats.applications.hired}</p>
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
            <TabsTrigger value="jobs">Job Postings ({jobs.length})</TabsTrigger>
            <TabsTrigger value="applications">Applications ({applications.length})</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          </TabsList>

          {activeTab === 'jobs' && (
            <Button onClick={() => { resetJobForm(); setShowJobModal(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          )}
        </div>

        {/* Jobs Tab */}
        <TabsContent value="jobs">
          <div className="flex items-center gap-4 mb-4">
            <Select value={filterJobStatus} onValueChange={(v) => setFilterJobStatus(v as JobStatus | '')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {jobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No job postings</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first job posting</p>
                  <Button onClick={() => setShowJobModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Job
                  </Button>
                </CardContent>
              </Card>
            ) : (
              jobs.map((job) => (
                <Card key={job.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg dark:text-white">{job.title}</h3>
                          <Badge className={JOB_STATUS_CONFIG[job.status].color}>
                            {JOB_STATUS_CONFIG[job.status].label}
                          </Badge>
                          <Badge variant="outline">
                            {EMPLOYMENT_TYPES.find(t => t.value === job.employmentType)?.label}
                          </Badge>
                          {job.isRemote && <Badge variant="secondary">Remote</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                          {job.department && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {job.department.name}
                            </span>
                          )}
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {job.location.name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {job.experience}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {formatCurrency(job.salaryMin, job.salaryMax, job.currency)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>{job.openings} opening{job.openings !== 1 ? 's' : ''}</span>
                          <span>{job._count?.applications || 0} applications</span>
                          {job.postedAt && (
                            <span>Posted {new Date(job.postedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {job.status === 'DRAFT' && (
                          <Button size="sm" onClick={() => handlePublishJob(job.id)}>
                            <Send className="h-4 w-4 mr-1" />
                            Publish
                          </Button>
                        )}
                        {job.status === 'ACTIVE' && (
                          <Button variant="outline" size="sm" onClick={() => handlePauseJob(job.id)}>
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                        )}
                        {job.status === 'PAUSED' && (
                          <Button variant="outline" size="sm" onClick={() => handlePublishJob(job.id)}>
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </Button>
                        )}
                        {(job.status === 'ACTIVE' || job.status === 'PAUSED') && (
                          <Button variant="outline" size="sm" onClick={() => handleCloseJob(job.id)}>
                            <XCircle className="h-4 w-4 mr-1" />
                            Close
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleEditJob(job)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {job.status === 'DRAFT' && (
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteJob(job.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications">
          <div className="flex items-center gap-4 mb-4">
            <Select value={selectedJobId?.toString() || ''} onValueChange={(v) => setSelectedJobId(v ? parseInt(v) : null)}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="All Jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Jobs</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id.toString()}>{job.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAppStatus} onValueChange={(v) => setFilterAppStatus(v as ApplicationStatus | '')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                {Object.entries(APP_STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {applications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No applications</h3>
                  <p className="text-gray-500 dark:text-gray-400">Applications will appear here when candidates apply</p>
                </CardContent>
              </Card>
            ) : (
              applications.map((app) => (
                <Card key={app.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openApplicationDetail(app)}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>{app.firstName.charAt(0)}{app.lastName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium dark:text-white">{app.firstName} {app.lastName}</h3>
                            <Badge className={APP_STATUS_CONFIG[app.status].color}>
                              {APP_STATUS_CONFIG[app.status].label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{app.email} | {app.phone}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {app.jobPosting?.title}
                            {app.currentRole && ` | Currently ${app.currentRole}`}
                            {app.currentCompany && ` at ${app.currentCompany}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); openScheduleInterview(app); }}
                        >
                          <CalendarPlus className="h-4 w-4 mr-1" />
                          Schedule
                        </Button>
                        {app.rating && (
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${star <= app.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        )}
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Applied {new Date(app.appliedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Pipeline Tab - Kanban Board */}
        <TabsContent value="pipeline">
          <div className="flex items-center gap-4 mb-4">
            <Select value={selectedJobId?.toString() || ''} onValueChange={(v) => setSelectedJobId(v ? parseInt(v) : null)}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="All Jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Jobs</SelectItem>
                {jobs.filter(j => j.status === 'ACTIVE').map((job) => (
                  <SelectItem key={job.id} value={job.id.toString()}>{job.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_STAGES.map((stage) => (
              <div
                key={stage}
                className="min-w-[280px] bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const appId = parseInt(e.dataTransfer.getData('appId'));
                  if (appId) handleKanbanDrop(appId, stage);
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-700 dark:text-gray-300">{APP_STATUS_CONFIG[stage].label}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {kanbanApps[stage]?.length || 0}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  {(kanbanApps[stage] || []).map((app) => (
                    <Card
                      key={app.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('appId', app.id.toString())}
                      onClick={() => openApplicationDetail(app)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{app.firstName.charAt(0)}{app.lastName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate dark:text-white">{app.firstName} {app.lastName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{app.jobPosting?.title}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          {app.rating && (
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${star <= app.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                          )}
                          <span>{new Date(app.appliedAt).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(kanbanApps[stage] || []).length === 0 && (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                      No candidates
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Job Modal */}
      <Dialog open={showJobModal} onOpenChange={setShowJobModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingJob ? 'Edit Job Posting' : 'Create Job Posting'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Job Title *</Label>
              <Input
                value={jobForm.title}
                onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                placeholder="e.g., Senior Software Engineer"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Department</Label>
                <Select value={jobForm.departmentId} onValueChange={(v) => setJobForm({ ...jobForm, departmentId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Designation</Label>
                <Select value={jobForm.designationId} onValueChange={(v) => setJobForm({ ...jobForm, designationId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {designations.map((d) => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Select value={jobForm.locationId} onValueChange={(v) => setJobForm({ ...jobForm, locationId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Employment Type *</Label>
                <Select value={jobForm.employmentType} onValueChange={(v) => setJobForm({ ...jobForm, employmentType: v as EmploymentType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Experience *</Label>
                <Select value={jobForm.experience} onValueChange={(v) => setJobForm({ ...jobForm, experience: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_OPTIONS.map((exp) => (
                      <SelectItem key={exp} value={exp}>{exp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Job Description *</Label>
              <Textarea
                value={jobForm.description}
                onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                placeholder="Describe the role..."
                rows={3}
              />
            </div>
            <div>
              <Label>Requirements *</Label>
              <Textarea
                value={jobForm.requirements}
                onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                placeholder="Required skills and qualifications..."
                rows={3}
              />
            </div>
            <div>
              <Label>Responsibilities</Label>
              <Textarea
                value={jobForm.responsibilities}
                onChange={(e) => setJobForm({ ...jobForm, responsibilities: e.target.value })}
                placeholder="Key responsibilities..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Salary Min (INR)</Label>
                <Input
                  type="number"
                  value={jobForm.salaryMin}
                  onChange={(e) => setJobForm({ ...jobForm, salaryMin: e.target.value })}
                  placeholder="e.g., 1000000"
                />
              </div>
              <div>
                <Label>Salary Max (INR)</Label>
                <Input
                  type="number"
                  value={jobForm.salaryMax}
                  onChange={(e) => setJobForm({ ...jobForm, salaryMax: e.target.value })}
                  placeholder="e.g., 1500000"
                />
              </div>
              <div>
                <Label>Openings</Label>
                <Input
                  type="number"
                  min="1"
                  value={jobForm.openings}
                  onChange={(e) => setJobForm({ ...jobForm, openings: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Skills (comma-separated)</Label>
                <Input
                  value={jobForm.skills}
                  onChange={(e) => setJobForm({ ...jobForm, skills: e.target.value })}
                  placeholder="React, Node.js, TypeScript"
                />
              </div>
              <div>
                <Label>Closing Date</Label>
                <Input
                  type="date"
                  value={jobForm.closingDate}
                  onChange={(e) => setJobForm({ ...jobForm, closingDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isRemote"
                checked={jobForm.isRemote}
                onChange={(e) => setJobForm({ ...jobForm, isRemote: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="isRemote" className="cursor-pointer">Remote position</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJobModal(false)}>Cancel</Button>
            <Button
              onClick={handleCreateJob}
              disabled={!jobForm.title || !jobForm.description || !jobForm.requirements || !jobForm.experience}
            >
              {editingJob ? 'Update' : 'Create'} Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Application Detail Modal */}
      <Dialog open={showAppModal} onOpenChange={setShowAppModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-xl">
                    {selectedApplication.firstName.charAt(0)}{selectedApplication.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedApplication.firstName} {selectedApplication.lastName}</h3>
                  <p className="text-gray-500">{selectedApplication.email}</p>
                  <p className="text-gray-500">{selectedApplication.phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-500">Applied For</Label>
                  <p className="font-medium">{selectedApplication.jobPosting?.title}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Applied On</Label>
                  <p className="font-medium">{new Date(selectedApplication.appliedAt).toLocaleDateString()}</p>
                </div>
                {selectedApplication.currentRole && (
                  <div>
                    <Label className="text-gray-500">Current Role</Label>
                    <p className="font-medium">{selectedApplication.currentRole}</p>
                  </div>
                )}
                {selectedApplication.currentCompany && (
                  <div>
                    <Label className="text-gray-500">Current Company</Label>
                    <p className="font-medium">{selectedApplication.currentCompany}</p>
                  </div>
                )}
                {selectedApplication.noticePeriod && (
                  <div>
                    <Label className="text-gray-500">Notice Period</Label>
                    <p className="font-medium">{selectedApplication.noticePeriod}</p>
                  </div>
                )}
                {selectedApplication.expectedSalary && (
                  <div>
                    <Label className="text-gray-500">Expected Salary</Label>
                    <p className="font-medium">{formatCurrency(selectedApplication.expectedSalary, null, 'INR')}</p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-gray-500">Status</Label>
                <Select
                  value={selectedApplication.status}
                  onValueChange={(v) => handleUpdateAppStatus(selectedApplication.id, v as ApplicationStatus)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(APP_STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-500">Rating</Label>
                <div className="flex items-center gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleUpdateAppRating(selectedApplication.id, star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-6 w-6 ${star <= (selectedApplication.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} hover:text-yellow-400`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {selectedApplication.coverLetter && (
                <div>
                  <Label className="text-gray-500">Cover Letter</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedApplication.coverLetter}</p>
                </div>
              )}

              <div className="flex gap-2">
                {selectedApplication.resumeUrl && (
                  <Button variant="outline" asChild>
                    <a href={selectedApplication.resumeUrl} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4 mr-2" />
                      View Resume
                    </a>
                  </Button>
                )}
                {selectedApplication.linkedinUrl && (
                  <Button variant="outline" asChild>
                    <a href={selectedApplication.linkedinUrl} target="_blank" rel="noopener noreferrer">
                      LinkedIn
                    </a>
                  </Button>
                )}
              </div>

              {/* Interviews Section */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-gray-700 font-medium">Interviews</Label>
                  <Button size="sm" onClick={() => openScheduleInterview(selectedApplication)}>
                    <CalendarPlus className="h-4 w-4 mr-1" />
                    Schedule Interview
                  </Button>
                </div>
                {selectedApplication.interviews && selectedApplication.interviews.length > 0 ? (
                  <div className="space-y-3">
                    {selectedApplication.interviews.map((interview) => (
                      <div key={interview.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {interview.type === 'VIDEO' && <Video className="h-4 w-4 text-blue-500" />}
                            {interview.type === 'PHONE' && <Phone className="h-4 w-4 text-green-500" />}
                            {interview.type === 'IN_PERSON' && <User className="h-4 w-4 text-purple-500" />}
                            {interview.type === 'TECHNICAL' && <FileText className="h-4 w-4 text-orange-500" />}
                            {interview.type === 'HR' && <MessageSquare className="h-4 w-4 text-pink-500" />}
                            {interview.type === 'PANEL' && <Users className="h-4 w-4 text-indigo-500" />}
                            <span className="font-medium text-sm">{interview.title}</span>
                          </div>
                          <Badge className={INTERVIEW_STATUS_CONFIG[interview.status].color}>
                            {INTERVIEW_STATUS_CONFIG[interview.status].label}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {new Date(interview.scheduledAt).toLocaleString()}
                            <span className="text-gray-400">({interview.duration} min)</span>
                          </div>
                          {interview.interviewer && (
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {interview.interviewer.firstName} {interview.interviewer.lastName}
                            </div>
                          )}
                          {interview.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              {interview.location}
                            </div>
                          )}
                        </div>
                        {interview.status === 'COMPLETED' && interview.rating && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${star <= interview.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                />
                              ))}
                              {interview.recommendation && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {interview.recommendation.replace('_', ' ')}
                                </Badge>
                              )}
                            </div>
                            {interview.feedback && (
                              <p className="text-xs text-gray-600 mt-1">{interview.feedback}</p>
                            )}
                          </div>
                        )}
                        {interview.status === 'SCHEDULED' && (
                          <div className="mt-2 flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={() => handleCancelInterview(interview.id)}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-lg">
                    No interviews scheduled
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Interview Scheduling Modal */}
      <Dialog open={showInterviewModal} onOpenChange={setShowInterviewModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Interview Title *</Label>
              <Input
                value={interviewForm.title}
                onChange={(e) => setInterviewForm({ ...interviewForm, title: e.target.value })}
                placeholder="e.g., Technical Round 1, HR Interview"
              />
            </div>
            <div>
              <Label>Interview Type</Label>
              <Select
                value={interviewForm.type}
                onValueChange={(v) => setInterviewForm({ ...interviewForm, type: v as InterviewType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Interviewer *</Label>
              <Select
                value={interviewForm.interviewerId}
                onValueChange={(v) => setInterviewForm({ ...interviewForm, interviewerId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select interviewer" />
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={interviewForm.scheduledAt}
                  onChange={(e) => setInterviewForm({ ...interviewForm, scheduledAt: e.target.value })}
                />
              </div>
              <div>
                <Label>Duration (mins)</Label>
                <Select
                  value={interviewForm.duration}
                  onValueChange={(v) => setInterviewForm({ ...interviewForm, duration: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 mins</SelectItem>
                    <SelectItem value="45">45 mins</SelectItem>
                    <SelectItem value="60">60 mins</SelectItem>
                    <SelectItem value="90">90 mins</SelectItem>
                    <SelectItem value="120">120 mins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Location / Meeting Link</Label>
              <Input
                value={interviewForm.location}
                onChange={(e) => setInterviewForm({ ...interviewForm, location: e.target.value })}
                placeholder="e.g., Zoom link or office address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInterviewModal(false)}>Cancel</Button>
            <Button
              onClick={handleScheduleInterview}
              disabled={!interviewForm.title || !interviewForm.interviewerId || !interviewForm.scheduledAt}
            >
              Schedule Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
