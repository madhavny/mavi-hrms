'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { leaveApi, LeaveBalance, LeaveRequest, LeaveType } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { FileText, Plus, Calendar, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';

export default function LeavePage() {
  const { toast } = useToast();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    leaveTypeId: '',
    fromDate: '',
    toDate: '',
    totalDays: '1',
    reason: '',
  });

  useEffect(() => {
    loadLeaveData();
  }, []);

  const loadLeaveData = async () => {
    try {
      setLoading(true);
      const [balancesRes, requestsRes, typesRes] = await Promise.all([
        leaveApi.getMyLeaveBalance(),
        leaveApi.getMyLeaveRequests(),
        leaveApi.getLeaveTypes(),
      ]);

      if (balancesRes.data) setBalances(balancesRes.data);
      if (requestsRes.data) setRequests(requestsRes.data.requests);
      if (typesRes.data) setLeaveTypes(typesRes.data);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to load leave data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (from: string, to: string) => {
    if (!from || !to) return 1;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleDateChange = (field: 'fromDate' | 'toDate', value: string) => {
    const newFormData = { ...formData, [field]: value };

    if (newFormData.fromDate && newFormData.toDate) {
      const days = calculateDays(newFormData.fromDate, newFormData.toDate);
      newFormData.totalDays = days.toString();
    }

    setFormData(newFormData);
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await leaveApi.applyLeave({
        leaveTypeId: parseInt(formData.leaveTypeId),
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        totalDays: parseFloat(formData.totalDays),
        reason: formData.reason,
      });

      toast({
        title: 'Success',
        description: 'Leave request submitted successfully!',
      });
      setShowApplyModal(false);
      resetForm();
      loadLeaveData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to apply for leave',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openCancelDialog = (id: number) => {
    setRequestToCancel(id);
    setShowCancelDialog(true);
  };

  const handleCancelRequest = async () => {
    if (!requestToCancel) return;
    setCancelling(true);

    try {
      await leaveApi.cancelLeaveRequest(requestToCancel);
      toast({
        title: 'Success',
        description: 'Leave request cancelled successfully',
      });
      loadLeaveData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to cancel request',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
      setRequestToCancel(null);
    }
  };

  const resetForm = () => {
    setFormData({
      leaveTypeId: '',
      fromDate: '',
      toDate: '',
      totalDays: '1',
      reason: '',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardLayout title="Leave Management">
      <div className="space-y-6">
        {/* Leave Balance Cards */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Leave Balance</h2>
            <Button onClick={() => setShowApplyModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Apply Leave
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {loading ? (
              <p className="col-span-4 text-center py-8">Loading...</p>
            ) : balances.length === 0 ? (
              <p className="col-span-4 text-center py-8 text-gray-500">
                No leave balance allocated yet
              </p>
            ) : (
              balances.map((balance) => (
                <Card key={balance.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {balance.leaveType?.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-medium">{balance.totalDays}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Used:</span>
                        <span className="font-medium text-red-600">{balance.usedDays}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Pending:</span>
                        <span className="font-medium text-yellow-600">{balance.pendingDays}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="text-gray-600">Available:</span>
                        <span className="font-bold text-green-600">{balance.availableDays}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Leave Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Leave Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="PENDING">Pending</TabsTrigger>
                <TabsTrigger value="APPROVED">Approved</TabsTrigger>
                <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <LeaveRequestsTable
                  requests={requests}
                  loading={loading}
                  formatDate={formatDate}
                  getStatusColor={getStatusColor}
                  onCancel={openCancelDialog}
                />
              </TabsContent>
              <TabsContent value="PENDING">
                <LeaveRequestsTable
                  requests={requests.filter((r) => r.status === 'PENDING')}
                  loading={loading}
                  formatDate={formatDate}
                  getStatusColor={getStatusColor}
                  onCancel={openCancelDialog}
                />
              </TabsContent>
              <TabsContent value="APPROVED">
                <LeaveRequestsTable
                  requests={requests.filter((r) => r.status === 'APPROVED')}
                  loading={loading}
                  formatDate={formatDate}
                  getStatusColor={getStatusColor}
                  onCancel={openCancelDialog}
                />
              </TabsContent>
              <TabsContent value="REJECTED">
                <LeaveRequestsTable
                  requests={requests.filter((r) => r.status === 'REJECTED')}
                  loading={loading}
                  formatDate={formatDate}
                  getStatusColor={getStatusColor}
                  onCancel={openCancelDialog}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Apply Leave Modal */}
        <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>
                Submit a leave request by filling in the details below. Your request will be sent for approval.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleApplyLeave}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="leaveTypeId">Leave Type *</Label>
                  <Select
                    required
                    value={formData.leaveTypeId}
                    onValueChange={(value) => setFormData({ ...formData, leaveTypeId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((type) => {
                        const balance = balances.find((b) => b.leaveTypeId === type.id);
                        return (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name} {balance && `(Available: ${balance.availableDays})`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fromDate">From Date *</Label>
                    <Input
                      id="fromDate"
                      type="date"
                      required
                      value={formData.fromDate}
                      onChange={(e) => handleDateChange('fromDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toDate">To Date *</Label>
                    <Input
                      id="toDate"
                      type="date"
                      required
                      value={formData.toDate}
                      onChange={(e) => handleDateChange('toDate', e.target.value)}
                      min={formData.fromDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalDays">Total Days *</Label>
                  <Input
                    id="totalDays"
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={formData.totalDays}
                    onChange={(e) => setFormData({ ...formData, totalDays: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">You can enter 0.5 for half day</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason *</Label>
                  <Textarea
                    id="reason"
                    required
                    minLength={10}
                    rows={4}
                    placeholder="Please provide a reason for your leave..."
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => {
                    setShowApplyModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Spinner size="sm" className="mr-2" />}
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Cancel Leave Request Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Leave Request</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this leave request? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cancelling}>Keep Request</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelRequest}
                disabled={cancelling}
                className="bg-red-600 hover:bg-red-700"
              >
                {cancelling && <Spinner size="sm" className="mr-2" />}
                {cancelling ? 'Cancelling...' : 'Cancel Request'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

interface LeaveRequestsTableProps {
  requests: LeaveRequest[];
  loading: boolean;
  formatDate: (date: string) => string;
  getStatusColor: (status: string) => string;
  onCancel: (id: number) => void;
}

function LeaveRequestsTable({
  requests,
  loading,
  formatDate,
  getStatusColor,
  onCancel,
}: LeaveRequestsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Leave Type</TableHead>
          <TableHead>From Date</TableHead>
          <TableHead>To Date</TableHead>
          <TableHead>Days</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8">
              Loading...
            </TableCell>
          </TableRow>
        ) : requests.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
              No leave requests found
            </TableCell>
          </TableRow>
        ) : (
          requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">{request.leaveType?.name}</TableCell>
              <TableCell>{formatDate(request.fromDate)}</TableCell>
              <TableCell>{formatDate(request.toDate)}</TableCell>
              <TableCell>{request.totalDays}</TableCell>
              <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
              <TableCell>
                <span className={`text-xs px-2 py-1 rounded ${getStatusColor(request.status)}`}>
                  {request.status}
                </span>
              </TableCell>
              <TableCell>
                {request.status === 'PENDING' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancel(request.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
    </div>
  );
}
