'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import {
  reportsApi,
  tenantApi,
  HeadcountReportData,
  AttendanceReportData,
  LeaveReportData,
  PayrollReportData,
  TurnoverReportData,
} from '@/lib/api';
import {
  Users,
  Clock,
  Calendar,
  IndianRupee,
  TrendingUp,
  Download,
  BarChart3,
  PieChart,
  FileText,
  RefreshCw,
  Building2,
  Briefcase,
  MapPin,
  UserCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

type ReportType = 'headcount' | 'attendance' | 'leave' | 'payroll' | 'turnover';

interface Department {
  id: number;
  name: string;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<ReportType>('headcount');
  const [departments, setDepartments] = useState<Department[]>([]);

  // Report data
  const [headcountData, setHeadcountData] = useState<HeadcountReportData | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceReportData | null>(null);
  const [leaveData, setLeaveData] = useState<LeaveReportData | null>(null);
  const [payrollData, setPayrollData] = useState<PayrollReportData | null>(null);
  const [turnoverData, setTurnoverData] = useState<TurnoverReportData | null>(null);

  // Filters
  const [headcountGroupBy, setHeadcountGroupBy] = useState<'department' | 'designation' | 'location' | 'role' | 'gender'>('department');
  const [attendanceReportType, setAttendanceReportType] = useState<'summary' | 'daily' | 'monthly'>('summary');
  const [leaveGroupBy, setLeaveGroupBy] = useState<'employee' | 'leaveType' | 'department' | 'month'>('leaveType');
  const [payrollReportType, setPayrollReportType] = useState<'summary' | 'distribution' | 'taxSummary'>('summary');

  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    loadDepartments();
    loadReport(activeReport);
  }, []);

  useEffect(() => {
    loadReport(activeReport);
  }, [activeReport, headcountGroupBy, attendanceReportType, leaveGroupBy, payrollReportType, startDate, endDate, selectedDepartment, selectedMonth, selectedYear]);

  const loadDepartments = async () => {
    try {
      const response = await tenantApi.getDepartments();
      if (response.data) {
        setDepartments(response.data.map((d: any) => ({ id: d.id, name: d.name })));
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const loadReport = async (reportType: ReportType) => {
    setLoading(true);
    try {
      const departmentId = selectedDepartment !== 'all' ? parseInt(selectedDepartment) : undefined;

      switch (reportType) {
        case 'headcount':
          const headcount = await reportsApi.getHeadcountReport({ groupBy: headcountGroupBy });
          setHeadcountData(headcount.data || null);
          break;

        case 'attendance':
          const attendance = await reportsApi.getAttendanceReport({
            startDate,
            endDate,
            reportType: attendanceReportType,
            departmentId,
          });
          setAttendanceData(attendance.data || null);
          break;

        case 'leave':
          const leave = await reportsApi.getLeaveReport({
            startDate,
            endDate,
            groupBy: leaveGroupBy,
            departmentId,
          });
          setLeaveData(leave.data || null);
          break;

        case 'payroll':
          const payroll = await reportsApi.getPayrollReport({
            month: selectedMonth,
            year: selectedYear,
            reportType: payrollReportType,
            departmentId,
          });
          setPayrollData(payroll.data || null);
          break;

        case 'turnover':
          const turnover = await reportsApi.getTurnoverReport({
            startDate,
            endDate,
            departmentId,
          });
          setTurnoverData(turnover.data || null);
          break;
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const reportCards = [
    {
      id: 'headcount' as ReportType,
      name: 'Headcount',
      description: 'Employee distribution',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      id: 'attendance' as ReportType,
      name: 'Attendance',
      description: 'Attendance summary',
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      id: 'leave' as ReportType,
      name: 'Leave',
      description: 'Leave utilization',
      icon: Calendar,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      id: 'payroll' as ReportType,
      name: 'Payroll',
      description: 'Salary & deductions',
      icon: IndianRupee,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      id: 'turnover' as ReportType,
      name: 'Turnover',
      description: 'Retention analysis',
      icon: TrendingUp,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  const renderHeadcountReport = () => {
    if (!headcountData) return null;

    const chartData = headcountData.breakdown.map((item) => ({
      name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
      fullName: item.name,
      count: item.count,
      activeCount: item.activeCount,
    }));

    const genderData = [
      { name: 'Male', value: headcountData.summary.maleCount },
      { name: 'Female', value: headcountData.summary.femaleCount },
      { name: 'Other', value: headcountData.summary.otherGenderCount },
    ].filter(d => d.value > 0);

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold dark:text-white">{headcountData.summary.totalEmployees}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Employees</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{headcountData.summary.activeEmployees}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{headcountData.summary.inactiveEmployees}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Inactive</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{headcountData.breakdown.length}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{headcountGroupBy}s</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribution by {headcountGroupBy}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart - Gender Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gender Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Detailed Breakdown</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(headcountData.breakdown, 'headcount_report')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium dark:text-gray-200">Name</th>
                    <th className="text-left py-3 px-4 font-medium dark:text-gray-200">Code</th>
                    <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Total</th>
                    <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {headcountData.breakdown.map((item, index) => (
                    <tr key={index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4 dark:text-white">{item.name}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{item.code}</td>
                      <td className="py-3 px-4 text-right font-medium dark:text-white">{item.count}</td>
                      <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">{item.activeCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAttendanceReport = () => {
    if (!attendanceData) return null;

    if (attendanceReportType === 'summary' && attendanceData.employees) {
      return (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{attendanceData.summary?.totalEmployees || 0}</div>
                <p className="text-sm text-gray-500">Total Employees</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{attendanceData.summary?.avgAttendanceRate || 0}%</div>
                <p className="text-sm text-gray-500">Avg Attendance Rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-amber-600">{attendanceData.summary?.totalLateArrivals || 0}</div>
                <p className="text-sm text-gray-500">Late Arrivals</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{attendanceData.summary?.workingDays || 0}</div>
                <p className="text-sm text-gray-500">Working Days</p>
              </CardContent>
            </Card>
          </div>

          {/* Employee Attendance Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Employee Attendance Summary</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(
                  attendanceData.employees!.map(e => ({
                    Name: e.employee.name,
                    Department: e.employee.department,
                    'Present Days': e.presentDays,
                    'Absent Days': e.absentDays,
                    'Late Days': e.lateDays,
                    'Attendance %': e.attendancePercentage,
                  })),
                  'attendance_summary'
                )}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium dark:text-gray-200">Employee</th>
                      <th className="text-left py-3 px-4 font-medium dark:text-gray-200">Department</th>
                      <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Present</th>
                      <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Absent</th>
                      <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Late</th>
                      <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.employees.map((item, index) => (
                      <tr key={index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4">
                          <div className="font-medium dark:text-white">{item.employee.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{item.employee.employeeCode}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{item.employee.department}</td>
                        <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">{item.presentDays}</td>
                        <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">{item.absentDays}</td>
                        <td className="py-3 px-4 text-right text-amber-600 dark:text-amber-400">{item.lateDays}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-medium ${
                            item.attendancePercentage >= 90 ? 'text-green-600 dark:text-green-400' :
                            item.attendancePercentage >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {item.attendancePercentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (attendanceReportType === 'daily' && attendanceData.dailyData) {
      const chartData = attendanceData.dailyData.filter(d => !d.isWeekend);

      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Daily Attendance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="present" stackId="1" stroke="#10b981" fill="#10b981" name="Present" />
                  <Area type="monotone" dataKey="halfDay" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Half Day" />
                  <Area type="monotone" dataKey="absent" stackId="1" stroke="#ef4444" fill="#ef4444" name="Absent" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Daily Data</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(attendanceData.dailyData!, 'attendance_daily')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-gray-900">
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium dark:text-gray-200">Date</th>
                      <th className="text-left py-3 px-4 font-medium dark:text-gray-200">Day</th>
                      <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Present</th>
                      <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Absent</th>
                      <th className="text-right py-3 px-4 font-medium dark:text-gray-200">On Leave</th>
                      <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.dailyData.map((item, index) => (
                      <tr key={index} className={`border-b dark:border-gray-700 ${item.isWeekend ? 'bg-gray-50 dark:bg-gray-800 text-gray-400' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        <td className="py-3 px-4 dark:text-gray-200">{new Date(item.date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 dark:text-gray-200">{item.dayOfWeek}</td>
                        <td className="py-3 px-4 text-right dark:text-gray-200">{item.present}</td>
                        <td className="py-3 px-4 text-right dark:text-gray-200">{item.absent}</td>
                        <td className="py-3 px-4 text-right dark:text-gray-200">{item.onLeave}</td>
                        <td className="py-3 px-4 text-right dark:text-gray-200">{item.attendanceRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (attendanceReportType === 'monthly' && attendanceData.monthlyData) {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Attendance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attendanceData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthName" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" fill="#10b981" name="Present" />
                  <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                  <Bar dataKey="onLeave" fill="#3b82f6" name="On Leave" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      );
    }

    return <p className="text-gray-500 dark:text-gray-400">No data available</p>;
  };

  const renderLeaveReport = () => {
    if (!leaveData) return null;

    const chartData = leaveData.breakdown.slice(0, 10).map((item) => ({
      name: item.employee?.name || item.leaveType?.name || item.department?.name || item.monthName || 'Unknown',
      totalDays: item.totalDays,
      approved: item.approved,
      pending: item.pending,
      rejected: item.rejected,
    }));

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold dark:text-white">{leaveData.summary.totalRequests}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{leaveData.summary.totalDays}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Days</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{leaveData.summary.approved}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{leaveData.summary.pending}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{leaveData.summary.rejected}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Leave by {leaveGroupBy}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="approved" fill="#10b981" name="Approved" />
                  <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                  <Bar dataKey="rejected" fill="#ef4444" name="Rejected" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Leave Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={leaveData.leaveTypes.map((lt, i) => ({
                      name: lt.name,
                      value: leaveData.breakdown.reduce((sum, b) => {
                        if (leaveGroupBy === 'leaveType' && b.leaveType?.id === lt.id) {
                          return sum + b.totalDays;
                        }
                        return sum;
                      }, 0) || 1,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => (percent || 0) > 0.05 ? `${name}` : ''}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {leaveData.leaveTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Leave Breakdown</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(
                leaveData.breakdown.map(b => ({
                  Name: b.employee?.name || b.leaveType?.name || b.department?.name || b.monthName,
                  'Total Requests': b.totalRequests,
                  'Total Days': b.totalDays,
                  Approved: b.approved,
                  Pending: b.pending,
                  Rejected: b.rejected,
                })),
                'leave_report'
              )}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium dark:text-gray-200 capitalize">{leaveGroupBy}</th>
                    <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Requests</th>
                    <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Days</th>
                    <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Approved</th>
                    <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Pending</th>
                    <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Rejected</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveData.breakdown.map((item, index) => (
                    <tr key={index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4 dark:text-white">
                        {item.employee?.name || item.leaveType?.name || item.department?.name || item.monthName}
                      </td>
                      <td className="py-3 px-4 text-right dark:text-gray-200">{item.totalRequests}</td>
                      <td className="py-3 px-4 text-right font-medium dark:text-white">{item.totalDays}</td>
                      <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">{item.approved}</td>
                      <td className="py-3 px-4 text-right text-amber-600 dark:text-amber-400">{item.pending}</td>
                      <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">{item.rejected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPayrollReport = () => {
    if (!payrollData) return null;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold dark:text-white">{payrollData.summary.totalPayslips}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Payslips</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(payrollData.summary.totalGrossSalary)}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Gross</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(payrollData.summary.totalDeductions)}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Deductions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(payrollData.summary.totalNetSalary)}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Net Salary</p>
            </CardContent>
          </Card>
        </div>

        {payrollReportType === 'summary' && payrollData.departmentBreakdown && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Department-wise Payroll</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={payrollData.departmentBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department.name" />
                    <YAxis tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalGross" fill="#10b981" name="Gross Salary" />
                    <Bar dataKey="totalDeductions" fill="#ef4444" name="Deductions" />
                    <Bar dataKey="totalNet" fill="#3b82f6" name="Net Salary" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {payrollData.payslips && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Payslip Details</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToCSV(
                      payrollData.payslips!.map(p => ({
                        Employee: p.employee.name,
                        Department: p.employee.department,
                        Basic: p.basicSalary,
                        Gross: p.grossSalary,
                        Deductions: p.totalDeductions,
                        Net: p.netSalary,
                        Status: p.status,
                      })),
                      'payroll_details'
                    )}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white dark:bg-gray-900">
                        <tr className="border-b dark:border-gray-700">
                          <th className="text-left py-3 px-4 font-medium dark:text-gray-200">Employee</th>
                          <th className="text-left py-3 px-4 font-medium dark:text-gray-200">Department</th>
                          <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Gross</th>
                          <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Deductions</th>
                          <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Net Salary</th>
                          <th className="text-center py-3 px-4 font-medium dark:text-gray-200">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payrollData.payslips.map((payslip) => (
                          <tr key={payslip.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="py-3 px-4">
                              <div className="font-medium dark:text-white">{payslip.employee.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{payslip.employee.employeeCode}</div>
                            </td>
                            <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{payslip.employee.department}</td>
                            <td className="py-3 px-4 text-right dark:text-gray-200">{formatCurrency(payslip.grossSalary)}</td>
                            <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">{formatCurrency(payslip.totalDeductions)}</td>
                            <td className="py-3 px-4 text-right font-medium dark:text-white">{formatCurrency(payslip.netSalary)}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-1 rounded text-xs ${
                                payslip.status === 'PAID' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                                payslip.status === 'PROCESSED' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' :
                                'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                              }`}>
                                {payslip.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {payrollReportType === 'distribution' && payrollData.salaryDistribution && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Salary Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={payrollData.salaryDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" name="Employees" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {payrollData.componentBreakdown && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Component Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={payrollData.componentBreakdown.slice(0, 8)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="totalAmount"
                        nameKey="name"
                      >
                        {payrollData.componentBreakdown.slice(0, 8).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {payrollReportType === 'taxSummary' && payrollData.taxBreakdown && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tax & Deductions Summary</CardTitle>
              <CardDescription>Total Tax Deductions: {formatCurrency(payrollData.totalTaxDeductions || 0)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Deduction Type</th>
                      <th className="text-right py-3 px-4 font-medium">Employees</th>
                      <th className="text-right py-3 px-4 font-medium">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollData.taxBreakdown.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4 font-medium">{item.name}</td>
                        <td className="py-3 px-4 text-right">{item.employeeCount}</td>
                        <td className="py-3 px-4 text-right text-red-600">{formatCurrency(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderTurnoverReport = () => {
    if (!turnoverData) return null;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold dark:text-white">{turnoverData.summary.currentHeadcount}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Current Headcount</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">+{turnoverData.summary.totalJoins}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">New Joins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">-{turnoverData.summary.totalExits}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Exits</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{turnoverData.summary.retentionRate}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Retention Rate</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold dark:text-white">{turnoverData.summary.turnoverRate}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Turnover Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold dark:text-white">{turnoverData.summary.avgTenureYears} yrs</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Tenure</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className={`text-2xl font-bold ${turnoverData.summary.netChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {turnoverData.summary.netChange >= 0 ? '+' : ''}{turnoverData.summary.netChange}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Net Change</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Headcount Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={turnoverData.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="headcount" stroke="#3b82f6" strokeWidth={2} name="Headcount" />
                <Line type="monotone" dataKey="joins" stroke="#10b981" strokeWidth={2} name="Joins" />
                <Line type="monotone" dataKey="exits" stroke="#ef4444" strokeWidth={2} name="Exits" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tenure Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tenure Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={turnoverData.tenureDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" name="Employees" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Department Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Department Turnover</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={turnoverData.departmentBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department.name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="joins" fill="#10b981" name="Joins" />
                  <Bar dataKey="exits" fill="#ef4444" name="Exits" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-green-600">Recent Joins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {turnoverData.recentJoins.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No recent joins</p>
                ) : (
                  turnoverData.recentJoins.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0">
                      <div>
                        <p className="font-medium dark:text-white">{emp.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{emp.department}</p>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(emp.joiningDate).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-red-600">Recent Exits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {turnoverData.recentExits.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No recent exits</p>
                ) : (
                  turnoverData.recentExits.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0">
                      <div>
                        <p className="font-medium dark:text-white">{emp.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{emp.department}</p>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(emp.exitDate).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderFilters = () => {
    switch (activeReport) {
      case 'headcount':
        return (
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Group By</Label>
              <Select value={headcountGroupBy} onValueChange={(v: any) => setHeadcountGroupBy(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="designation">Designation</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="gender">Gender</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'attendance':
        return (
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={attendanceReportType} onValueChange={(v: any) => setAttendanceReportType(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'leave':
        return (
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Group By</Label>
              <Select value={leaveGroupBy} onValueChange={(v: any) => setLeaveGroupBy(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="leaveType">Leave Type</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
          </div>
        );

      case 'payroll':
        return (
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={payrollReportType} onValueChange={(v: any) => setPayrollReportType(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="distribution">Distribution</SelectItem>
                  <SelectItem value="taxSummary">Tax Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {new Date(2000, i).toLocaleDateString('en-US', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <SelectItem key={year} value={String(year)}>{year}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'turnover':
        return (
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderActiveReport = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      );
    }

    switch (activeReport) {
      case 'headcount':
        return renderHeadcountReport();
      case 'attendance':
        return renderAttendanceReport();
      case 'leave':
        return renderLeaveReport();
      case 'payroll':
        return renderPayrollReport();
      case 'turnover':
        return renderTurnoverReport();
      default:
        return null;
    }
  };

  return (
    <DashboardLayout title="Reports">
      <div className="space-y-6">
        {/* Report Type Selection */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {reportCards.map((report) => (
            <Card
              key={report.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                activeReport === report.id ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''
              }`}
              onClick={() => setActiveReport(report.id)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${report.bgColor}`}>
                    <report.icon className={`h-5 w-5 ${report.color}`} />
                  </div>
                  <div>
                    <p className="font-medium dark:text-white">{report.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{report.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              {renderFilters()}
              <Button
                variant="outline"
                onClick={() => loadReport(activeReport)}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Content */}
        {renderActiveReport()}
      </div>
    </DashboardLayout>
  );
}
