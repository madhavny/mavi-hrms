'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { tenantApi, TenantUser, celebrationsApi, CelebrationsResponse } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Users, UserCheck, Building2, Cake, Award, PartyPopper } from 'lucide-react';

export default function TenantDashboard() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [user, setUser] = useState<TenantUser | null>(null);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, departments: 0 });
  const [celebrations, setCelebrations] = useState<CelebrationsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(`/${tenantSlug}/login`);
      return;
    }

    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));

    loadDashboard();
  }, [router, tenantSlug]);

  const loadDashboard = async () => {
    try {
      const [dashRes, celebRes] = await Promise.all([
        tenantApi.getDashboard(),
        celebrationsApi.getCelebrations(7),
      ]);
      if (dashRes.data) setStats(dashRes.data);
      if (celebRes.data) setCelebrations(celebRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 dark:text-white">Loading...</div>;
  }

  return (
    <DashboardLayout title="Dashboard">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <StatCard title="Total Employees" value={stats.totalUsers} icon={Users} iconColor="text-blue-600 dark:text-blue-400" iconBg="bg-blue-100" iconBgDark="dark:bg-blue-900/30" />
        <StatCard title="Active Employees" value={stats.activeUsers} icon={UserCheck} iconColor="text-green-600 dark:text-green-400" iconBg="bg-green-100" iconBgDark="dark:bg-green-900/30" />
        <StatCard title="Departments" value={stats.departments} icon={Building2} iconColor="text-purple-600 dark:text-purple-400" iconBg="bg-purple-100" iconBgDark="dark:bg-purple-900/30" />
      </div>

      {/* Quick Actions based on role */}
      {(user?.role?.code === 'ADMIN' || user?.role?.code === 'HR') && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6">
          <h3 className="font-semibold mb-4 dark:text-white">Quick Actions</h3>
          <div className="flex gap-4 flex-wrap">
            <Button variant="outline">Add Employee</Button>
            <Button variant="outline">Create Department</Button>
            <Button variant="outline">View Reports</Button>
          </div>
        </div>
      )}

      {user?.role?.code === 'EMPLOYEE' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6">
          <h3 className="font-semibold mb-4 dark:text-white">Self Service</h3>
          <div className="flex gap-4 flex-wrap">
            <Button variant="outline">Apply Leave</Button>
            <Button variant="outline">View Attendance</Button>
            <Button variant="outline">My Profile</Button>
          </div>
        </div>
      )}

      {/* Celebrations Widget */}
      {celebrations && (celebrations.today.total > 0 || celebrations.upcoming.length > 0) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-yellow-500" />
              Celebrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Today's Celebrations */}
            {celebrations.today.total > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                  <span className="animate-pulse">🎉</span> Today
                </h4>
                <div className="space-y-3">
                  {celebrations.today.birthdays.map((person) => (
                    <div
                      key={`birthday-${person.id}`}
                      className="flex items-center gap-3 p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-100 dark:border-pink-800"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={person.avatar || undefined} />
                        <AvatarFallback className="bg-pink-200 dark:bg-pink-800 text-pink-700 dark:text-pink-200">
                          {person.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{person.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {person.department?.name || 'No department'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
                        <Cake className="h-5 w-5" />
                        <span className="text-sm font-medium">Birthday!</span>
                      </div>
                    </div>
                  ))}
                  {celebrations.today.anniversaries.map((person) => (
                    <div
                      key={`anniversary-${person.id}`}
                      className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={person.avatar || undefined} />
                        <AvatarFallback className="bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-200">
                          {person.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{person.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {person.department?.name || 'No department'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <Award className="h-5 w-5" />
                        <span className="text-sm font-medium">{person.years} Year{person.years > 1 ? 's' : ''}!</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Celebrations */}
            {celebrations.upcoming.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">Upcoming (Next 7 days)</h4>
                <div className="space-y-2">
                  {celebrations.upcoming.slice(0, 5).map((person) => (
                    <div
                      key={`${person.type}-${person.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={person.avatar || undefined} />
                        <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm">
                          {person.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{person.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {person.daysUntil === 1 ? 'Tomorrow' : `In ${person.daysUntil} days`}
                        </p>
                      </div>
                      {person.type === 'birthday' ? (
                        <Cake className="h-4 w-4 text-pink-500" />
                      ) : (
                        <div className="flex items-center gap-1 text-amber-500">
                          <Award className="h-4 w-4" />
                          <span className="text-xs">{person.years}y</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No celebrations message */}
            {celebrations.today.total === 0 && celebrations.upcoming.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No upcoming celebrations this week</p>
            )}
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  iconBgDark?: string;
}

function StatCard({ title, value, icon: Icon, iconColor, iconBg, iconBgDark }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${iconBg} ${iconBgDark || ''}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
