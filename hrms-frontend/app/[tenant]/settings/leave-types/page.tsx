'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { leaveApi, LeaveType, CreateLeaveTypeInput } from '@/lib/api';
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  DollarSign,
  RefreshCw,
  FileText,
  CalendarDays,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function LeaveTypesPage() {
  const { toast } = useToast();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateLeaveTypeInput & { isActive?: boolean }>({
    name: '',
    code: '',
    isPaid: true,
    maxDaysPerYear: undefined,
    carryForward: false,
    requiresDocument: false,
  });

  const fetchLeaveTypes = async () => {
    try {
      setLoading(true);
      const response = await leaveApi.getLeaveTypes();
      // The backend only returns active leave types, so we show all from response
      setLeaveTypes(response.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch leave types',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const filteredLeaveTypes = showInactive
    ? leaveTypes
    : leaveTypes.filter((lt) => lt.isActive);

  // Stats
  const totalLeaveTypes = leaveTypes.length;
  const activeLeaveTypes = leaveTypes.filter((lt) => lt.isActive).length;
  const paidLeaveTypes = leaveTypes.filter((lt) => lt.isPaid && lt.isActive).length;
  const carryForwardTypes = leaveTypes.filter((lt) => lt.carryForward && lt.isActive).length;

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      isPaid: true,
      maxDaysPerYear: undefined,
      carryForward: false,
      requiresDocument: false,
    });
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and Code are required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await leaveApi.createLeaveType({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        isPaid: formData.isPaid,
        maxDaysPerYear: formData.maxDaysPerYear || undefined,
        carryForward: formData.carryForward,
        requiresDocument: formData.requiresDocument,
      });

      toast({
        title: 'Leave Type Created',
        description: `${formData.name} has been created successfully.`,
      });

      setIsCreateModalOpen(false);
      resetForm();
      fetchLeaveTypes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create leave type',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedLeaveType || !formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await leaveApi.updateLeaveType(selectedLeaveType.id, {
        name: formData.name.trim(),
        isPaid: formData.isPaid,
        maxDaysPerYear: formData.maxDaysPerYear || undefined,
        carryForward: formData.carryForward,
        requiresDocument: formData.requiresDocument,
        isActive: formData.isActive,
      });

      toast({
        title: 'Leave Type Updated',
        description: `${formData.name} has been updated successfully.`,
      });

      setIsEditModalOpen(false);
      setSelectedLeaveType(null);
      resetForm();
      fetchLeaveTypes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update leave type',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLeaveType) return;

    setSaving(true);
    try {
      await leaveApi.deleteLeaveType(selectedLeaveType.id);

      toast({
        title: 'Leave Type Deactivated',
        description: `${selectedLeaveType.name} has been deactivated.`,
      });

      setIsDeleteDialogOpen(false);
      setSelectedLeaveType(null);
      fetchLeaveTypes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to deactivate leave type',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (leaveType: LeaveType) => {
    setSelectedLeaveType(leaveType);
    setFormData({
      name: leaveType.name,
      code: leaveType.code,
      isPaid: leaveType.isPaid,
      maxDaysPerYear: leaveType.maxDaysPerYear || undefined,
      carryForward: leaveType.carryForward,
      requiresDocument: leaveType.requiresDocument,
      isActive: leaveType.isActive,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (leaveType: LeaveType) => {
    setSelectedLeaveType(leaveType);
    setIsDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <DashboardLayout title="Leave Types">
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Leave Types">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Leave Type Management</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage leave types for your organization.
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Leave Type
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Leave Types</p>
                  <p className="text-2xl font-bold dark:text-white">{totalLeaveTypes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Types</p>
                  <p className="text-2xl font-bold dark:text-white">{activeLeaveTypes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Paid Leave Types</p>
                  <p className="text-2xl font-bold dark:text-white">{paidLeaveTypes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <RefreshCw className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Carry Forward</p>
                  <p className="text-2xl font-bold dark:text-white">{carryForwardTypes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leave Types Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Leave Types</CardTitle>
                <CardDescription>
                  Configure leave types, days allowed, and policies.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Show Inactive</span>
                <Checkbox
                  checked={showInactive}
                  onCheckedChange={(checked) => setShowInactive(checked as boolean)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredLeaveTypes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No leave types found.</p>
                <p className="text-sm">Create your first leave type to get started.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Max Days/Year</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Carry Forward</TableHead>
                      <TableHead>Document Required</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeaveTypes.map((leaveType) => (
                      <TableRow key={leaveType.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{leaveType.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded text-sm">
                            {leaveType.code}
                          </code>
                        </TableCell>
                        <TableCell>
                          {leaveType.maxDaysPerYear ? (
                            <span className="font-medium">{leaveType.maxDaysPerYear} days</span>
                          ) : (
                            <span className="text-gray-400">Unlimited</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {leaveType.isPaid ? (
                            <Badge variant="default" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40">
                              <DollarSign className="h-3 w-3 mr-1" />
                              Paid
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Unpaid</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {leaveType.carryForward ? (
                            <Badge variant="default" className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {leaveType.requiresDocument ? (
                            <Badge variant="default" className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40">
                              <FileText className="h-3 w-3 mr-1" />
                              Required
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Not Required</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={leaveType.isActive ? 'default' : 'secondary'}
                            className={
                              leaveType.isActive
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40'
                                : ''
                            }
                          >
                            {leaveType.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(leaveType)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {leaveType.isActive && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(leaveType)}
                                title="Deactivate"
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {filteredLeaveTypes.map((leaveType) => (
                    <div key={leaveType.id} className="p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium dark:text-white">{leaveType.name}</span>
                        </div>
                        <Badge
                          variant={leaveType.isActive ? 'default' : 'secondary'}
                          className={
                            leaveType.isActive
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : ''
                          }
                        >
                          {leaveType.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded font-mono">
                          {leaveType.code}
                        </span>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                          {leaveType.maxDaysPerYear ? `${leaveType.maxDaysPerYear} days/year` : 'Unlimited'}
                        </span>
                        {leaveType.isPaid && (
                          <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded">
                            Paid
                          </span>
                        )}
                        {leaveType.carryForward && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                            Carry Forward
                          </span>
                        )}
                        {leaveType.requiresDocument && (
                          <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded">
                            Doc Required
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 pt-2 border-t dark:border-gray-700">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => openEditModal(leaveType)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {leaveType.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                            onClick={() => openDeleteDialog(leaveType)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Leave Type</DialogTitle>
            <DialogDescription>
              Add a new leave type for your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Leave Type Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Casual Leave"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                placeholder="e.g., CL"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
              <p className="text-xs text-gray-500">
                Unique identifier (auto-uppercased)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxDays">Max Days Per Year</Label>
              <Input
                id="maxDays"
                type="number"
                min={0}
                placeholder="e.g., 12 (leave empty for unlimited)"
                value={formData.maxDaysPerYear || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxDaysPerYear: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Paid Leave</Label>
                <p className="text-xs text-gray-500">Is this a paid leave type?</p>
              </div>
              <Switch
                checked={formData.isPaid}
                onCheckedChange={(checked) => setFormData({ ...formData, isPaid: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Carry Forward</Label>
                <p className="text-xs text-gray-500">Can unused days carry to next year?</p>
              </div>
              <Switch
                checked={formData.carryForward}
                onCheckedChange={(checked) => setFormData({ ...formData, carryForward: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Document Required</Label>
                <p className="text-xs text-gray-500">Require supporting document?</p>
              </div>
              <Switch
                checked={formData.requiresDocument}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requiresDocument: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Spinner size="sm" className="mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Leave Type</DialogTitle>
            <DialogDescription>Update the leave type details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Leave Type Name *</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Casual Leave"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Code</Label>
              <Input
                id="edit-code"
                value={formData.code}
                disabled
                className="bg-gray-50 dark:bg-gray-700"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">Code cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-maxDays">Max Days Per Year</Label>
              <Input
                id="edit-maxDays"
                type="number"
                min={0}
                placeholder="e.g., 12 (leave empty for unlimited)"
                value={formData.maxDaysPerYear || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxDaysPerYear: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Paid Leave</Label>
                <p className="text-xs text-gray-500">Is this a paid leave type?</p>
              </div>
              <Switch
                checked={formData.isPaid}
                onCheckedChange={(checked) => setFormData({ ...formData, isPaid: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Carry Forward</Label>
                <p className="text-xs text-gray-500">Can unused days carry to next year?</p>
              </div>
              <Switch
                checked={formData.carryForward}
                onCheckedChange={(checked) => setFormData({ ...formData, carryForward: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Document Required</Label>
                <p className="text-xs text-gray-500">Require supporting document?</p>
              </div>
              <Switch
                checked={formData.requiresDocument}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requiresDocument: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active Status</Label>
                <p className="text-xs text-gray-500">Is this leave type active?</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Spinner size="sm" className="mr-2" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Leave Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{' '}
              <strong>{selectedLeaveType?.name}</strong>? This will hide it from
              new leave applications but existing records will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving && <Spinner size="sm" className="mr-2" />}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
