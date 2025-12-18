'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { analyticsApi, DashboardAnalytics } from '@/lib/api';
import {
  Users,
  UserCheck,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  Timer,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const GENDER_COLORS = { male: '#3b82f6', female: '#ec4899', other: '#8b5cf6', notSpecified: '#9ca3af' };

export default function AnalyticsDashboard() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsApi.getDashboardAnalytics();
      if (response.data) {
        setAnalytics(response.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  const formatPercent = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <DashboardLayout title="Analytics">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !analytics) {
    return (
      <DashboardLayout title="Analytics">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <div className="text-gray-600 dark:text-gray-400">{error || 'No analytics data available'}</div>
        </div>
      </DashboardLayout>
    );
  }

  const { quickStats, genderDistribution, departmentDistribution, tenureDistribution, employeeTrend, attendanceTrend, leaveUtilization, leaveTrend, turnoverTrend, comparison } = analytics;

  // Prepare gender chart data
  const genderChartData = [
    { name: 'Male', value: genderDistribution.male, color: GENDER_COLORS.male },
    { name: 'Female', value: genderDistribution.female, color: GENDER_COLORS.female },
    { name: 'Other', value: genderDistribution.other, color: GENDER_COLORS.other },
    { name: 'Not Specified', value: genderDistribution.notSpecified, color: GENDER_COLORS.notSpecified },
  ].filter(item => item.value > 0);

  // Prepare tenure chart data
  const tenureChartData = [
    { name: '< 1 Year', value: tenureDistribution.lessThan1Year },
    { name: '1-3 Years', value: tenureDistribution.oneToThreeYears },
    { name: '3-5 Years', value: tenureDistribution.threeToFiveYears },
    { name: '5-10 Years', value: tenureDistribution.fiveToTenYears },
    { name: '10+ Years', value: tenureDistribution.moreThanTenYears },
  ];

  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-6">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Employees</p>
                  <p className="text-2xl font-bold dark:text-white">{quickStats.totalEmployees}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(comparison.employees.change)}
                    <span className={`text-xs ${getTrendColor(comparison.employees.change)}`}>
                      {comparison.employees.change > 0 ? '+' : ''}{comparison.employees.change} MoM
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Present Today</p>
                  <p className="text-2xl font-bold dark:text-white">{quickStats.todayPresent}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    of {quickStats.totalEmployees} employees
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Attendance Rate</p>
                  <p className="text-2xl font-bold dark:text-white">{quickStats.attendanceRate}%</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(comparison.attendance.change)}
                    <span className={`text-xs ${getTrendColor(comparison.attendance.change)}`}>
                      {formatPercent(comparison.attendance.change)} MoM
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                  <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pending Leaves</p>
                  <p className="text-2xl font-bold dark:text-white">{quickStats.pendingLeaveRequests}</p>
                  <p className="text-xs text-gray-400 mt-1">requests awaiting</p>
                </div>
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg Tenure</p>
                  <p className="text-2xl font-bold dark:text-white">{quickStats.averageTenureYears}</p>
                  <p className="text-xs text-gray-400 mt-1">years</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Timer className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Turnover Rate</p>
                  <p className="text-2xl font-bold dark:text-white">{quickStats.turnoverRate}%</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(-comparison.turnover.change)}
                    <span className={`text-xs ${getTrendColor(-comparison.turnover.change)}`}>
                      {comparison.turnover.change > 0 ? '+' : ''}{comparison.turnover.change}% YoY
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Employee Headcount Trend
            </CardTitle>
            <CardDescription>Employee count over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={employeeTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Employees"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Department Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="count" name="Employees" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gender Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Gender Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {genderChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Attendance Rate Trend
            </CardTitle>
            <CardDescription>Monthly attendance rate over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    name="Attendance Rate"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Leave Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leave Utilization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Leave Utilization
              </CardTitle>
              <CardDescription>Leave balance usage by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaveUtilization.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">No leave data available</p>
                ) : (
                  leaveUtilization.map((leave, index) => (
                    <div key={leave.code} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium dark:text-white">{leave.name}</span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {leave.used} / {leave.allocated} days ({leave.utilizationRate.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, leave.utilizationRate)}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Used: {leave.used}</span>
                        <span>Pending: {leave.pending}</span>
                        <span>Available: {leave.available}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Leave Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Leave Trend
              </CardTitle>
              <CardDescription>Leave days taken per month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leaveTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="days" name="Leave Days" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tenure Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Tenure Distribution
            </CardTitle>
            <CardDescription>Employee distribution by years of service</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tenureChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Employees" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                    {tenureChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Turnover Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Employee Turnover
            </CardTitle>
            <CardDescription>Joins, exits, and net change over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={turnoverTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="joins" name="Joins" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="exits" name="Exits" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="netChange"
                    name="Net Change"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Employee Change (MoM)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold dark:text-white">
                    {comparison.employees.current}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    vs {comparison.employees.lastMonth} last month
                  </p>
                </div>
                <div className={`flex items-center gap-1 text-lg font-semibold ${getTrendColor(comparison.employees.change)}`}>
                  {getTrendIcon(comparison.employees.change)}
                  {comparison.employees.change > 0 ? '+' : ''}{comparison.employees.change}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Attendance Change (MoM)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold dark:text-white">
                    {comparison.attendance.current}%
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    vs {comparison.attendance.lastMonth}% last month
                  </p>
                </div>
                <div className={`flex items-center gap-1 text-lg font-semibold ${getTrendColor(comparison.attendance.change)}`}>
                  {getTrendIcon(comparison.attendance.change)}
                  {formatPercent(comparison.attendance.change)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Turnover Rate (YoY)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold dark:text-white">
                    {comparison.turnover.currentYear}%
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    vs {comparison.turnover.lastYear}% last year
                  </p>
                </div>
                <div className={`flex items-center gap-1 text-lg font-semibold ${getTrendColor(-comparison.turnover.change)}`}>
                  {getTrendIcon(-comparison.turnover.change)}
                  {comparison.turnover.change > 0 ? '+' : ''}{comparison.turnover.change}%
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
