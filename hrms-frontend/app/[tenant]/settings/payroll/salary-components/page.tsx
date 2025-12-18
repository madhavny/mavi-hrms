'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Loader2,
  Sparkles,
  IndianRupee,
  Percent,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { payrollApi, SalaryComponent, SalaryComponentType, CalculationType } from '@/lib/api';

export default function SalaryComponentsPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [grouped, setGrouped] = useState<{
    earnings: SalaryComponent[];
    deductions: SalaryComponent[];
    reimbursements: SalaryComponent[];
  }>({ earnings: [], deductions: [], reimbursements: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<SalaryComponent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'EARNING' as SalaryComponentType,
    calculationType: 'FIXED' as CalculationType,
    defaultValue: '',
    isTaxable: true,
    isStatutory: false,
    isActive: true,
  });

  useEffect(() => {
    fetchComponents();
  }, []);

  const fetchComponents = async () => {
    try {
      setLoading(true);
      const response = await payrollApi.getSalaryComponents();
      if (response.success && response.data) {
        setComponents(response.data.components);
        setGrouped(response.data.grouped);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch salary components');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeDefaults = async () => {
    if (!confirm('This will create default salary components (Basic, HRA, PF, etc.). Continue?')) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await payrollApi.initializeDefaultComponents();
      if (response.success) {
        fetchComponents();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize defaults');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setSelectedComponent(null);
    setFormData({
      name: '',
      code: '',
      type: 'EARNING',
      calculationType: 'FIXED',
      defaultValue: '',
      isTaxable: true,
      isStatutory: false,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (component: SalaryComponent) => {
    setSelectedComponent(component);
    setFormData({
      name: component.name,
      code: component.code,
      type: component.type,
      calculationType: component.calculationType,
      defaultValue: component.defaultValue?.toString() || '',
      isTaxable: component.isTaxable,
      isStatutory: component.isStatutory,
      isActive: component.isActive,
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (component: SalaryComponent) => {
    setSelectedComponent(component);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const data = {
        ...formData,
        defaultValue: formData.defaultValue ? parseFloat(formData.defaultValue) : undefined,
      };

      if (selectedComponent) {
        await payrollApi.updateSalaryComponent(selectedComponent.id, data);
      } else {
        await payrollApi.createSalaryComponent(data);
      }

      setIsModalOpen(false);
      fetchComponents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save component');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedComponent) return;

    setIsSubmitting(true);
    try {
      await payrollApi.deleteSalaryComponent(selectedComponent.id);
      setIsDeleteModalOpen(false);
      fetchComponents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete component');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeColor = (type: SalaryComponentType) => {
    switch (type) {
      case 'EARNING':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'DEDUCTION':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'REIMBURSEMENT':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  const renderComponentTable = (items: SalaryComponent[], title: string) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">{title}</h3>
      {items.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No {title.toLowerCase()} configured</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Calculation</TableHead>
              <TableHead>Default Value</TableHead>
              <TableHead>Taxable</TableHead>
              <TableHead>Statutory</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((component) => (
              <TableRow key={component.id}>
                <TableCell className="font-medium dark:text-white">{component.name}</TableCell>
                <TableCell>
                  <code className="text-sm bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded">{component.code}</code>
                </TableCell>
                <TableCell className="dark:text-gray-300">
                  <span className="flex items-center gap-1">
                    {component.calculationType === 'FIXED' ? (
                      <IndianRupee className="h-3 w-3" />
                    ) : (
                      <Percent className="h-3 w-3" />
                    )}
                    {component.calculationType}
                  </span>
                </TableCell>
                <TableCell className="dark:text-gray-300">
                  {component.defaultValue
                    ? component.calculationType === 'PERCENTAGE'
                      ? `${component.defaultValue}%`
                      : `₹${component.defaultValue.toLocaleString()}`
                    : '-'}
                </TableCell>
                <TableCell>
                  {component.isTaxable ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                </TableCell>
                <TableCell>
                  {component.isStatutory ? (
                    <Badge variant="secondary" className="dark:bg-gray-700 dark:text-gray-300">Statutory</Badge>
                  ) : (
                    <span className="dark:text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={component.isActive ? 'default' : 'secondary'}
                    className={component.isActive ? 'dark:bg-green-900/30 dark:text-green-300' : 'dark:bg-gray-700 dark:text-gray-300'}
                  >
                    {component.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(component)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!component.isStatutory && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(component)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
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
      )}
    </div>
  );

  return (
    <DashboardLayout title="Salary Components">
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Link href={`/${tenantSlug}/settings`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Settings
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold dark:text-white">Salary Components</h1>
              <p className="text-gray-500 dark:text-gray-400">Configure earnings, deductions, and reimbursements</p>
            </div>
          </div>
          <div className="flex gap-2">
            {components.length === 0 && (
              <Button variant="outline" onClick={handleInitializeDefaults} disabled={isSubmitting}>
                <Sparkles className="h-4 w-4 mr-2" />
                Initialize Defaults
              </Button>
            )}
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              Add Component
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
            {renderComponentTable(grouped.earnings, 'Earnings')}
            {renderComponentTable(grouped.deductions, 'Deductions')}
            {renderComponentTable(grouped.reimbursements, 'Reimbursements')}
          </div>
        )}

        {/* Create/Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedComponent ? 'Edit' : 'Create'} Salary Component</DialogTitle>
              <DialogDescription>
                {selectedComponent ? 'Update the component details' : 'Add a new salary component'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Basic Salary"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="BASIC"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value as SalaryComponentType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EARNING">Earning</SelectItem>
                        <SelectItem value="DEDUCTION">Deduction</SelectItem>
                        <SelectItem value="REIMBURSEMENT">Reimbursement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="calculationType">Calculation Type</Label>
                    <Select
                      value={formData.calculationType}
                      onValueChange={(value) => setFormData({ ...formData, calculationType: value as CalculationType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIXED">Fixed Amount</SelectItem>
                        <SelectItem value="PERCENTAGE">Percentage of Basic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="defaultValue">
                    Default Value {formData.calculationType === 'PERCENTAGE' ? '(%)' : '(₹)'}
                  </Label>
                  <Input
                    id="defaultValue"
                    type="number"
                    step={formData.calculationType === 'PERCENTAGE' ? '0.01' : '1'}
                    value={formData.defaultValue}
                    onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                    placeholder={formData.calculationType === 'PERCENTAGE' ? '10' : '10000'}
                  />
                </div>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isTaxable}
                      onChange={(e) => setFormData({ ...formData, isTaxable: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Taxable</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isStatutory}
                      onChange={(e) => setFormData({ ...formData, isStatutory: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Statutory</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {selectedComponent ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Salary Component</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{selectedComponent?.name}&quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
