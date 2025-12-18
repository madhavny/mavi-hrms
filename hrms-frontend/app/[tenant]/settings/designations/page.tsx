'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { tenantApi, Designation, CreateDesignationInput, UpdateDesignationInput } from '@/lib/api';
import { Plus, Edit2, Trash2, Award, Users, ArrowUpDown, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

// Level badge colors based on level
function getLevelBadgeColor(level: number): string {
  if (level <= 2) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
  if (level <= 4) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  if (level <= 6) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
  if (level <= 8) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
  return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
}

// Level description based on level
function getLevelDescription(level: number): string {
  if (level <= 2) return 'Executive';
  if (level <= 4) return 'Senior';
  if (level <= 6) return 'Mid-Level';
  if (level <= 8) return 'Junior';
  return 'Entry';
}

export default function DesignationsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [sortBy, setSortBy] = useState<'level' | 'name' | 'employees'>('level');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);
  const [deletingDesignation, setDeletingDesignation] = useState<Designation | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateDesignationInput>({
    name: '',
    code: '',
    level: 1,
  });

  useEffect(() => {
    loadDesignations();
  }, []);

  const loadDesignations = async () => {
    try {
      const response = await tenantApi.getDesignationsWithDetails({ includeInactive: true });
      setDesignations(response.data || []);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to load designations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sortedDesignations = [...designations].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'level':
        comparison = a.level - b.level;
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'employees':
        comparison = a.employeeCount - b.employeeCount;
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const toggleSort = (field: 'level' | 'name' | 'employees') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openCreateModal = () => {
    setEditingDesignation(null);
    setFormData({
      name: '',
      code: '',
      level: 1,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (designation: Designation) => {
    setEditingDesignation(designation);
    setFormData({
      name: designation.name,
      code: designation.code,
      level: designation.level,
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (designation: Designation) => {
    setDeletingDesignation(designation);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingDesignation) {
        // Update
        const updateData: UpdateDesignationInput = {};
        if (formData.name !== editingDesignation.name) updateData.name = formData.name;
        if (formData.code !== editingDesignation.code) updateData.code = formData.code;
        if (formData.level !== editingDesignation.level) updateData.level = formData.level;

        await tenantApi.updateDesignation(editingDesignation.id, updateData);
        toast({
          title: 'Designation Updated',
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        // Create
        await tenantApi.createDesignation(formData);
        toast({
          title: 'Designation Created',
          description: `${formData.name} has been created successfully.`,
        });
      }

      setIsModalOpen(false);
      loadDesignations();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to save designation',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDesignation) return;

    setSaving(true);
    try {
      await tenantApi.deleteDesignation(deletingDesignation.id);
      toast({
        title: 'Designation Deleted',
        description: `${deletingDesignation.name} has been deleted successfully.`,
      });
      setIsDeleteDialogOpen(false);
      setDeletingDesignation(null);
      loadDesignations();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete designation',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const totalEmployees = designations.reduce((sum, d) => sum + d.employeeCount, 0);
  const activeDesignations = designations.filter(d => d.isActive).length;

  if (loading) {
    return (
      <DashboardLayout title="Designations">
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Designations">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Designation Management</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage job titles and grade levels for your organization.
            </p>
          </div>
          <Button onClick={openCreateModal} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Designation
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Award className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Designations</p>
                  <p className="text-2xl font-bold dark:text-white">{designations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Employees</p>
                  <p className="text-2xl font-bold dark:text-white">{totalEmployees}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Designations</p>
                  <p className="text-2xl font-bold dark:text-white">{activeDesignations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Designations List */}
        <Card>
          <CardHeader>
            <CardTitle>Designations</CardTitle>
            <CardDescription>
              List of all designations sorted by grade level. Lower level = Higher rank.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {designations.length === 0 ? (
              <div className="text-center py-12">
                <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No designations found</p>
                <Button onClick={openCreateModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Designation
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-medium dark:text-gray-200">
                          <button
                            onClick={() => toggleSort('name')}
                            className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            Name
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </button>
                        </th>
                        <th className="text-left py-3 px-4 font-medium dark:text-gray-200">Code</th>
                        <th className="text-center py-3 px-4 font-medium dark:text-gray-200">
                          <button
                            onClick={() => toggleSort('level')}
                            className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 mx-auto"
                          >
                            Level
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </button>
                        </th>
                        <th className="text-center py-3 px-4 font-medium dark:text-gray-200">Grade</th>
                        <th className="text-center py-3 px-4 font-medium dark:text-gray-200">
                          <button
                            onClick={() => toggleSort('employees')}
                            className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 mx-auto"
                          >
                            Employees
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </button>
                        </th>
                        <th className="text-center py-3 px-4 font-medium dark:text-gray-200">Status</th>
                        <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDesignations.map((designation) => (
                        <tr key={designation.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 group">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <span className="font-medium dark:text-white">{designation.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded font-mono">
                              {designation.code}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={cn(
                              "text-xs px-2.5 py-1 rounded-full border font-medium",
                              getLevelBadgeColor(designation.level)
                            )}>
                              L{designation.level}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-sm text-gray-500 dark:text-gray-400">
                            {getLevelDescription(designation.level)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="flex items-center justify-center gap-1 dark:text-gray-300">
                              <Users className="h-3.5 w-3.5 text-gray-400" />
                              {designation.employeeCount}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {designation.isActive ? (
                              <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">
                                Active
                              </span>
                            ) : (
                              <span className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(designation)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteDialog(designation)}
                                className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {sortedDesignations.map((designation) => (
                    <div key={designation.id} className="p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium dark:text-white">{designation.name}</span>
                        </div>
                        {designation.isActive ? (
                          <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">
                            Active
                          </span>
                        ) : (
                          <span className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded font-mono">
                          {designation.code}
                        </span>
                        <span className={cn(
                          "text-xs px-2.5 py-1 rounded-full border font-medium",
                          getLevelBadgeColor(designation.level)
                        )}>
                          L{designation.level} - {getLevelDescription(designation.level)}
                        </span>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                          {designation.employeeCount} employees
                        </span>
                      </div>
                      <div className="flex gap-2 pt-2 border-t dark:border-gray-700">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => openEditModal(designation)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                          onClick={() => openDeleteDialog(designation)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Level Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm dark:text-white">Grade Level Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", getLevelBadgeColor(1))}>
                  L1-L2
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Executive (CEO, CTO, VP)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", getLevelBadgeColor(3))}>
                  L3-L4
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Senior (Director, Manager)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", getLevelBadgeColor(5))}>
                  L5-L6
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Mid-Level (Lead, Senior)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", getLevelBadgeColor(7))}>
                  L7-L8
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Junior</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", getLevelBadgeColor(9))}>
                  L9+
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Entry Level / Intern</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDesignation ? 'Edit Designation' : 'Create Designation'}
            </DialogTitle>
            <DialogDescription>
              {editingDesignation
                ? 'Update the designation details below.'
                : 'Fill in the details to create a new designation.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Designation Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Software Engineer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Designation Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., SWE"
                maxLength={20}
                required
              />
              <p className="text-xs text-gray-500">
                Unique identifier for the designation (auto-uppercased)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">Grade Level *</Label>
              <Input
                id="level"
                type="number"
                min={1}
                max={100}
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
                required
              />
              <p className="text-xs text-gray-500">
                Lower number = Higher rank (1 = CEO level, 10 = Entry level)
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Spinner size="sm" className="mr-2" />}
                {editingDesignation ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Designation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingDesignation?.name}</strong>?
              {deletingDesignation && deletingDesignation.employeeCount > 0 && (
                <span className="block mt-2 text-yellow-600">
                  This designation has {deletingDesignation.employeeCount} employee(s).
                  It will be deactivated instead of deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving && <Spinner size="sm" className="mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
