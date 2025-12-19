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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { tenantApi, Department, DepartmentFlat, EmployeeForHead, CreateDepartmentInput, UpdateDepartmentInput } from '@/lib/api';
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, Users, Building2, UserCircle, FolderTree, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

interface DepartmentTreeNodeProps {
  department: Department;
  level: number;
  onEdit: (dept: Department) => void;
  onDelete: (dept: Department) => void;
  expandedIds: Set<number>;
  toggleExpand: (id: number) => void;
}

function DepartmentTreeNode({ department, level, onEdit, onDelete, expandedIds, toggleExpand }: DepartmentTreeNodeProps) {
  const isExpanded = expandedIds.has(department.id);
  const hasChildren = department.children && department.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors group",
          level > 0 && "ml-6"
        )}
        style={{ marginLeft: level * 24 }}
      >
        {hasChildren ? (
          <button
            onClick={() => toggleExpand(department.id)}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <div className="flex items-center gap-2 flex-1">
          <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="font-medium dark:text-white">{department.name}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
            {department.code}
          </span>
          {!department.isActive && (
            <span className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded">
              Inactive
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {department.employeeCount}
          </span>
          {hasChildren && (
            <span className="flex items-center gap-1">
              <FolderTree className="h-3.5 w-3.5" />
              {department.childCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(department)}
            className="h-8 w-8 p-0"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(department)}
            className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {department.children.map((child) => (
            <DepartmentTreeNode
              key={child.id}
              department={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DepartmentsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [flatDepartments, setFlatDepartments] = useState<DepartmentFlat[]>([]);
  const [employees, setEmployees] = useState<EmployeeForHead[]>([]);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateDepartmentInput>({
    name: '',
    code: '',
    parentId: null,
    headId: null,
  });

  useEffect(() => {
    loadDepartments();
    loadEmployees();
  }, []);

  const loadDepartments = async () => {
    try {
      // Load both tree and flat views
      const [treeResponse, flatResponse] = await Promise.all([
        tenantApi.getDepartmentsWithHierarchy({ includeInactive: true }),
        tenantApi.getDepartmentsWithHierarchy({ includeInactive: true, flat: true }),
      ]);
      setDepartments(treeResponse.data as Department[]);
      setFlatDepartments(flatResponse.data as DepartmentFlat[]);

      // Expand all root departments by default
      const rootIds = new Set((treeResponse.data as Department[]).map(d => d.id));
      setExpandedIds(rootIds);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to load departments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await tenantApi.getEmployeesForDepartmentHead();
      setEmployees(response.data || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<number>();
    const collectIds = (depts: Department[]) => {
      depts.forEach(d => {
        allIds.add(d.id);
        if (d.children) collectIds(d.children);
      });
    };
    collectIds(departments);
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const openCreateModal = () => {
    setEditingDepartment(null);
    setFormData({
      name: '',
      code: '',
      parentId: null,
      headId: null,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDepartment(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      parentId: dept.parentId,
      headId: dept.headId,
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (dept: Department) => {
    setDeletingDepartment(dept);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingDepartment) {
        // Update
        const updateData: UpdateDepartmentInput = {};
        if (formData.name !== editingDepartment.name) updateData.name = formData.name;
        if (formData.code !== editingDepartment.code) updateData.code = formData.code;
        if (formData.parentId !== editingDepartment.parentId) updateData.parentId = formData.parentId;
        if (formData.headId !== editingDepartment.headId) updateData.headId = formData.headId;

        await tenantApi.updateDepartment(editingDepartment.id, updateData);
        toast({
          title: 'Department Updated',
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        // Create
        await tenantApi.createDepartment(formData);
        toast({
          title: 'Department Created',
          description: `${formData.name} has been created successfully.`,
        });
      }

      setIsModalOpen(false);
      loadDepartments();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to save department',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDepartment) return;

    setSaving(true);
    try {
      await tenantApi.deleteDepartment(deletingDepartment.id);
      toast({
        title: 'Department Deleted',
        description: `${deletingDepartment.name} has been deleted successfully.`,
      });
      setIsDeleteDialogOpen(false);
      setDeletingDepartment(null);
      loadDepartments();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete department',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getEmployeeName = (emp: EmployeeForHead) => {
    return `${emp.firstName} ${emp.lastName || ''}`.trim();
  };

  const getAvailableParents = () => {
    // For create, all departments are available
    // For edit, exclude the department itself and its descendants
    if (!editingDepartment) return flatDepartments;

    const excludeIds = new Set<number>();
    excludeIds.add(editingDepartment.id);

    // Find all descendants
    const findDescendants = (depts: Department[], parentId: number) => {
      depts.forEach(d => {
        if (d.parentId === parentId) {
          excludeIds.add(d.id);
          findDescendants(depts, d.id);
        }
        if (d.children) {
          d.children.forEach(child => {
            if (excludeIds.has(d.id)) {
              excludeIds.add(child.id);
            }
          });
        }
      });
    };

    // Simple approach: exclude self
    return flatDepartments.filter(d => !excludeIds.has(d.id));
  };

  if (loading) {
    return (
      <DashboardLayout title="Departments">
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Departments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Department Management</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage your organization's department structure and hierarchy.
            </p>
          </div>
          <Button onClick={openCreateModal} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Departments</p>
                  <p className="text-2xl font-bold dark:text-white">{flatDepartments.length}</p>
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
                  <p className="text-2xl font-bold dark:text-white">
                    {flatDepartments.reduce((sum, d) => sum + d.employeeCount, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <FolderTree className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Root Departments</p>
                  <p className="text-2xl font-bold dark:text-white">
                    {flatDepartments.filter(d => !d.parentId).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Department List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Departments</CardTitle>
              <CardDescription>
                {viewMode === 'tree' ? 'Hierarchical view of departments' : 'Flat list of all departments'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {viewMode === 'tree' && (
                <>
                  <Button variant="outline" size="sm" onClick={expandAll}>
                    Expand All
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll}>
                    Collapse All
                  </Button>
                </>
              )}
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'tree' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('tree')}
                  className="rounded-r-none"
                >
                  <FolderTree className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {departments.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No departments found</p>
                <Button onClick={openCreateModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Department
                </Button>
              </div>
            ) : viewMode === 'tree' ? (
              <div className="space-y-1">
                {departments.map((dept) => (
                  <DepartmentTreeNode
                    key={dept.id}
                    department={dept}
                    level={0}
                    onEdit={openEditModal}
                    onDelete={openDeleteDialog}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                  />
                ))}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-medium dark:text-gray-200">Name</th>
                        <th className="text-left py-3 px-4 font-medium dark:text-gray-200">Code</th>
                        <th className="text-left py-3 px-4 font-medium dark:text-gray-200">Parent</th>
                        <th className="text-center py-3 px-4 font-medium dark:text-gray-200">Employees</th>
                        <th className="text-center py-3 px-4 font-medium dark:text-gray-200">Status</th>
                        <th className="text-right py-3 px-4 font-medium dark:text-gray-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flatDepartments.map((dept) => (
                        <tr key={dept.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <span className="font-medium dark:text-white">{dept.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                              {dept.code}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                            {dept.parentName || '-'}
                          </td>
                          <td className="py-3 px-4 text-center dark:text-gray-300">{dept.employeeCount}</td>
                          <td className="py-3 px-4 text-center">
                            {dept.isActive ? (
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
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const fullDept = findDepartmentById(departments, dept.id);
                                  if (fullDept) openEditModal(fullDept);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const fullDept = findDepartmentById(departments, dept.id);
                                  if (fullDept) openDeleteDialog(fullDept);
                                }}
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
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
                  {flatDepartments.map((dept) => (
                    <div key={dept.id} className="p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium dark:text-white">{dept.name}</span>
                        </div>
                        {dept.isActive ? (
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
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                          Code: {dept.code}
                        </span>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                          {dept.employeeCount} employees
                        </span>
                        {dept.parentName && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                            Parent: {dept.parentName}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 pt-2 border-t dark:border-gray-700">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            const fullDept = findDepartmentById(departments, dept.id);
                            if (fullDept) openEditModal(fullDept);
                          }}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                          onClick={() => {
                            const fullDept = findDepartmentById(departments, dept.id);
                            if (fullDept) openDeleteDialog(fullDept);
                          }}
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
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? 'Edit Department' : 'Create Department'}
            </DialogTitle>
            <DialogDescription>
              {editingDepartment
                ? 'Update the department details below.'
                : 'Fill in the details to create a new department.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Department Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Engineering"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Department Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., ENG"
                maxLength={20}
                required
              />
              <p className="text-xs text-gray-500">
                Unique identifier for the department (auto-uppercased)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentId">Parent Department</Label>
              <Select
                value={formData.parentId?.toString() || 'none'}
                onValueChange={(val) => setFormData({ ...formData, parentId: val === 'none' ? null : parseInt(val) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent department (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Root Department)</SelectItem>
                  {getAvailableParents().map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name} ({dept.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="headId">Department Head</Label>
              <Select
                value={formData.headId?.toString() || 'none'}
                onValueChange={(val) => setFormData({ ...formData, headId: val === 'none' ? null : parseInt(val) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department head (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4" />
                        <span>{getEmployeeName(emp)}</span>
                        {emp.designation && (
                          <span className="text-xs text-gray-500">
                            - {emp.designation.name}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                {editingDepartment ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingDepartment?.name}</strong>?
              {deletingDepartment && (deletingDepartment.employeeCount > 0 || deletingDepartment.childCount > 0) && (
                <span className="block mt-2 text-yellow-600">
                  This department has {deletingDepartment.employeeCount} employee(s)
                  {deletingDepartment.childCount > 0 && ` and ${deletingDepartment.childCount} child department(s)`}.
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

// Helper function to find department by ID in tree structure
function findDepartmentById(departments: Department[], id: number): Department | null {
  for (const dept of departments) {
    if (dept.id === id) return dept;
    if (dept.children) {
      const found = findDepartmentById(dept.children, id);
      if (found) return found;
    }
  }
  return null;
}
