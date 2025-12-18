'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { attendanceApi, Attendance, AttendanceSummary } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogIn, LogOut, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';

export default function AttendancePage() {
  const { toast } = useToast();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState<Attendance | null>(null);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadAttendance(true);
    loadSummary();

    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadAttendance = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const currentDate = new Date();
      const res = await attendanceApi.getMyAttendance({
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
      });

      if (res.data) {
        setAttendance(res.data);

        // Find today's record
        const today = currentDate.toISOString().split('T')[0];
        const todayAtt = res.data.find((att: Attendance) =>
          att.date.split('T')[0] === today
        );
        setTodayRecord(todayAtt || null);
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to load attendance',
        variant: 'destructive',
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const currentDate = new Date();
      const res = await attendanceApi.getAttendanceSummary({
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
      });
      if (res.data) setSummary(res.data);
    } catch (err) {
      console.error('Failed to load summary', err);
    }
  };

  const handleClockIn = async () => {
    setClockingIn(true);

    try {
      const res = await attendanceApi.clockIn();
      // Immediately update todayRecord with the response
      if (res.data) {
        setTodayRecord(res.data);
      }
      toast({
        title: 'Success',
        description: 'Clocked in successfully!',
      });
      // Refresh attendance list and summary
      loadAttendance();
      loadSummary();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to clock in',
        variant: 'destructive',
      });
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    setClockingOut(true);

    try {
      const res = await attendanceApi.clockOut();
      // Immediately update todayRecord with the response
      if (res.data) {
        setTodayRecord(res.data);
      }
      toast({
        title: 'Success',
        description: 'Clocked out successfully!',
      });
      // Refresh attendance list and summary
      loadAttendance();
      loadSummary();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to clock out',
        variant: 'destructive',
      });
    } finally {
      setClockingOut(false);
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
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
      PRESENT: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      ABSENT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      HALF_DAY: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      LATE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      ON_LEAVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      HOLIDAY: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      WEEKEND: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  return (
    <DashboardLayout title="Attendance">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight dark:text-white">Attendance</h1>
            <p className="text-muted-foreground dark:text-gray-400">
              Track your attendance and working hours
            </p>
          </div>
        </div>
        {/* Clock In/Out Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today&apos;s Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Current Time */}
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Time</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {currentTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {currentTime.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {/* Clock In Time */}
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Clock In</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {todayRecord?.clockIn ? formatTime(todayRecord.clockIn) : '--:--'}
                </p>
                {!todayRecord?.clockIn ? (
                  <Button onClick={handleClockIn} className="mt-4" size="lg" disabled={clockingIn}>
                    {clockingIn ? (
                      <Spinner size="sm" className="mr-2" />
                    ) : (
                      <LogIn className="h-4 w-4 mr-2" />
                    )}
                    {clockingIn ? 'Clocking In...' : 'Clock In'}
                  </Button>
                ) : (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-4">✓ Clocked In</p>
                )}
              </div>

              {/* Clock Out Time */}
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Clock Out</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {todayRecord?.clockOut ? formatTime(todayRecord.clockOut) : '--:--'}
                </p>
                {todayRecord?.clockIn && !todayRecord?.clockOut ? (
                  <Button onClick={handleClockOut} className="mt-4" size="lg" variant="destructive" disabled={clockingOut}>
                    {clockingOut ? (
                      <Spinner size="sm" className="mr-2" />
                    ) : (
                      <LogOut className="h-4 w-4 mr-2" />
                    )}
                    {clockingOut ? 'Clocking Out...' : 'Clock Out'}
                  </Button>
                ) : todayRecord?.clockOut ? (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-4">✓ Clocked Out</p>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-4">Clock in first</p>
                )}
              </div>
            </div>

            {/* Today's Total Hours */}
            {todayRecord?.totalHours && (
              <div className="mt-6 text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Working Hours Today</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {todayRecord.totalHours.toFixed(2)} hours
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Present</p>
                  <p className="text-2xl font-bold dark:text-white">{summary.present}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Absent</p>
                  <p className="text-2xl font-bold dark:text-white">{summary.absent}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">On Leave</p>
                  <p className="text-2xl font-bold dark:text-white">{summary.onLeave}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Total Hours</p>
                  <p className="text-2xl font-bold dark:text-white">{summary.totalHours}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Attendance History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              This Month&apos;s Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop Table */}
            <div className="overflow-x-auto">
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : attendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground dark:text-gray-400">
                        No attendance records for this month
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{formatDate(record.date)}</TableCell>
                        <TableCell>{formatTime(record.clockIn)}</TableCell>
                        <TableCell>{formatTime(record.clockOut)}</TableCell>
                        <TableCell>
                          {record.totalHours ? `${record.totalHours.toFixed(2)}h` : '-'}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded ${getStatusColor(record.status)}`}>
                            {record.status.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground dark:text-gray-400">
                          {record.remarks || '-'}
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
                <div className="text-center py-8">Loading...</div>
              ) : attendance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground dark:text-gray-400">
                  No attendance records for this month
                </div>
              ) : (
                attendance.map((record) => (
                  <Card key={record.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold dark:text-white">{formatDate(record.date)}</h3>
                            <span className={`inline-block mt-1 text-xs px-2 py-1 rounded ${getStatusColor(record.status)}`}>
                              {record.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground dark:text-gray-400">Total Hours</p>
                            <p className="font-semibold dark:text-white">
                              {record.totalHours ? `${record.totalHours.toFixed(2)}h` : '-'}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t dark:border-gray-700">
                          <div>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">Clock In</p>
                            <p className="font-medium dark:text-white">{formatTime(record.clockIn)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">Clock Out</p>
                            <p className="font-medium dark:text-white">{formatTime(record.clockOut)}</p>
                          </div>
                        </div>
                        {record.remarks && (
                          <div className="pt-2 border-t dark:border-gray-700">
                            <p className="text-sm text-muted-foreground dark:text-gray-400">Remarks</p>
                            <p className="text-sm dark:text-white">{record.remarks}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
