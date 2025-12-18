'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { leaveApi, LeaveRequest, LeaveType, tenantApi } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardCheck,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Search,
  Filter,
  Eye,
  Check,
  X,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';

interface Department {
  id: number;
  name: string;
  code: string;
}

export default function LeaveApprovalsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewComments, setReviewComments] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    leaveTypeId: 'all',
    search: '',
  });

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [requests]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [requestsRes, typesRes, departmentsRes] = await Promise.all([
        leaveApi.getLeaveRequests({ limit: 1000 }),
        leaveApi.getLeaveTypes(),
        tenantApi.getDepartments(),
      ]);

      if (requestsRes.data) setRequests(requestsRes.data.requests);
      if (typesRes.data) setLeaveTypes(typesRes.data);
      if (departmentsRes.data) setDepartments(departmentsRes.data);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const stats = {
      pending: requests.filter((r) => r.status === 'PENDING').length,
      approved: requests.filter((r) => r.status === 'APPROVED').length,
      rejected: requests.filter((r) => r.status === 'REJECTED').length,
      total: requests.length,
    };
    setStats(stats);
  };

  const filteredRequests = requests.filter((request) => {
    // Status filter
    if (filters.status !== 'all' && request.status !== filters.status) {
      return false;
    }

    // Leave type filter
    if (filters.leaveTypeId !== 'all' && request.leaveTypeId !== parseInt(filters.leaveTypeId)) {
      return false;
    }

    // Search filter (employee name, email, or employee code)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const employeeName = `${request.user?.firstName || ''} ${request.user?.lastName || ''}`.toLowerCase();
      const employeeEmail = request.user?.email?.toLowerCase() || '';
      const employeeCode = request.user?.employeeCode?.toLowerCase() || '';

      if (!employeeName.includes(searchLower) &&
          !employeeEmail.includes(searchLower) &&
          !employeeCode.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });

  const handleOpenReview = (request: LeaveRequest, action: 'APPROVED' | 'REJECTED') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewComments('');
    setShowReviewModal(true);
  };

  const handleViewDetails = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleReviewSubmit = async () => {
    if (!selectedRequest) return;
    setReviewing(true);

    try {
      await leaveApi.reviewLeaveRequest(selectedRequest.id, {
        status: reviewAction,
        reviewComments: reviewComments || undefined,
      });

      toast({
        title: 'Success',
        description: `Leave request ${reviewAction.toLowerCase()} successfully!`,
      });

      setShowReviewModal(false);
      setSelectedRequest(null);
      setReviewComments('');
      loadData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to review request',
        variant: 'destructive',
      });
    } finally {
      setReviewing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; className?: string }> = {
      PENDING: { variant: 'secondary', icon: <Clock className="h-3 w-3" />, className: 'dark:bg-yellow-900/30 dark:text-yellow-300' },
      APPROVED: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, className: 'dark:bg-green-900/30 dark:text-green-300' },
      REJECTED: { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, className: 'dark:bg-red-900/30 dark:text-red-300' },
      CANCELLED: { variant: 'outline', icon: <X className="h-3 w-3" />, className: 'dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700' },
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className || ''}`}>
        {config.icon}
        {status}
      </Badge>
    );
  };

  return (
    <DashboardLayout title="Leave Approvals">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-white">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-white">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Rejected</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-white">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <ClipboardCheck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Requests</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-white">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Search Employee</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Name, email, or code..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select
                  value={filters.leaveTypeId}
                  onValueChange={(value) => setFilters({ ...filters, leaveTypeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Leave Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Leave Types</SelectItem>
                    {leaveTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setFilters({ status: 'all', leaveTypeId: 'all', search: '' })}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leave Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Leave Requests
            </CardTitle>
            <CardDescription>
              Review and manage employee leave requests.
              {stats.pending > 0 && (
                <span className="text-yellow-600 font-medium"> {stats.pending} request(s) pending your review.</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="PENDING">
              <TabsList>
                <TabsTrigger value="PENDING" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending ({stats.pending})
                </TabsTrigger>
                <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                <TabsTrigger value="APPROVED">Approved ({stats.approved})</TabsTrigger>
                <TabsTrigger value="REJECTED">Rejected ({stats.rejected})</TabsTrigger>
              </TabsList>

              <TabsContent value="PENDING">
                <RequestsTable
                  requests={filteredRequests.filter((r) => r.status === 'PENDING')}
                  loading={loading}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                  onView={handleViewDetails}
                  onApprove={(r) => handleOpenReview(r, 'APPROVED')}
                  onReject={(r) => handleOpenReview(r, 'REJECTED')}
                  showActions={true}
                />
              </TabsContent>

              <TabsContent value="all">
                <RequestsTable
                  requests={filteredRequests}
                  loading={loading}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                  onView={handleViewDetails}
                  onApprove={(r) => handleOpenReview(r, 'APPROVED')}
                  onReject={(r) => handleOpenReview(r, 'REJECTED')}
                  showActions={true}
                />
              </TabsContent>

              <TabsContent value="APPROVED">
                <RequestsTable
                  requests={filteredRequests.filter((r) => r.status === 'APPROVED')}
                  loading={loading}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                  onView={handleViewDetails}
                  onApprove={(r) => handleOpenReview(r, 'APPROVED')}
                  onReject={(r) => handleOpenReview(r, 'REJECTED')}
                  showActions={false}
                />
              </TabsContent>

              <TabsContent value="REJECTED">
                <RequestsTable
                  requests={filteredRequests.filter((r) => r.status === 'REJECTED')}
                  loading={loading}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                  onView={handleViewDetails}
                  onApprove={(r) => handleOpenReview(r, 'APPROVED')}
                  onReject={(r) => handleOpenReview(r, 'REJECTED')}
                  showActions={false}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Review Modal */}
        <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {reviewAction === 'APPROVED' ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Approve Leave Request
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    Reject Leave Request
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {reviewAction === 'APPROVED'
                  ? 'Confirm approval of this leave request. Add optional comments below.'
                  : 'Please provide a reason for rejecting this leave request.'}
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4 py-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Employee:</span>
                    <span className="font-medium dark:text-white">
                      {selectedRequest.user?.firstName} {selectedRequest.user?.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Leave Type:</span>
                    <span className="font-medium dark:text-white">{selectedRequest.leaveType?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Duration:</span>
                    <span className="font-medium dark:text-white">
                      {formatDate(selectedRequest.fromDate)} - {formatDate(selectedRequest.toDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Days:</span>
                    <span className="font-medium dark:text-white">{selectedRequest.totalDays}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reviewComments">
                    Comments {reviewAction === 'REJECTED' && <span className="text-red-500">*</span>}
                  </Label>
                  <Textarea
                    id="reviewComments"
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder={
                      reviewAction === 'APPROVED'
                        ? 'Optional comments...'
                        : 'Please provide a reason for rejection...'
                    }
                    rows={3}
                    required={reviewAction === 'REJECTED'}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={reviewing}
                onClick={() => setShowReviewModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReviewSubmit}
                disabled={reviewing || (reviewAction === 'REJECTED' && !reviewComments.trim())}
                className={reviewAction === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {reviewing && <Spinner size="sm" className="mr-2" />}
                {reviewing ? 'Processing...' : reviewAction === 'APPROVED' ? 'Approve' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Leave Request Details
              </DialogTitle>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-6 py-4">
                {/* Employee Info */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2 dark:text-white">
                    <User className="h-4 w-4" />
                    Employee Information
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                      <p className="font-medium dark:text-white">
                        {selectedRequest.user?.firstName} {selectedRequest.user?.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="font-medium dark:text-white">{selectedRequest.user?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Employee Code</p>
                      <p className="font-medium dark:text-white">{selectedRequest.user?.employeeCode || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Department</p>
                      <p className="font-medium dark:text-white">{selectedRequest.user?.department?.name || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Leave Details */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2 dark:text-white">
                    <Calendar className="h-4 w-4" />
                    Leave Details
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Leave Type</p>
                      <p className="font-medium dark:text-white">{selectedRequest.leaveType?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">From Date</p>
                      <p className="font-medium dark:text-white">{formatDate(selectedRequest.fromDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">To Date</p>
                      <p className="font-medium dark:text-white">{formatDate(selectedRequest.toDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Days</p>
                      <p className="font-medium dark:text-white">{selectedRequest.totalDays} days</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Applied On</p>
                      <p className="font-medium dark:text-white">{formatDateTime(selectedRequest.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2 dark:text-white">
                    <AlertCircle className="h-4 w-4" />
                    Reason for Leave
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <p className="text-gray-700 dark:text-gray-300">{selectedRequest.reason}</p>
                  </div>
                </div>

                {/* Review Info */}
                {selectedRequest.status !== 'PENDING' && selectedRequest.reviewer && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2 dark:text-white">
                      <ClipboardCheck className="h-4 w-4" />
                      Review Information
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Reviewed By</p>
                        <p className="font-medium dark:text-white">
                          {selectedRequest.reviewer?.firstName} {selectedRequest.reviewer?.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Reviewed At</p>
                        <p className="font-medium dark:text-white">
                          {selectedRequest.reviewedAt ? formatDateTime(selectedRequest.reviewedAt) : '-'}
                        </p>
                      </div>
                      {selectedRequest.reviewComments && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Comments</p>
                          <p className="font-medium dark:text-white">{selectedRequest.reviewComments}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons for Pending */}
                {selectedRequest.status === 'PENDING' && (
                  <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleOpenReview(selectedRequest, 'REJECTED');
                      }}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleOpenReview(selectedRequest, 'APPROVED');
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

interface RequestsTableProps {
  requests: LeaveRequest[];
  loading: boolean;
  formatDate: (date: string) => string;
  getStatusBadge: (status: string) => React.ReactNode;
  onView: (request: LeaveRequest) => void;
  onApprove: (request: LeaveRequest) => void;
  onReject: (request: LeaveRequest) => void;
  showActions: boolean;
}

function RequestsTable({
  requests,
  loading,
  formatDate,
  getStatusBadge,
  onView,
  onApprove,
  onReject,
  showActions,
}: RequestsTableProps) {
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Leave Type</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Applied On</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Spinner size="lg" className="mx-auto" />
                  <p className="mt-2 text-gray-500 dark:text-gray-400">Loading requests...</p>
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No leave requests found
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {request.user?.firstName} {request.user?.lastName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{request.user?.employeeCode}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="dark:border-gray-700">{request.leaveType?.name}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(request.fromDate)}</TableCell>
                  <TableCell>{formatDate(request.toDate)}</TableCell>
                  <TableCell className="font-medium">{request.totalDays}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(request.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(request)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {showActions && request.status === 'PENDING' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onApprove(request)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30"
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onReject(request)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <Spinner size="lg" className="mx-auto" />
            <p className="mt-2 text-gray-500 dark:text-gray-400">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No leave requests found
          </div>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className="dark:border-gray-700">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium dark:text-white">
                      {request.user?.firstName} {request.user?.lastName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{request.user?.employeeCode}</p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Leave Type:</span>
                    <Badge variant="outline" className="dark:border-gray-700">{request.leaveType?.name}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                    <span className="dark:text-white">{formatDate(request.fromDate)} - {formatDate(request.toDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Days:</span>
                    <span className="font-medium dark:text-white">{request.totalDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Applied:</span>
                    <span className="dark:text-white">{formatDate(request.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onView(request)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  {showActions && request.status === 'PENDING' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onApprove(request)}
                        className="flex-1 text-green-600 hover:text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30 dark:border-gray-700"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReject(request)}
                        className="flex-1 text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 dark:border-gray-700"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
