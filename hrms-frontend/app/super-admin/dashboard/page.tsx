'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { superAdminApi, Tenant, CreateTenantInput } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ totalTenants: 0, activeTenants: 0, totalUsers: 0 });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showDetails, setShowDetails] = useState(false);

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
    try {
      const res = await superAdminApi.getTenant(tenant.id);
      if (res.data) {
        setSelectedTenant(res.data as Tenant);
        setShowDetails(true);
      }
    } catch (err) {
      alert('Failed to load tenant details');
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    if (!confirm(`Are you sure you want to change status to ${status}?`)) return;
    try {
      await superAdminApi.changeTenantStatus(id, status);
      loadData();
      setShowDetails(false);
      alert('Status changed successfully');
    } catch (err) {
      alert('Failed to change status');
    }
  };

  const handleDelete = async (id: number, permanent = false) => {
    const msg = permanent
      ? 'PERMANENTLY DELETE this tenant? This cannot be undone!'
      : 'Deactivate this tenant?';
    if (!confirm(msg)) return;

    try {
      if (permanent) {
        await superAdminApi.permanentlyDeleteTenant(id);
      } else {
        await superAdminApi.deleteTenant(id);
      }
      loadData();
      setShowDetails(false);
      alert(permanent ? 'Tenant deleted permanently' : 'Tenant deactivated');
    } catch (err) {
      alert('Failed to delete tenant');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
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
          <StatCard title="Total Tenants" value={stats.totalTenants} />
          <StatCard title="Active Tenants" value={stats.activeTenants} />
          <StatCard title="Total Users" value={stats.totalUsers} />
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
                </DialogHeader>
                <CreateTenantForm
                  onSuccess={() => {
                    setShowCreate(false);
                    loadData();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Tenants Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Slug</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Users</th>
                  <th className="px-4 py-3 text-left">Actions</th>
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
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/${tenant.slug}/login`, '_blank')}
                      >
                        Login Portal
                      </Button>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No tenants yet. Create your first tenant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tenant Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tenant Details</DialogTitle>
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
                    <p className="font-medium">{new Date(selectedTenant.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Admin Credentials</p>
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
                          <p className="text-sm">
                            <span className="text-gray-600">Password:</span>{' '}
                            <span className="font-mono bg-yellow-100 px-2 py-1 rounded">
                              {admin.plainPassword || 'Not stored'}
                            </span>
                          </p>
                          <p className="text-sm">
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
                    <p className="text-sm text-gray-500">No admin credentials available</p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Actions</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={selectedTenant.status === 'ACTIVE' ? 'outline' : 'default'}
                      onClick={() => handleStatusChange(selectedTenant.id, 'ACTIVE')}
                      disabled={selectedTenant.status === 'ACTIVE'}
                    >
                      Activate
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedTenant.status === 'INACTIVE' ? 'outline' : 'default'}
                      onClick={() => handleStatusChange(selectedTenant.id, 'INACTIVE')}
                      disabled={selectedTenant.status === 'INACTIVE'}
                    >
                      Deactivate
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedTenant.status === 'SUSPENDED' ? 'outline' : 'default'}
                      onClick={() => handleStatusChange(selectedTenant.id, 'SUSPENDED')}
                      disabled={selectedTenant.status === 'SUSPENDED'}
                    >
                      Suspend
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(selectedTenant.id, false)}
                    >
                      Soft Delete
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(selectedTenant.id, true)}
                    >
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
      </main>
    </div>
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    SUSPENDED: 'bg-red-100 text-red-800',
    TRIAL: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || colors.INACTIVE}`}>
      {status}
    </span>
  );
}

function CreateTenantForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<CreateTenantInput>({
    name: '',
    slug: '',
    email: '',
    adminEmail: '',
    adminPassword: '',
    adminFirstName: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Auto-generate slug from name
    if (name === 'name') {
      setForm((prev) => ({
        ...prev,
        slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await superAdminApi.createTenant(form);
      if (result.success && result.data) {
        alert(
          `Tenant Created Successfully!\n\n` +
          `Admin Login URL: /${form.slug}/login\n` +
          `Admin Email: ${form.adminEmail}\n` +
          `Admin Password: ${form.adminPassword}\n\n` +
          `Please save these credentials!`
        );
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Company Name</Label>
          <Input id="name" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input id="slug" name="slug" value={form.slug} onChange={handleChange} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Company Email</Label>
        <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
      </div>

      <hr className="my-4" />
      <p className="text-sm font-medium text-gray-700">Admin User</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="adminFirstName">First Name</Label>
          <Input id="adminFirstName" name="adminFirstName" value={form.adminFirstName} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminLastName">Last Name</Label>
          <Input id="adminLastName" name="adminLastName" value={form.adminLastName || ''} onChange={handleChange} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminEmail">Admin Email</Label>
        <Input id="adminEmail" name="adminEmail" type="email" value={form.adminEmail} onChange={handleChange} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminPassword">Admin Password</Label>
        <Input id="adminPassword" name="adminPassword" type="password" value={form.adminPassword} onChange={handleChange} required minLength={8} />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating...' : 'Create Tenant'}
      </Button>
    </form>
  );
}
