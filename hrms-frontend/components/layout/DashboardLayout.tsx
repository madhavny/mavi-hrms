'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { TenantUser, notificationsApi, Notification } from '@/lib/api';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Home, Users, Calendar, FileText, Settings, LogOut, Clock, Menu, History, ClipboardCheck, IndianRupee, Wallet, BarChart3, Bell, Check, CheckCheck, Trash2, X, TrendingUp, Target, Star, Timer, Receipt, Briefcase, GraduationCap, Lightbulb, Package, FolderOpen, Gift, Wrench, CalendarDays, Upload } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { CORE_MODULES, DEFAULT_ENABLED_MODULES } from '@/lib/modules';

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
  const [tenantInfo, setTenantInfo] = useState<{ name: string; logo?: string; enabledModules?: string[] } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoadingNotifications(true);
      const response = await notificationsApi.getNotifications({ limit: 10 });
      if (response.success && response.data) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsApi.getUnreadCount();
      if (response.success && response.data) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

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

    // Fetch notifications
    fetchUnreadCount();
  }, [router, tenantSlug, fetchUnreadCount]);

  // Poll for unread count every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch notifications when popover opens
  useEffect(() => {
    if (notificationOpen) {
      fetchNotifications();
    }
  }, [notificationOpen, fetchNotifications]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDeleteNotification = async (id: number) => {
    try {
      await notificationsApi.deleteNotification(id);
      const notification = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'LEAVE_APPROVED':
        return '✅';
      case 'LEAVE_REJECTED':
        return '❌';
      case 'LEAVE_REQUESTED':
        return '📝';
      case 'PAYSLIP_GENERATED':
        return '💰';
      case 'SALARY_REVISED':
        return '📈';
      case 'ANNOUNCEMENT':
        return '📢';
      case 'BIRTHDAY_REMINDER':
        return '🎂';
      case 'ANNIVERSARY_REMINDER':
        return '🎉';
      case 'PASSWORD_CHANGED':
        return '🔐';
      default:
        return '🔔';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

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
    { icon: Home, label: 'Dashboard', href: `/${tenantSlug}/dashboard`, moduleId: 'dashboard' },
    { icon: Users, label: 'Employees', href: `/${tenantSlug}/employees`, moduleId: 'employees' },
    { icon: Clock, label: 'Attendance', href: `/${tenantSlug}/attendance`, moduleId: 'attendance' },
    { icon: FileText, label: 'Leave', href: `/${tenantSlug}/leave`, moduleId: 'leave' },
    { icon: ClipboardCheck, label: 'Leave Approvals', href: `/${tenantSlug}/leave-approvals`, roles: ['ADMIN', 'HR'], moduleId: 'leave-approvals' },
    { icon: Wallet, label: 'Salary Structures', href: `/${tenantSlug}/payroll/salary-structures`, roles: ['ADMIN', 'HR'], moduleId: 'payroll' },
    { icon: IndianRupee, label: 'Payslips', href: `/${tenantSlug}/payroll/payslips`, roles: ['ADMIN', 'HR'], moduleId: 'payroll' },
    { icon: History, label: 'Audit Logs', href: `/${tenantSlug}/audit-logs`, roles: ['ADMIN', 'HR'], moduleId: 'audit-logs' },
    { icon: BarChart3, label: 'Reports', href: `/${tenantSlug}/reports`, roles: ['ADMIN', 'HR'], moduleId: 'reports' },
    { icon: TrendingUp, label: 'Analytics', href: `/${tenantSlug}/analytics`, roles: ['ADMIN', 'HR'], moduleId: 'analytics' },
    { icon: Target, label: 'Goals', href: `/${tenantSlug}/goals`, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], moduleId: 'goals' },
    { icon: Star, label: 'Reviews', href: `/${tenantSlug}/reviews`, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], moduleId: 'reviews' },
    { icon: Timer, label: 'Timesheet', href: `/${tenantSlug}/timesheet`, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], moduleId: 'timesheet' },
    { icon: Receipt, label: 'Expenses', href: `/${tenantSlug}/expenses`, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], moduleId: 'expenses' },
    { icon: Briefcase, label: 'Recruitment', href: `/${tenantSlug}/recruitment`, roles: ['ADMIN', 'HR'], moduleId: 'recruitment' },
    { icon: GraduationCap, label: 'Training', href: `/${tenantSlug}/training`, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], moduleId: 'training' },
    { icon: Lightbulb, label: 'Skills', href: `/${tenantSlug}/skills`, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], moduleId: 'skills' },
    { icon: Package, label: 'Assets', href: `/${tenantSlug}/assets`, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], moduleId: 'assets' },
    { icon: FolderOpen, label: 'Documents', href: `/${tenantSlug}/documents`, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], moduleId: 'documents' },
    { icon: Gift, label: 'Bonuses', href: `/${tenantSlug}/bonuses`, roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'], moduleId: 'bonuses' },
    { icon: Wrench, label: 'Report Builder', href: `/${tenantSlug}/report-builder`, roles: ['ADMIN', 'HR'], moduleId: 'report-builder' },
    { icon: CalendarDays, label: 'Holidays', href: `/${tenantSlug}/settings/holidays`, roles: ['ADMIN', 'HR'], moduleId: 'holidays' },
    { icon: Upload, label: 'Data Import', href: `/${tenantSlug}/settings/data-import`, roles: ['ADMIN'], moduleId: 'settings' },
    { icon: Settings, label: 'Settings', href: `/${tenantSlug}/settings`, moduleId: 'settings' },
  ];

  // Get enabled modules from tenant info (default to all if not set)
  const enabledModules = tenantInfo?.enabledModules?.length
    ? tenantInfo.enabledModules
    : DEFAULT_ENABLED_MODULES;

  // Filter menu items based on user role AND enabled modules
  const menuItems = allMenuItems.filter(item => {
    // Check if module is enabled for this tenant
    if (item.moduleId && !enabledModules.includes(item.moduleId)) {
      return false;
    }

    // Check role permissions
    if (item.roles && (!user?.role?.code || !item.roles.includes(user.role.code))) {
      return false;
    }

    return true;
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
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
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
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-4"
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
          <SidebarContent className="flex-1 overflow-y-auto">
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
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1">
          <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 px-4 md:px-6 py-4">
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
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Notification Bell */}
                <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                      <span className="sr-only">Notifications</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="flex items-center justify-between p-3 border-b">
                      <h3 className="font-semibold">Notifications</h3>
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={handleMarkAllAsRead}
                        >
                          <CheckCheck className="h-3 w-3 mr-1" />
                          Mark all read
                        </Button>
                      )}
                    </div>
                    <ScrollArea className="h-[300px]">
                      {loadingNotifications ? (
                        <div className="flex items-center justify-center h-20">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                          <Bell className="h-8 w-8 mb-2 opacity-50" />
                          <span className="text-sm">No notifications</span>
                        </div>
                      ) : (
                        <div className="divide-y dark:divide-gray-700">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                              }`}
                            >
                              <div className="flex gap-3">
                                <span className="text-lg flex-shrink-0">
                                  {getNotificationIcon(notification.type)}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                      {notification.title}
                                    </p>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {!notification.isRead && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => handleMarkAsRead(notification.id)}
                                          title="Mark as read"
                                        >
                                          <Check className="h-3 w-3" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-gray-400 hover:text-red-500"
                                        onClick={() => handleDeleteNotification(notification.id)}
                                        title="Delete"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    {formatTimeAgo(notification.createdAt)}
                                  </p>
                                  {notification.link && (
                                    <a
                                      href={`/${tenantSlug}${notification.link}`}
                                      className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                      onClick={() => {
                                        if (!notification.isRead) {
                                          handleMarkAsRead(notification.id);
                                        }
                                        setNotificationOpen(false);
                                      }}
                                    >
                                      View details
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                    {user?.role?.name}
                  </span>
                </div>
                {/* User Avatar */}
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  {getAvatarUrl() ? (
                    <img
                      src={getAvatarUrl()!}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
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
