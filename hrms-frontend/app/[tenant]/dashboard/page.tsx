'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { tenantApi, TenantUser } from '@/lib/api';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Home, Users, Calendar, FileText, Settings, LogOut } from 'lucide-react';

export default function TenantDashboard() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [user, setUser] = useState<TenantUser | null>(null);
  const [tenantInfo, setTenantInfo] = useState<{ name: string; logo?: string } | null>(null);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, departments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(`/${tenantSlug}/login`);
      return;
    }

    const storedUser = localStorage.getItem('user');
    const storedTenant = localStorage.getItem('tenant');
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedTenant) setTenantInfo(JSON.parse(storedTenant));

    loadDashboard();
  }, [router, tenantSlug]);

  const loadDashboard = async () => {
    try {
      const res = await tenantApi.getDashboard();
      if (res.data) setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    router.push(`/${tenantSlug}/login`);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: `/${tenantSlug}/dashboard` },
    { icon: Users, label: 'Employees', href: `/${tenantSlug}/employees` },
    { icon: Calendar, label: 'Attendance', href: `/${tenantSlug}/attendance` },
    { icon: FileText, label: 'Leave', href: `/${tenantSlug}/leave` },
    { icon: Settings, label: 'Settings', href: `/${tenantSlug}/settings` },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="p-4 border-b">
            <h2 className="font-bold text-lg">{tenantInfo?.name || 'HRMS'}</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild>
                    <a href={item.href} className="flex items-center gap-3 px-4 py-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="flex-1">
          <header className="bg-white border-b px-6 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-semibold">Dashboard</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {user?.role?.name}
                </span>
              </div>
            </div>
          </header>

          <main className="p-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard title="Total Employees" value={stats.totalUsers} />
              <StatCard title="Active Employees" value={stats.activeUsers} />
              <StatCard title="Departments" value={stats.departments} />
            </div>

            {/* Quick Actions based on role */}
            {(user?.role?.code === 'ADMIN' || user?.role?.code === 'HR') && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold mb-4">Quick Actions</h3>
                <div className="flex gap-4 flex-wrap">
                  <Button variant="outline">Add Employee</Button>
                  <Button variant="outline">Create Department</Button>
                  <Button variant="outline">View Reports</Button>
                </div>
              </div>
            )}

            {user?.role?.code === 'EMPLOYEE' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold mb-4">Self Service</h3>
                <div className="flex gap-4 flex-wrap">
                  <Button variant="outline">Apply Leave</Button>
                  <Button variant="outline">View Attendance</Button>
                  <Button variant="outline">My Profile</Button>
                </div>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
