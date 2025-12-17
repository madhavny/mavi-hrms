'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { superAdminApi, Tenant, CreateTenantInput } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Building2,
  Users,
  CheckCircle,
  Copy,
  AlertTriangle,
  Trash2,
  Power,
  PowerOff,
  Ban,
  ExternalLink,
  Eye,
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [stats, setStats] = useState({ totalTenants: 0, activeTenants: 0, totalUsers: 0 });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    variant: 'default' | 'destructive';
  }>({ open: false, title: '', description: '', action: async () => {}, variant: 'default' });

  // Success modal for showing credentials after tenant creation
  const [credentialsModal, setCredentialsModal] = useState<{
    open: boolean;
    credentials: {
      email: string;
      password: string;
      loginUrl: string;
      tenantName: string;
    } | null;
  }>({ open: false, credentials: null });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/super-admin/login');
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const [dashRes, tenantsRes] = await Promise.all([
        superAdminApi.getDashboard(),
        superAdminApi.getTenants(),
      ]);
      if (dashRes.data) setStats(dashRes.data);
      if (tenantsRes.data) setTenants(tenantsRes.data.tenants);
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load dashboard data',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('superAdmin');
    router.push('/super-admin/login');
  };

  const handleViewDetails = async (tenant: Tenant) => {
    setActionLoading(`view-${tenant.id}`);
    try {
      const res = await superAdminApi.getTenant(tenant.id);
      if (res.data) {
        setSelectedTenant(res.data as Tenant);
        setShowDetails(true);
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load tenant details',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    setConfirmDialog({
      open: true,
      title: `${status === 'ACTIVE' ? 'Activate' : status === 'INACTIVE' ? 'Deactivate' : 'Suspend'} Tenant`,
      description: `Are you sure you want to change the tenant status to ${status}?`,
      variant: status === 'ACTIVE' ? 'default' : 'destructive',
      action: async () => {
        setActionLoading(`status-${id}`);
        try {
          await superAdminApi.changeTenantStatus(id, status);
          loadData();
          setShowDetails(false);
          toast({
            variant: 'success',
            title: 'Success',
            description: `Tenant ${status.toLowerCase()} successfully`,
          });
        } catch (err) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to change tenant status',
          });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleDelete = async (id: number, permanent = false) => {
    setConfirmDialog({
      open: true,
      title: permanent ? 'Permanently Delete Tenant' : 'Soft Delete Tenant',
      description: permanent
        ? 'This action cannot be undone. All tenant data will be permanently removed.'
        : 'This will mark the tenant as inactive. You can reactivate it later.',
      variant: 'destructive',
      action: async () => {
        setActionLoading(`delete-${id}`);
        try {
          if (permanent) {
            await superAdminApi.permanentlyDeleteTenant(id);
          } else {
            await superAdminApi.deleteTenant(id);
          }
          loadData();
          setShowDetails(false);
          toast({
            variant: 'success',
            title: 'Success',
            description: permanent ? 'Tenant permanently deleted' : 'Tenant deactivated',
          });
        } catch (err) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to delete tenant',
          });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-24" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Mavi HRMS - Super Admin</h1>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Total Tenants" value={stats.totalTenants} icon={Building2} />
          <StatCard title="Active Tenants" value={stats.activeTenants} icon={CheckCircle} iconColor="text-green-600" />
          <StatCard title="Total Users" value={stats.totalUsers} icon={Users} iconColor="text-blue-600" />
        </div>

        {/* Tenants Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Tenants</h2>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button>Add Tenant</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New Tenant</DialogTitle>
                  <DialogDescription>
                    Fill in the company details and admin credentials to create a new tenant.
                  </DialogDescription>
                </DialogHeader>
                <CreateTenantForm
                  onSuccess={(credentials) => {
                    setShowCreate(false);
                    loadData();
                    setCredentialsModal({ open: true, credentials });
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Slug</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Users</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="px-4 py-3 font-medium">{tenant.name}</td>
                    <td className="px-4 py-3 text-gray-600">{tenant.slug}</td>
                    <td className="px-4 py-3 text-gray-600">{tenant.email}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tenant.status} />
                    </td>
                    <td className="px-4 py-3">{tenant._count?.users || 0}</td>
                    <td className="px-4 py-3 space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(tenant)}
                        disabled={actionLoading === `view-${tenant.id}`}
                      >
                        {actionLoading === `view-${tenant.id}` ? <Spinner size="sm" /> : <Eye className="h-4 w-4 mr-1" />}
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/${tenant.slug}/login`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Portal
                      </Button>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 mb-4">No tenants yet</p>
                      <Button onClick={() => setShowCreate(true)}>Create Your First Tenant</Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-sm text-gray-600">{tenant.email}</p>
                  </div>
                  <StatusBadge status={tenant.status} />
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>/{tenant.slug}</span>
                  <span>{tenant._count?.users || 0} users</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewDetails(tenant)}
                    disabled={actionLoading === `view-${tenant.id}`}
                  >
                    {actionLoading === `view-${tenant.id}` ? <Spinner size="sm" /> : 'View'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(`/${tenant.slug}/login`, '_blank')}
                  >
                    Portal
                  </Button>
                </div>
              </div>
            ))}
            {tenants.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">No tenants yet</p>
                <Button onClick={() => setShowCreate(true)}>Create Your First Tenant</Button>
              </div>
            )}
          </div>
        </div>

        {/* Tenant Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tenant Details</DialogTitle>
              <DialogDescription>
                View and manage tenant information and status.
              </DialogDescription>
            </DialogHeader>
            {selectedTenant && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Company Name</p>
                    <p className="font-medium">{selectedTenant.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Slug</p>
                    <p className="font-medium">{selectedTenant.slug}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{selectedTenant.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <StatusBadge status={selectedTenant.status} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="font-medium">{selectedTenant._count?.users || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-medium">{formatDate(selectedTenant.createdAt)}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Admin Users</p>
                  {selectedTenant.adminUsers && selectedTenant.adminUsers.length > 0 ? (
                    <div className="bg-gray-50 p-3 rounded space-y-2">
                      {selectedTenant.adminUsers.map((admin) => (
                        <div key={admin.id} className="border-b pb-2 last:border-0">
                          <p className="text-sm">
                            <span className="text-gray-600">Name:</span> {admin.firstName} {admin.lastName}
                          </p>
                          <p className="text-sm">
                            <span className="text-gray-600">Email:</span> {admin.email}
                          </p>
                          <p className="text-sm text-amber-700 bg-amber-50 px-2 py-1 rounded mt-1">
                            Password was provided at tenant creation and cannot be retrieved.
                          </p>
                          <p className="text-sm mt-1">
                            <span className="text-gray-600">Login URL:</span>{' '}
                            <a
                              href={`/${selectedTenant.slug}/login`}
                              target="_blank"
                              className="text-blue-600 hover:underline"
                            >
                              /{selectedTenant.slug}/login
                            </a>
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No admin users found</p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Actions</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(selectedTenant.id, 'ACTIVE')}
                      disabled={selectedTenant.status === 'ACTIVE' || actionLoading !== null}
                    >
                      {actionLoading === `status-${selectedTenant.id}` ? <Spinner size="sm" className="mr-1" /> : <Power className="h-4 w-4 mr-1" />}
                      Activate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(selectedTenant.id, 'INACTIVE')}
                      disabled={selectedTenant.status === 'INACTIVE' || actionLoading !== null}
                    >
                      {actionLoading === `status-${selectedTenant.id}` ? <Spinner size="sm" className="mr-1" /> : <PowerOff className="h-4 w-4 mr-1" />}
                      Deactivate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(selectedTenant.id, 'SUSPENDED')}
                      disabled={selectedTenant.status === 'SUSPENDED' || actionLoading !== null}
                    >
                      {actionLoading === `status-${selectedTenant.id}` ? <Spinner size="sm" className="mr-1" /> : <Ban className="h-4 w-4 mr-1" />}
                      Suspend
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(selectedTenant.id, false)}
                      disabled={actionLoading !== null}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Soft Delete
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(selectedTenant.id, true)}
                      disabled={actionLoading !== null}
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Permanent Delete
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowDetails(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  confirmDialog.action();
                  setConfirmDialog({ ...confirmDialog, open: false });
                }}
                className={confirmDialog.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Credentials Success Modal */}
        <Dialog open={credentialsModal.open} onOpenChange={(open) => setCredentialsModal({ ...credentialsModal, open })}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Tenant Created Successfully
              </DialogTitle>
              <DialogDescription>
                Save these credentials now. The password cannot be retrieved later.
              </DialogDescription>
            </DialogHeader>
            {credentialsModal.credentials && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-800 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Important</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    This is the only time you will see this password. Please save it securely.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-600">Tenant</Label>
                    <p className="font-medium">{credentialsModal.credentials.tenantName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Admin Email</Label>
                    <div className="flex items-center gap-2">
                      <p className="font-medium flex-1">{credentialsModal.credentials.email}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(credentialsModal.credentials!.email, 'Email')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-600">Password</Label>
                    <div className="flex items-center gap-2">
                      <p className="font-mono bg-yellow-100 px-3 py-2 rounded flex-1">
                        {credentialsModal.credentials.password}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(credentialsModal.credentials!.password, 'Password')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-600">Login URL</Label>
                    <div className="flex items-center gap-2">
                      <a
                        href={credentialsModal.credentials.loginUrl}
                        target="_blank"
                        className="text-blue-600 hover:underline flex-1"
                      >
                        {credentialsModal.credentials.loginUrl}
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(credentialsModal.credentials!.loginUrl, 'Login URL')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => setCredentialsModal({ open: false, credentials: null })}
                >
                  I've Saved The Credentials
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-gray-600'
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  iconColor?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <Icon className={`h-10 w-10 ${iconColor} opacity-80`} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    SUSPENDED: 'bg-red-100 text-red-800',
    TRIAL: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${colors[status] || colors.INACTIVE}`}>
      {status}
    </span>
  );
}

function CreateTenantForm({ onSuccess }: { onSuccess: (credentials: { email: string; password: string; loginUrl: string; tenantName: string }) => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<CreateTenantInput>({
    name: '',
    slug: '',
    email: '',
    adminEmail: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: '',
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Company name
    if (!form.name.trim()) {
      newErrors.name = 'Company name is required';
    }

    // Slug
    if (!form.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(form.slug)) {
      newErrors.slug = 'Slug must be lowercase letters, numbers, and hyphens only';
    }

    // Company email
    if (!form.email.trim()) {
      newErrors.email = 'Company email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Admin first name
    if (!form.adminFirstName.trim()) {
      newErrors.adminFirstName = 'First name is required';
    }

    // Admin email
    if (!form.adminEmail.trim()) {
      newErrors.adminEmail = 'Admin email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) {
      newErrors.adminEmail = 'Invalid email format';
    }

    // Password validation
    if (!form.adminPassword) {
      newErrors.adminPassword = 'Password is required';
    } else if (form.adminPassword.length < 8) {
      newErrors.adminPassword = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(form.adminPassword)) {
      newErrors.adminPassword = 'Password must contain at least one uppercase letter';
    } else if (!/[0-9]/.test(form.adminPassword)) {
      newErrors.adminPassword = 'Password must contain at least one number';
    } else if (!/[!@#$%^&*]/.test(form.adminPassword)) {
      newErrors.adminPassword = 'Password must contain at least one special character (!@#$%^&*)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }

    // Auto-generate slug from name
    if (name === 'name') {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setForm((prev) => ({ ...prev, slug }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await superAdminApi.createTenant(form);
      if (result.success && result.data) {
        onSuccess({
          email: result.data.credentials.email,
          password: result.data.credentials.password,
          loginUrl: result.data.credentials.loginUrl,
          tenantName: form.name,
        });
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create tenant',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Company Name</Label>
          <Input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            autoComplete="organization"
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input
            id="slug"
            name="slug"
            value={form.slug}
            onChange={handleChange}
            autoComplete="off"
            aria-invalid={!!errors.slug}
          />
          <p className="text-xs text-gray-500">Used in login URL: /{form.slug || 'your-slug'}/login</p>
          {errors.slug && <p className="text-sm text-red-600">{errors.slug}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Company Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          aria-invalid={!!errors.email}
        />
        {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
      </div>

      <hr className="my-4" />
      <p className="text-sm font-medium text-gray-700">Admin User</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="adminFirstName">First Name</Label>
          <Input
            id="adminFirstName"
            name="adminFirstName"
            value={form.adminFirstName}
            onChange={handleChange}
            autoComplete="given-name"
            aria-invalid={!!errors.adminFirstName}
          />
          {errors.adminFirstName && <p className="text-sm text-red-600">{errors.adminFirstName}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminLastName">Last Name</Label>
          <Input
            id="adminLastName"
            name="adminLastName"
            value={form.adminLastName || ''}
            onChange={handleChange}
            autoComplete="family-name"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminEmail">Admin Email</Label>
        <Input
          id="adminEmail"
          name="adminEmail"
          type="email"
          value={form.adminEmail}
          onChange={handleChange}
          autoComplete="email"
          aria-invalid={!!errors.adminEmail}
        />
        {errors.adminEmail && <p className="text-sm text-red-600">{errors.adminEmail}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminPassword">Admin Password</Label>
        <Input
          id="adminPassword"
          name="adminPassword"
          type="password"
          value={form.adminPassword}
          onChange={handleChange}
          autoComplete="new-password"
          aria-invalid={!!errors.adminPassword}
        />
        <p className="text-xs text-gray-500">
          Min 8 characters, 1 uppercase, 1 number, 1 special character (!@#$%^&*)
        </p>
        {errors.adminPassword && <p className="text-sm text-red-600">{errors.adminPassword}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Spinner size="sm" className="mr-2" /> Creating...</> : 'Create Tenant'}
      </Button>
    </form>
  );
}
