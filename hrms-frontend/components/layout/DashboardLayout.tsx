'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { TenantUser } from '@/lib/api';
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
import { Home, Users, Calendar, FileText, Settings, LogOut, Clock } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const tenantSlug = params.tenant as string;

  const [user, setUser] = useState<TenantUser | null>(null);
  const [tenantInfo, setTenantInfo] = useState<{ name: string; logo?: string } | null>(null);

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
  }, [router, tenantSlug]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    router.push(`/${tenantSlug}/login`);
  };

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: `/${tenantSlug}/dashboard` },
    { icon: Users, label: 'Employees', href: `/${tenantSlug}/employees` },
    { icon: Clock, label: 'Attendance', href: `/${tenantSlug}/attendance` },
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
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <a href={item.href} className="flex items-center gap-3 px-4 py-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
              <h1 className="text-xl font-semibold">{title}</h1>
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

          <main className="p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
