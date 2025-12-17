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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Home, Users, Calendar, FileText, Settings, LogOut, Clock, Menu, History } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const getAvatarUrl = () => {
    if (!user?.avatar) return null;
    if (user.avatar.startsWith('http')) return user.avatar;
    return `${API_BASE}/${user.avatar}`;
  };

  const getInitials = () => {
    if (!user) return '?';
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || '?';
  };

  const allMenuItems = [
    { icon: Home, label: 'Dashboard', href: `/${tenantSlug}/dashboard` },
    { icon: Users, label: 'Employees', href: `/${tenantSlug}/employees` },
    { icon: Clock, label: 'Attendance', href: `/${tenantSlug}/attendance` },
    { icon: FileText, label: 'Leave', href: `/${tenantSlug}/leave` },
    { icon: History, label: 'Audit Logs', href: `/${tenantSlug}/audit-logs`, roles: ['ADMIN', 'HR'] },
    { icon: Settings, label: 'Settings', href: `/${tenantSlug}/settings` },
  ];

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => {
    if (!item.roles) return true; // Show to all if no roles specified
    return user?.role?.code && item.roles.includes(user.role.code);
  });

  const MobileNav = () => (
    <nav className="flex flex-col gap-2 mt-4">
      {menuItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <a
            key={item.label}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-100 text-blue-900'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </a>
        );
      })}
      <button
        onClick={() => {
          handleLogout();
          setMobileMenuOpen(false);
        }}
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors mt-4"
      >
        <LogOut className="h-5 w-5" />
        <span className="font-medium">Logout</span>
      </button>
    </nav>
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Desktop Sidebar */}
        <Sidebar className="hidden md:flex">
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
          <header className="bg-white border-b px-4 md:px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                {/* Mobile Menu Button */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild className="md:hidden">
                    <Button variant="ghost" size="icon">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72">
                    <SheetHeader>
                      <SheetTitle>{tenantInfo?.name || 'HRMS'}</SheetTitle>
                      <SheetDescription>Navigation menu</SheetDescription>
                    </SheetHeader>
                    <MobileNav />
                  </SheetContent>
                </Sheet>
                <h1 className="text-lg md:text-xl font-semibold">{title}</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 hidden sm:inline">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {user?.role?.name}
                  </span>
                </div>
                {/* User Avatar */}
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {getAvatarUrl() ? (
                    <img
                      src={getAvatarUrl()!}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-500">
                      {getInitials()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </header>

          <main className="p-4 md:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
