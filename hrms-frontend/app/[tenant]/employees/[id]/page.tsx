'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tenantApi, TenantUser, attendanceApi, leaveApi, auditApi, Attendance, LeaveRequest, AuditLog } from '@/lib/api';
import { ArrowLeft, Mail, Phone, Building2, Briefcase, Calendar, Clock, FileText, User, Edit, History } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const tenantSlug = params.tenant as string;
  const employeeId = parseInt(params.id as string);

  const [employee, setEmployee] = useState<TenantUser | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    loadEmployee();
  }, [employeeId]);

  const loadEmployee = async () => {
    try {
      setLoading(true);
      const res = await tenantApi.getUser(employeeId);
      if (res.data) {
        setEmployee(res.data);
        loadAttendance();
        loadLeaveRequests();
        loadAuditLogs();
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to load employee details',
        variant: 'destructive',
      });
      router.push(`/${tenantSlug}/employees`);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    try {
      setAttendanceLoading(true);
      const currentDate = new Date();
      const res = await attendanceApi.getAttendance({
        userId: employeeId,
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
        limit: 10,
      });
      if (res.data) {
        setAttendance(res.data.records);
      }
    } catch (err) {
      console.error('Failed to load attendance', err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadLeaveRequests = async () => {
    try {
      setLeaveLoading(true);
      const res = await leaveApi.getLeaveRequests({
        userId: employeeId,
        limit: 10,
      });
      if (res.data) {
        setLeaveRequests(res.data.requests);
      }
    } catch (err) {
      console.error('Failed to load leave requests', err);
    } finally {
      setLeaveLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const res = await auditApi.getUserActivity(employeeId, { limit: 20 });
      if (res.data) {
        setAuditLogs(res.data.logs);
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PRESENT: 'bg-green-100 text-green-800',
      ABSENT: 'bg-red-100 text-red-800',
      HALF_DAY: 'bg-yellow-100 text-yellow-800',
      LATE: 'bg-orange-100 text-orange-800',
      ON_LEAVE: 'bg-blue-100 text-blue-800',
      HOLIDAY: 'bg-purple-100 text-purple-800',
      WEEKEND: 'bg-gray-100 text-gray-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      LOGIN: 'bg-purple-100 text-purple-800',
      LOGOUT: 'bg-gray-100 text-gray-800',
      LOGIN_FAILED: 'bg-red-100 text-red-800',
      PASSWORD_CHANGE: 'bg-yellow-100 text-yellow-800',
      CLOCK_IN: 'bg-green-100 text-green-800',
      CLOCK_OUT: 'bg-orange-100 text-orange-800',
      LEAVE_APPLY: 'bg-blue-100 text-blue-800',
      LEAVE_APPROVE: 'bg-green-100 text-green-800',
      LEAVE_REJECT: 'bg-red-100 text-red-800',
      LEAVE_CANCEL: 'bg-gray-100 text-gray-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ');
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

  if (loading) {
    return (
      <DashboardLayout title="Employee Details">
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!employee) {
    return (
      <DashboardLayout title="Employee Details">
        <div className="text-center py-12">
          <p className="text-gray-500">Employee not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push(`/${tenantSlug}/employees`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employees
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Employee Details">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push(`/${tenantSlug}/employees`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employees
          </Button>
          <Button
            onClick={() => router.push(`/${tenantSlug}/employees?edit=${employee.id}`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Employee
          </Button>
        </div>

        {/* Employee Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-12 w-12 text-blue-600" />
                </div>
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">
                    {employee.firstName} {employee.lastName}
                  </h2>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      employee.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{employee.email}</span>
                  </div>
                  {employee.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Briefcase className="h-4 w-4" />
                    <span>{employee.role?.name || '-'}</span>
                  </div>
                  {employee.department && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building2 className="h-4 w-4" />
                      <span>{employee.department.name}</span>
                    </div>
                  )}
                </div>

                {employee.employeeCode && (
                  <div className="mt-4">
                    <span className="text-sm text-gray-500">Employee Code: </span>
                    <span className="font-medium">{employee.employeeCode}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Attendance and Leave */}
        <Tabs defaultValue="attendance">
          <TabsList>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Attendance
            </TabsTrigger>
            <TabsTrigger value="leave" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Leave Requests
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Audit Trail
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  This Month&apos;s Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <Spinner size="sm" className="mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : attendance.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            No attendance records found
                          </TableCell>
                        </TableRow>
                      ) : (
                        attendance.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">
                              {formatDate(record.date)}
                            </TableCell>
                            <TableCell>{formatTime(record.clockIn)}</TableCell>
                            <TableCell>{formatTime(record.clockOut)}</TableCell>
                            <TableCell>
                              {record.totalHours ? `${record.totalHours.toFixed(2)}h` : '-'}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`text-xs px-2 py-1 rounded ${getStatusColor(
                                  record.status
                                )}`}
                              >
                                {record.status.replace('_', ' ')}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leave">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Leave Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <Spinner size="sm" className="mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : leaveRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            No leave requests found
                          </TableCell>
                        </TableRow>
                      ) : (
                        leaveRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">
                              {request.leaveType?.name || '-'}
                            </TableCell>
                            <TableCell>{formatDate(request.fromDate)}</TableCell>
                            <TableCell>{formatDate(request.toDate)}</TableCell>
                            <TableCell>{request.totalDays}</TableCell>
                            <TableCell>
                              <span
                                className={`text-xs px-2 py-1 rounded ${getStatusColor(
                                  request.status
                                )}`}
                              >
                                {request.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Activity History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            <Spinner size="sm" className="mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : auditLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                            No activity records found
                          </TableCell>
                        </TableRow>
                      ) : (
                        auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {formatDateTime(log.createdAt)}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`text-xs px-2 py-1 rounded ${getActionColor(log.action)}`}
                              >
                                {formatAction(log.action)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {log.entity}
                              {log.entityName && (
                                <span className="text-gray-500 ml-1">
                                  ({log.entityName})
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {log.changes ? (
                                <span className="text-gray-600 text-sm">
                                  {Object.keys(log.changes).join(', ')} changed
                                </span>
                              ) : log.newValue ? (
                                <span className="text-gray-600 text-sm">
                                  New record created
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
