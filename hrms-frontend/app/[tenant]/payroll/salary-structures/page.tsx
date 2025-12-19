'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  Loader2,
  IndianRupee,
  Users,
  TrendingUp,
  Eye,
  Search,
  Calculator,
} from 'lucide-react';
import {
  payrollApi,
  tenantApi,
  SalaryStructure,
  SalaryComponent,
  CalculationType,
} from '@/lib/api';

interface Employee {
  id: number;
  firstName: string;
  lastName?: string;
  email: string;
  employeeCode?: string;
  department?: { name: string };
  designation?: { name: string };
}

interface ComponentInput {
  salaryComponentId: number;
  calculationType: CalculationType;
  amount?: number;
  percentage?: number;
  calculatedAmount: number;
  component?: SalaryComponent;
}

export default function SalaryStructuresPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryComponents, setSalaryComponents] = useState<SalaryComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    userId: '',
    ctc: '',
    basicSalary: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    remarks: '',
  });
  const [selectedComponents, setSelectedComponents] = useState<ComponentInput[]>([]);
  const [previewData, setPreviewData] = useState<{
    grossEarnings: number;
    totalDeductions: number;
    netSalary: number;
    annualCTC: number;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [structuresRes, employeesRes, componentsRes] = await Promise.all([
        payrollApi.getSalaryStructures(),
        tenantApi.getUsers({ limit: 1000 }),
        payrollApi.getSalaryComponents({ isActive: true }),
      ]);

      if (structuresRes.success && structuresRes.data) {
        setStructures(structuresRes.data.data || []);
      }
      if (employeesRes.success && employeesRes.data) {
        setEmployees(employeesRes.data.users || []);
      }
      if (componentsRes.success && componentsRes.data) {
        setSalaryComponents(componentsRes.data.components || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setSelectedStructure(null);
    setFormData({
      userId: '',
      ctc: '',
      basicSalary: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      remarks: '',
    });
    // Initialize with default components
    const defaultComponents = salaryComponents
      .filter((c) => c.isActive)
      .map((c) => ({
        salaryComponentId: c.id,
        calculationType: c.calculationType,
        amount: c.calculationType === 'FIXED' ? c.defaultValue || 0 : undefined,
        percentage: c.calculationType === 'PERCENTAGE' ? c.defaultValue || 0 : undefined,
        calculatedAmount: 0,
        component: c,
      }));
    setSelectedComponents(defaultComponents);
    setPreviewData(null);
    setIsModalOpen(true);
  };

  const openEditModal = async (structure: SalaryStructure) => {
    try {
      const response = await payrollApi.getSalaryStructure(structure.id);
      if (response.success && response.data) {
        const data = response.data;
        setSelectedStructure(data);
        setFormData({
          userId: data.userId.toString(),
          ctc: data.ctc.toString(),
          basicSalary: data.basicSalary.toString(),
          effectiveFrom: data.effectiveFrom.split('T')[0],
          remarks: data.remarks || '',
        });

        // Map existing components
        const existingComponents = data.components.map((c) => ({
          salaryComponentId: c.salaryComponentId,
          calculationType: c.calculationType,
          amount: c.amount || undefined,
          percentage: c.percentage || undefined,
          calculatedAmount: c.calculatedAmount,
          component: c.salaryComponent,
        }));

        // Add missing components
        const existingIds = new Set(existingComponents.map((c) => c.salaryComponentId));
        const missingComponents = salaryComponents
          .filter((c) => c.isActive && !existingIds.has(c.id))
          .map((c) => ({
            salaryComponentId: c.id,
            calculationType: c.calculationType,
            amount: c.calculationType === 'FIXED' ? 0 : undefined,
            percentage: c.calculationType === 'PERCENTAGE' ? 0 : undefined,
            calculatedAmount: 0,
            component: c,
          }));

        setSelectedComponents([...existingComponents, ...missingComponents]);
        setPreviewData({
          grossEarnings: data.grossSalary,
          totalDeductions: data.grossSalary - data.netSalary,
          netSalary: data.netSalary,
          annualCTC: data.ctc,
        });
        setIsModalOpen(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch structure details');
    }
  };

  const openViewModal = async (structure: SalaryStructure) => {
    try {
      const response = await payrollApi.getSalaryStructure(structure.id);
      if (response.success && response.data) {
        setSelectedStructure(response.data);
        setIsViewModalOpen(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch structure details');
    }
  };

  const openDeleteModal = (structure: SalaryStructure) => {
    setSelectedStructure(structure);
    setIsDeleteModalOpen(true);
  };

  const calculatePreview = async () => {
    if (!formData.basicSalary) return;

    try {
      const components = selectedComponents
        .filter((c) => (c.amount && c.amount > 0) || (c.percentage && c.percentage > 0))
        .map((c) => ({
          salaryComponentId: c.salaryComponentId,
          calculationType: c.calculationType,
          amount: c.amount,
          percentage: c.percentage,
        }));

      const response = await payrollApi.calculateSalaryPreview({
        basicSalary: parseFloat(formData.basicSalary),
        components,
      });

      if (response.success && response.data) {
        setPreviewData({
          grossEarnings: response.data.grossEarnings,
          totalDeductions: response.data.totalDeductions,
          netSalary: response.data.netSalary,
          annualCTC: response.data.annualCTC,
        });

        // Update calculated amounts
        const updatedComponents = selectedComponents.map((c) => {
          const calculated = response.data?.components.find(
            (rc) => rc.salaryComponentId === c.salaryComponentId
          );
          return {
            ...c,
            calculatedAmount: calculated?.calculatedAmount || 0,
          };
        });
        setSelectedComponents(updatedComponents);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate preview');
    }
  };

  const handleComponentChange = (
    componentId: number,
    field: 'amount' | 'percentage' | 'calculationType',
    value: string | CalculationType
  ) => {
    setSelectedComponents((prev) =>
      prev.map((c) => {
        if (c.salaryComponentId === componentId) {
          if (field === 'calculationType') {
            return {
              ...c,
              calculationType: value as CalculationType,
              amount: value === 'FIXED' ? c.component?.defaultValue || 0 : undefined,
              percentage: value === 'PERCENTAGE' ? c.component?.defaultValue || 0 : undefined,
            };
          }
          return {
            ...c,
            [field]: value ? parseFloat(value as string) : undefined,
          };
        }
        return c;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const components = selectedComponents
        .filter((c) => (c.amount && c.amount > 0) || (c.percentage && c.percentage > 0))
        .map((c) => ({
          salaryComponentId: c.salaryComponentId,
          calculationType: c.calculationType,
          amount: c.amount,
          percentage: c.percentage,
        }));

      const data = {
        userId: parseInt(formData.userId),
        ctc: parseFloat(formData.ctc),
        basicSalary: parseFloat(formData.basicSalary),
        effectiveFrom: formData.effectiveFrom,
        remarks: formData.remarks || undefined,
        components,
      };

      if (selectedStructure) {
        await payrollApi.updateSalaryStructure(selectedStructure.id, data);
      } else {
        await payrollApi.createSalaryStructure(data);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save salary structure');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStructure) return;

    setIsSubmitting(true);
    try {
      await payrollApi.deleteSalaryStructure(selectedStructure.id);
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete salary structure');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredStructures = structures.filter((s) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      s.user?.firstName?.toLowerCase().includes(search) ||
      s.user?.lastName?.toLowerCase().includes(search) ||
      s.user?.employeeCode?.toLowerCase().includes(search) ||
      s.user?.email?.toLowerCase().includes(search)
    );
  });

  // Get employees without active salary structure
  const employeesWithoutStructure = employees.filter(
    (e) => !structures.some((s) => s.userId === e.id && s.isActive)
  );

  const groupedComponents = {
    earnings: selectedComponents.filter((c) => c.component?.type === 'EARNING'),
    deductions: selectedComponents.filter((c) => c.component?.type === 'DEDUCTION'),
    reimbursements: selectedComponents.filter((c) => c.component?.type === 'REIMBURSEMENT'),
  };

  return (
    <DashboardLayout title="Salary Structures">
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Salary Structures</h1>
            <p className="text-gray-500 dark:text-gray-400">Assign and manage employee salary structures</p>
          </div>
          <Button onClick={openCreateModal} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Assign Salary
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Assigned</p>
                <p className="text-xl font-semibold dark:text-white">{structures.filter((s) => s.isActive).length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Users className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Assignment</p>
                <p className="text-xl font-semibold dark:text-white">{employeesWithoutStructure.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Monthly Payroll</p>
                <p className="text-xl font-semibold dark:text-white">
                  {formatCurrency(
                    structures
                      .filter((s) => s.isActive)
                      .reduce((sum, s) => sum + s.grossSalary, 0)
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <IndianRupee className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Annual CTC</p>
                <p className="text-xl font-semibold dark:text-white">
                  {formatCurrency(
                    structures.filter((s) => s.isActive).reduce((sum, s) => sum + s.ctc, 0)
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, employee code, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">{error}</div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredStructures.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <Users className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No salary structures found</p>
              <p className="text-sm">Assign salary structures to employees to get started</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Annual CTC</TableHead>
                      <TableHead className="text-right">Monthly Gross</TableHead>
                      <TableHead className="text-right">Monthly Net</TableHead>
                      <TableHead>Effective From</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStructures.map((structure) => (
                      <TableRow key={structure.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium dark:text-white">
                              {structure.user?.firstName} {structure.user?.lastName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{structure.user?.employeeCode}</p>
                          </div>
                        </TableCell>
                        <TableCell className="dark:text-white">{structure.user?.department?.name || '-'}</TableCell>
                        <TableCell className="text-right font-medium dark:text-white">
                          {formatCurrency(structure.ctc)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400">
                          {formatCurrency(structure.grossSalary)}
                        </TableCell>
                        <TableCell className="text-right font-bold dark:text-white">
                          {formatCurrency(structure.netSalary)}
                        </TableCell>
                        <TableCell className="dark:text-white">
                          {new Date(structure.effectiveFrom).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={structure.isActive ? 'default' : 'secondary'}
                            className={structure.isActive ? 'dark:bg-green-900/30 dark:text-green-300' : 'dark:bg-gray-900/30 dark:text-gray-300'}
                          >
                            {structure.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openViewModal(structure)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(structure)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(structure)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden p-4 space-y-4">
                {filteredStructures.map((structure) => (
                  <Card key={structure.id} className="dark:border-gray-700">
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium dark:text-white">
                            {structure.user?.firstName} {structure.user?.lastName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{structure.user?.employeeCode}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{structure.user?.department?.name || '-'}</p>
                        </div>
                        <Badge
                          variant={structure.isActive ? 'default' : 'secondary'}
                          className={structure.isActive ? 'dark:bg-green-900/30 dark:text-green-300' : 'dark:bg-gray-900/30 dark:text-gray-300'}
                        >
                          {structure.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Annual CTC</p>
                          <p className="font-medium dark:text-white">{formatCurrency(structure.ctc)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Monthly Gross</p>
                          <p className="font-medium text-green-600 dark:text-green-400">{formatCurrency(structure.grossSalary)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Monthly Net</p>
                          <p className="font-bold dark:text-white">{formatCurrency(structure.netSalary)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Effective From</p>
                          <p className="dark:text-white">{new Date(structure.effectiveFrom).toLocaleDateString('en-IN')}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => openViewModal(structure)} className="flex-1">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditModal(structure)} className="flex-1">
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteModal(structure)}
                          className="flex-1 text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 dark:border-gray-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Create/Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {selectedStructure ? 'Edit' : 'Assign'} Salary Structure
              </DialogTitle>
              <DialogDescription>
                {selectedStructure
                  ? 'Update salary structure details'
                  : 'Assign a new salary structure to an employee'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="userId">Employee</Label>
                    <Select
                      value={formData.userId}
                      onValueChange={(value) => setFormData({ ...formData, userId: value })}
                      disabled={!!selectedStructure}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {(selectedStructure ? employees : employeesWithoutStructure).map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.firstName} {emp.lastName} ({emp.employeeCode || emp.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="effectiveFrom">Effective From</Label>
                    <Input
                      id="effectiveFrom"
                      type="date"
                      value={formData.effectiveFrom}
                      onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ctc">Annual CTC (₹)</Label>
                    <Input
                      id="ctc"
                      type="number"
                      value={formData.ctc}
                      onChange={(e) => setFormData({ ...formData, ctc: e.target.value })}
                      placeholder="1200000"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="basicSalary">Monthly Basic Salary (₹)</Label>
                    <Input
                      id="basicSalary"
                      type="number"
                      value={formData.basicSalary}
                      onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                      placeholder="50000"
                      required
                    />
                  </div>
                </div>

                {/* Components Section */}
                <div className="border dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium dark:text-white">Salary Components</h4>
                    <Button type="button" variant="outline" size="sm" onClick={calculatePreview}>
                      <Calculator className="h-4 w-4 mr-2" />
                      Calculate Preview
                    </Button>
                  </div>

                  {/* Earnings */}
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Earnings</h5>
                    <div className="space-y-2">
                      {groupedComponents.earnings.map((comp) => (
                        <div
                          key={comp.salaryComponentId}
                          className="grid grid-cols-4 gap-2 items-center"
                        >
                          <span className="text-sm dark:text-gray-300">{comp.component?.name}</span>
                          <Select
                            value={comp.calculationType}
                            onValueChange={(value) =>
                              handleComponentChange(
                                comp.salaryComponentId,
                                'calculationType',
                                value as CalculationType
                              )
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FIXED">Fixed</SelectItem>
                              <SelectItem value="PERCENTAGE">% of Basic</SelectItem>
                            </SelectContent>
                          </Select>
                          {comp.calculationType === 'FIXED' ? (
                            <Input
                              type="number"
                              value={comp.amount || ''}
                              onChange={(e) =>
                                handleComponentChange(comp.salaryComponentId, 'amount', e.target.value)
                              }
                              placeholder="Amount"
                              className="h-8"
                            />
                          ) : (
                            <Input
                              type="number"
                              value={comp.percentage || ''}
                              onChange={(e) =>
                                handleComponentChange(comp.salaryComponentId, 'percentage', e.target.value)
                              }
                              placeholder="%"
                              className="h-8"
                            />
                          )}
                          <span className="text-sm text-right text-green-600">
                            {comp.calculatedAmount > 0 ? formatCurrency(comp.calculatedAmount) : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Deductions</h5>
                    <div className="space-y-2">
                      {groupedComponents.deductions.map((comp) => (
                        <div
                          key={comp.salaryComponentId}
                          className="grid grid-cols-4 gap-2 items-center"
                        >
                          <span className="text-sm dark:text-gray-300">
                            {comp.component?.name}
                            {comp.component?.isStatutory && (
                              <Badge variant="outline" className="ml-1 text-xs dark:border-gray-600">
                                Statutory
                              </Badge>
                            )}
                          </span>
                          <Select
                            value={comp.calculationType}
                            onValueChange={(value) =>
                              handleComponentChange(
                                comp.salaryComponentId,
                                'calculationType',
                                value as CalculationType
                              )
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FIXED">Fixed</SelectItem>
                              <SelectItem value="PERCENTAGE">% of Basic</SelectItem>
                            </SelectContent>
                          </Select>
                          {comp.calculationType === 'FIXED' ? (
                            <Input
                              type="number"
                              value={comp.amount || ''}
                              onChange={(e) =>
                                handleComponentChange(comp.salaryComponentId, 'amount', e.target.value)
                              }
                              placeholder="Amount"
                              className="h-8"
                            />
                          ) : (
                            <Input
                              type="number"
                              value={comp.percentage || ''}
                              onChange={(e) =>
                                handleComponentChange(comp.salaryComponentId, 'percentage', e.target.value)
                              }
                              placeholder="%"
                              className="h-8"
                            />
                          )}
                          <span className="text-sm text-right text-red-600">
                            {comp.calculatedAmount > 0 ? formatCurrency(comp.calculatedAmount) : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reimbursements */}
                  {groupedComponents.reimbursements.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Reimbursements</h5>
                      <div className="space-y-2">
                        {groupedComponents.reimbursements.map((comp) => (
                          <div
                            key={comp.salaryComponentId}
                            className="grid grid-cols-4 gap-2 items-center"
                          >
                            <span className="text-sm dark:text-gray-300">{comp.component?.name}</span>
                            <Select
                              value={comp.calculationType}
                              onValueChange={(value) =>
                                handleComponentChange(
                                  comp.salaryComponentId,
                                  'calculationType',
                                  value as CalculationType
                                )
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="FIXED">Fixed</SelectItem>
                                <SelectItem value="PERCENTAGE">% of Basic</SelectItem>
                              </SelectContent>
                            </Select>
                            {comp.calculationType === 'FIXED' ? (
                              <Input
                                type="number"
                                value={comp.amount || ''}
                                onChange={(e) =>
                                  handleComponentChange(comp.salaryComponentId, 'amount', e.target.value)
                                }
                                placeholder="Amount"
                                className="h-8"
                              />
                            ) : (
                              <Input
                                type="number"
                                value={comp.percentage || ''}
                                onChange={(e) =>
                                  handleComponentChange(comp.salaryComponentId, 'percentage', e.target.value)
                                }
                                placeholder="%"
                                className="h-8"
                              />
                            )}
                            <span className="text-sm text-right text-blue-600">
                              {comp.calculatedAmount > 0 ? formatCurrency(comp.calculatedAmount) : '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview */}
                {previewData && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                    <h4 className="font-medium mb-3 dark:text-white">Salary Preview (Monthly)</h4>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Basic</p>
                        <p className="font-medium dark:text-white">{formatCurrency(parseFloat(formData.basicSalary) || 0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Gross Earnings</p>
                        <p className="font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(previewData.grossEarnings)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Total Deductions</p>
                        <p className="font-medium text-red-600 dark:text-red-400">
                          {formatCurrency(previewData.totalDeductions)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Net Salary</p>
                        <p className="font-bold text-lg dark:text-white">{formatCurrency(previewData.netSalary)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="remarks">Remarks</Label>
                  <Input
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Optional notes..."
                  />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {selectedStructure ? 'Update' : 'Assign'} Salary
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            {selectedStructure && (
              <>
                <DialogHeader>
                  <DialogTitle>Salary Structure Details</DialogTitle>
                  <DialogDescription>
                    {selectedStructure.user?.firstName} {selectedStructure.user?.lastName} (
                    {selectedStructure.user?.employeeCode})
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Annual CTC</p>
                      <p className="text-xl font-bold dark:text-white">{formatCurrency(selectedStructure.ctc)}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Net</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(selectedStructure.netSalary)}
                      </p>
                    </div>
                  </div>

                  {/* Components */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3 text-green-600 dark:text-green-400">Earnings</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm dark:text-gray-300">
                          <span>Basic Salary</span>
                          <span>{formatCurrency(selectedStructure.basicSalary)}</span>
                        </div>
                        {selectedStructure.components
                          .filter((c) => c.salaryComponent.type === 'EARNING')
                          .map((comp) => (
                            <div key={comp.id} className="flex justify-between text-sm dark:text-gray-300">
                              <span>{comp.salaryComponent.name}</span>
                              <span>{formatCurrency(comp.calculatedAmount)}</span>
                            </div>
                          ))}
                        <div className="border-t dark:border-gray-700 pt-2 flex justify-between font-medium">
                          <span className="dark:text-white">Gross Salary</span>
                          <span className="text-green-600 dark:text-green-400">
                            {formatCurrency(selectedStructure.grossSalary)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3 text-red-600 dark:text-red-400">Deductions</h4>
                      <div className="space-y-2">
                        {selectedStructure.components
                          .filter((c) => c.salaryComponent.type === 'DEDUCTION')
                          .map((comp) => (
                            <div key={comp.id} className="flex justify-between text-sm dark:text-gray-300">
                              <span>{comp.salaryComponent.name}</span>
                              <span>{formatCurrency(comp.calculatedAmount)}</span>
                            </div>
                          ))}
                        <div className="border-t dark:border-gray-700 pt-2 flex justify-between font-medium">
                          <span className="dark:text-white">Total Deductions</span>
                          <span className="text-red-600 dark:text-red-400">
                            {formatCurrency(
                              selectedStructure.grossSalary - selectedStructure.netSalary
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Effective Date */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Effective From</p>
                    <p className="font-medium dark:text-white">
                      {new Date(selectedStructure.effectiveFrom).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    {selectedStructure.remarks && (
                      <>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Remarks</p>
                        <p className="text-sm dark:text-gray-300">{selectedStructure.remarks}</p>
                      </>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setIsViewModalOpen(false);
                    openEditModal(selectedStructure);
                  }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Salary Structure</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the salary structure for{' '}
                <strong>
                  {selectedStructure?.user?.firstName} {selectedStructure?.user?.lastName}
                </strong>
                ? This action cannot be undone.
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
