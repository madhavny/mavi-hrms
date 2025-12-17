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
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState<Attendance | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadAttendance();
    loadSummary();

    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadAttendance = async () => {
    try {
      setLoading(true);
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
      setError(err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
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
    setError('');
    setSuccess('');

    try {
      await attendanceApi.clockIn();
      setSuccess('Clocked in successfully!');
      loadAttendance();
    } catch (err: any) {
      setError(err.message || 'Failed to clock in');
    }
  };

  const handleClockOut = async () => {
    setError('');
    setSuccess('');

    try {
      await attendanceApi.clockOut();
      setSuccess('Clocked out successfully!');
      loadAttendance();
    } catch (err: any) {
      setError(err.message || 'Failed to clock out');
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
      PRESENT: 'bg-green-100 text-green-800',
      ABSENT: 'bg-red-100 text-red-800',
      HALF_DAY: 'bg-yellow-100 text-yellow-800',
      LATE: 'bg-orange-100 text-orange-800',
      ON_LEAVE: 'bg-blue-100 text-blue-800',
      HOLIDAY: 'bg-purple-100 text-purple-800',
      WEEKEND: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardLayout title="Attendance">
      <div className="space-y-6">
        {/* Success/Error Messages */}
        {success && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Clock In/Out Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Current Time */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Current Time</p>
                <p className="text-3xl font-bold text-gray-900">
                  {currentTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {currentTime.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {/* Clock In Time */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Clock In</p>
                <p className="text-3xl font-bold text-green-600">
                  {todayRecord?.clockIn ? formatTime(todayRecord.clockIn) : '--:--'}
                </p>
                {!todayRecord?.clockIn ? (
                  <Button onClick={handleClockIn} className="mt-4" size="lg">
                    <LogIn className="h-4 w-4 mr-2" />
                    Clock In
                  </Button>
                ) : (
                  <p className="text-sm text-green-600 mt-4">✓ Clocked In</p>
                )}
              </div>

              {/* Clock Out Time */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Clock Out</p>
                <p className="text-3xl font-bold text-red-600">
                  {todayRecord?.clockOut ? formatTime(todayRecord.clockOut) : '--:--'}
                </p>
                {todayRecord?.clockIn && !todayRecord?.clockOut ? (
                  <Button onClick={handleClockOut} className="mt-4" size="lg" variant="destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Clock Out
                  </Button>
                ) : todayRecord?.clockOut ? (
                  <p className="text-sm text-red-600 mt-4">✓ Clocked Out</p>
                ) : (
                  <p className="text-sm text-gray-400 mt-4">Clock in first</p>
                )}
              </div>
            </div>

            {/* Today's Total Hours */}
            {todayRecord?.totalHours && (
              <div className="mt-6 text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Working Hours Today</p>
                <p className="text-2xl font-bold text-blue-600">
                  {todayRecord.totalHours.toFixed(2)} hours
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Present</p>
                <p className="text-2xl font-bold text-green-600">{summary.present}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Absent</p>
                <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">On Leave</p>
                <p className="text-2xl font-bold text-blue-600">{summary.onLeave}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalHours}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Attendance History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              This Month's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
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
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
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
                      <TableCell className="text-sm text-gray-600">
                        {record.remarks || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
